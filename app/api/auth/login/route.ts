import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { member_id } = await request.json();

    if (!member_id) {
      return NextResponse.json(
        { error: 'member_id é obrigatório' },
        { status: 400 }
      );
    }

    // Look up the member to get their workspace_id
    const result = await query<{ id: string; workspace_id: string; display_name: string }>(
      'SELECT id, workspace_id, display_name FROM members WHERE id = $1',
      [member_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Membro não encontrado' },
        { status: 404 }
      );
    }

    const member = result.rows[0];

    const response = NextResponse.json({
      success: true,
      member: {
        id: member.id,
        display_name: member.display_name,
        workspace_id: member.workspace_id,
      },
    });

    // Set HttpOnly cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    response.cookies.set('bahjira-member-id', member.id, cookieOptions);
    response.cookies.set('bahjira-workspace-id', member.workspace_id, cookieOptions);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao fazer login' },
      { status: 500 }
    );
  }
}
