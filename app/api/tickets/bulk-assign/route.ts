import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

// GET: return tickets without project_id (orphaned)
export async function GET() {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const result = await query(
      `SELECT t.id, t.title, w.prefix || '-' || LPAD(t.sequence_number::text, 3, '0') AS ticket_key,
              t.project_id, t.board_id, t.created_at
       FROM tickets t
       JOIN workspaces w ON w.id = t.workspace_id
       WHERE t.is_archived = false AND t.project_id IS NULL
       ORDER BY t.created_at DESC`
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/tickets/bulk-assign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST: assign selected tickets to a project/board
export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { ticket_ids, project_id, board_id } = await request.json();

    if (!Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json({ error: 'ticket_ids obrigatório' }, { status: 400 });
    }

    if (!project_id && !board_id) {
      return NextResponse.json({ error: 'project_id ou board_id obrigatório' }, { status: 400 });
    }

    // Resolve project_id from board_id if not provided
    let finalProjectId = project_id;
    let finalBoardId = board_id;
    if (board_id && !project_id) {
      const b = await query(`SELECT project_id FROM boards WHERE id = $1`, [board_id]);
      finalProjectId = b.rows[0]?.project_id;
    }
    // Find default board of project if board_id not provided
    if (project_id && !board_id) {
      const b = await query(
        `SELECT id FROM boards WHERE project_id = $1 ORDER BY is_default DESC, created_at ASC LIMIT 1`,
        [project_id]
      );
      finalBoardId = b.rows[0]?.id || null;
    }

    const result = await query(
      `UPDATE tickets
       SET project_id = $1, board_id = $2, updated_at = NOW()
       WHERE id = ANY($3::uuid[])
       RETURNING id`,
      [finalProjectId, finalBoardId, ticket_ids]
    );

    return NextResponse.json({ updated: result.rowCount });
  } catch (err) {
    console.error('POST /api/tickets/bulk-assign error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
