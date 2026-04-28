import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

/**
 * PATCH /api/members/time-tracking
 * Body: { member_id, can_track_time: boolean }
 * Admin-only. Liga/desliga acesso ao Time Tracking pra um member.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { member_id, can_track_time } = await request.json();
    if (!member_id || typeof can_track_time !== 'boolean') {
      return NextResponse.json({ error: 'member_id e can_track_time obrigatórios' }, { status: 400 });
    }

    const result = await query(
      `UPDATE members SET can_track_time = $1 WHERE id = $2 RETURNING id, can_track_time`,
      [can_track_time, member_id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/members/time-tracking error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
