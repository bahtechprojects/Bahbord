import { NextResponse } from 'next/server';
import { getAuthMember } from '@/lib/api-auth';

export async function GET() {
  try {
    const member = await getAuthMember();

    if (!member) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      member: {
        id: member.id,
        display_name: member.display_name,
        email: member.email,
        role: member.role,
        is_approved: member.is_approved,
        can_track_time: member.can_track_time === true,
      },
      workspace_id: member.workspace_id,
    });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
