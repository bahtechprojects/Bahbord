import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

/**
 * GET /api/audit-log — admin-only.
 *
 * Lista eventos da tabela `audit_log` (Postgres) com JOIN em members pra
 * trazer o nome do actor. Endpoint separado de /api/audit-trail (esse último
 * é o histórico de tickets/projects no MongoDB).
 *
 * Query params:
 *   ?entity_type=member|project|automation|share_link|workspace|...
 *   ?entity_id=<uuid>
 *   ?action=member.role_changed
 *   ?limit=50 (default 50, max 200)
 *   ?page=1
 */
export async function GET(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (!isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');
    const action = searchParams.get('action');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const offset = (page - 1) * limit;

    const wheres: string[] = ['al.workspace_id = $1'];
    const params: unknown[] = [auth.workspace_id];

    if (entityType) {
      params.push(entityType);
      wheres.push(`al.entity_type = $${params.length}`);
    }
    if (entityId) {
      params.push(entityId);
      wheres.push(`al.entity_id = $${params.length}`);
    }
    if (action) {
      params.push(action);
      wheres.push(`al.action = $${params.length}`);
    }

    const whereClause = `WHERE ${wheres.join(' AND ')}`;

    // Paginação simples (limit + offset). Total separado pra UI saber se tem mais.
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const rows = await query(
      `SELECT
         al.id, al.workspace_id, al.actor_id, al.action,
         al.entity_type, al.entity_id, al.changes,
         al.ip_address, al.user_agent, al.created_at,
         m.display_name AS actor_name,
         m.email AS actor_email,
         m.avatar_url AS actor_avatar
       FROM audit_log al
       LEFT JOIN members m ON m.id = al.actor_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params
    );

    // Total pra paginação
    const countParams = params.slice(0, params.length - 2);
    const totalRes = await query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM audit_log al ${whereClause}`,
      countParams
    );
    const total = parseInt(totalRes.rows[0]?.cnt || '0', 10);

    return NextResponse.json({
      data: rows.rows,
      pagination: { page, limit, total, has_more: offset + rows.rowCount! < total },
    });
  } catch (err) {
    console.error('GET /api/audit-log error:', err);
    // Se a tabela não existe ainda (migration 040 não rodou), retorna lista vazia
    // pra UI não quebrar.
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('audit_log') && msg.includes('does not exist')) {
      return NextResponse.json({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, has_more: false },
        warning: 'Tabela audit_log não existe — rode a migration db/040_audit_log.sql',
      });
    }
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
