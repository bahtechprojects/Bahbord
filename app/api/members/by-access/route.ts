import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await getAuthMember();

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('board_id');
    const projectId = searchParams.get('project_id');

    if (!boardId && !projectId) {
      return NextResponse.json({ error: 'board_id ou project_id obrigatório' }, { status: 400 });
    }

    let result;

    if (boardId) {
      // Members with access to this board (via board_roles, project_roles, or org admin)
      result = await query(
        `SELECT DISTINCT m.id, m.display_name, m.email, m.avatar_url
         FROM members m
         WHERE m.id IN (
           -- Board role members
           SELECT br.member_id FROM board_roles br WHERE br.board_id = $1
           UNION
           -- Project role members (board's project)
           SELECT pr.member_id FROM project_roles pr
           WHERE pr.project_id = (SELECT project_id FROM boards WHERE id = $1)
           UNION
           -- Org admins/owners
           SELECT orr.member_id FROM org_roles orr WHERE orr.role IN ('owner', 'admin')
         )
         ORDER BY m.display_name ASC`,
        [boardId]
      );
    } else {
      // Members with access to this project
      result = await query(
        `SELECT DISTINCT m.id, m.display_name, m.email, m.avatar_url
         FROM members m
         WHERE m.id IN (
           SELECT pr.member_id FROM project_roles pr WHERE pr.project_id = $1
           UNION
           SELECT br.member_id FROM board_roles br
           JOIN boards b ON b.id = br.board_id WHERE b.project_id = $1
           UNION
           SELECT orr.member_id FROM org_roles orr WHERE orr.role IN ('owner', 'admin')
         )
         ORDER BY m.display_name ASC`,
        [projectId]
      );
    }

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/members/by-access error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
