import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';
import { renderTitleTemplate } from '@/lib/recurring';

/**
 * POST /api/recurring-tickets/run-now
 * Body: { id: string }
 * Admin-only. Executa um recurring específico AGORA, criando o ticket.
 * NÃO altera last_run_at/next_run_at (é só pra teste/manual).
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const r = await query<{
      id: string;
      workspace_id: string;
      project_id: string | null;
      board_id: string | null;
      title_template: string;
      description_html: string | null;
      ticket_type_id: string | null;
      service_id: string | null;
      assignee_id: string | null;
      priority: string | null;
    }>(
      `SELECT id, workspace_id, project_id, board_id, title_template,
              description_html, ticket_type_id, service_id, assignee_id, priority
       FROM recurring_tickets
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (r.rowCount === 0) {
      return NextResponse.json({ error: 'Recurring não encontrado ou inativo' }, { status: 404 });
    }

    const row = r.rows[0];
    const now = new Date();
    const title = renderTitleTemplate(row.title_template, now);

    // Status default (primeira coluna)
    const statusRes = await query<{ id: string }>(
      `SELECT id FROM statuses WHERE workspace_id = $1 ORDER BY position ASC NULLS LAST LIMIT 1`,
      [row.workspace_id]
    );
    const statusId = statusRes.rows[0]?.id || null;

    const inserted = await query<{ id: string }>(
      `INSERT INTO tickets (
         workspace_id, ticket_type_id, status_id, service_id,
         assignee_id, reporter_id, title, description, priority,
         project_id, board_id, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
       ) RETURNING id`,
      [
        row.workspace_id,
        row.ticket_type_id,
        statusId,
        row.service_id,
        row.assignee_id,
        row.assignee_id || auth.id,
        title,
        row.description_html || '',
        row.priority || 'medium',
        row.project_id,
        row.board_id,
      ]
    );

    return NextResponse.json({ ok: true, ticket_id: inserted.rows[0].id, title });
  } catch (err) {
    console.error('POST /api/recurring-tickets/run-now error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
