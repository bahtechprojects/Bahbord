import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

// POST: auto-sync tickets without project_id based on reporter/assignee access
export async function POST() {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Find tickets without project_id and infer from reporter/assignee's project access
    const result = await query(`
      WITH orphan_tickets AS (
        SELECT t.id AS ticket_id, t.reporter_id, t.assignee_id
        FROM tickets t
        WHERE t.is_archived = false AND t.project_id IS NULL
      ),
      inferred AS (
        SELECT DISTINCT ON (ot.ticket_id)
          ot.ticket_id,
          COALESCE(pr_rep.project_id, br_rep.project_id, pr_asg.project_id, br_asg.project_id) AS project_id
        FROM orphan_tickets ot
        LEFT JOIN project_roles pr_rep ON pr_rep.member_id = ot.reporter_id AND pr_rep.role IN ('admin', 'member')
        LEFT JOIN boards br_rep_t ON br_rep_t.id = (SELECT board_id FROM board_roles WHERE member_id = ot.reporter_id LIMIT 1)
        LEFT JOIN LATERAL (SELECT project_id FROM boards WHERE id = br_rep_t.id) br_rep ON true
        LEFT JOIN project_roles pr_asg ON pr_asg.member_id = ot.assignee_id AND pr_asg.role IN ('admin', 'member')
        LEFT JOIN boards br_asg_t ON br_asg_t.id = (SELECT board_id FROM board_roles WHERE member_id = ot.assignee_id LIMIT 1)
        LEFT JOIN LATERAL (SELECT project_id FROM boards WHERE id = br_asg_t.id) br_asg ON true
      )
      UPDATE tickets t
      SET project_id = inferred.project_id,
          board_id = (
            SELECT id FROM boards
            WHERE project_id = inferred.project_id
            ORDER BY is_default DESC, created_at ASC
            LIMIT 1
          ),
          updated_at = NOW()
      FROM inferred
      WHERE t.id = inferred.ticket_id AND inferred.project_id IS NOT NULL
      RETURNING t.id
    `);

    return NextResponse.json({ synced: result.rowCount });
  } catch (err) {
    console.error('POST /api/tickets/sync-project error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
