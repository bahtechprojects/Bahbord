import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';
import { hasTicketAccess } from '@/lib/access-check';

/**
 * POST /api/tickets/bulk
 * Body:
 *   { ids: string[], action: 'archive' | 'move' | 'assign' | 'priority',
 *     status_id?: string, assignee_id?: string|null, priority?: string }
 * Aplica ação em massa. Valida acesso a cada ticket.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const { ids, action } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids vazio' }, { status: 400 });
    }
    if (!['archive', 'move', 'assign', 'priority'].includes(action)) {
      return NextResponse.json({ error: 'action inválida' }, { status: 400 });
    }

    // Filter ids by access
    const userIsAdmin = isAdmin(auth.role);
    const allowedIds: string[] = [];
    if (userIsAdmin) {
      allowedIds.push(...ids);
    } else {
      for (const id of ids) {
        if (await hasTicketAccess(auth, id)) allowedIds.push(id);
      }
    }
    if (allowedIds.length === 0) {
      return NextResponse.json({ error: 'Sem acesso a nenhum dos tickets' }, { status: 403 });
    }

    let updated = 0;
    if (action === 'archive') {
      const r = await query(`UPDATE tickets SET is_archived = true, updated_at = NOW() WHERE id = ANY($1::uuid[])`, [allowedIds]);
      updated = r.rowCount || 0;
    } else if (action === 'move') {
      const { status_id } = body;
      if (!status_id) return NextResponse.json({ error: 'status_id obrigatório' }, { status: 400 });
      const r = await query(
        `UPDATE tickets SET status_id = $1, updated_at = NOW(),
          completed_at = CASE WHEN (SELECT is_done FROM statuses WHERE id = $1) THEN NOW() ELSE NULL END
         WHERE id = ANY($2::uuid[])`,
        [status_id, allowedIds]
      );
      updated = r.rowCount || 0;
    } else if (action === 'assign') {
      const { assignee_id } = body;
      const r = await query(
        `UPDATE tickets SET assignee_id = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
        [assignee_id || null, allowedIds]
      );
      updated = r.rowCount || 0;
    } else if (action === 'priority') {
      const { priority } = body;
      if (!['urgent', 'high', 'medium', 'low'].includes(priority)) {
        return NextResponse.json({ error: 'priority inválida' }, { status: 400 });
      }
      const r = await query(
        `UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = ANY($2::uuid[])`,
        [priority, allowedIds]
      );
      updated = r.rowCount || 0;
    }

    return NextResponse.json({ updated, skipped: ids.length - allowedIds.length });
  } catch (err) {
    console.error('POST /api/tickets/bulk error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 });
  }
}
