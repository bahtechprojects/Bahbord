import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const memberId = cookieStore.get('bahjira-member-id')?.value;
    const workspaceId = cookieStore.get('bahjira-workspace-id')?.value;

    if (!memberId) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const result = await query(
      `SELECT m.id, m.display_name, m.email, m.role,
        COALESCE(orr.role, m.role) AS org_role
      FROM members m
      LEFT JOIN org_roles orr ON orr.member_id = m.id AND orr.workspace_id = $2
      WHERE m.id = $1`,
      [memberId, workspaceId || '']
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      member: result.rows[0],
      workspace_id: workspaceId,
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
