import { query } from './db';

export interface AuditLogInput {
  workspaceId: string | null | undefined;
  actorId: string | null | undefined;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Registra um evento sensível na tabela audit_log.
 *
 * Try/catch silencioso: se a auditoria falhar (ex: tabela ausente porque a
 * migration 040 não rodou ainda) NÃO devemos quebrar a operação principal.
 * Apenas logamos no console pra triagem.
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_log
        (workspace_id, actor_id, action, entity_type, entity_id, changes, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.workspaceId || null,
        input.actorId || null,
        input.action,
        input.entityType,
        input.entityId || null,
        JSON.stringify(input.changes || {}),
        input.ipAddress || null,
        input.userAgent || null,
      ]
    );
  } catch (err) {
    // Silencioso por design — auditoria nunca pode derrubar o request principal.
    console.error('[audit] Falha ao registrar evento:', input.action, err);
  }
}

/**
 * Extrai IP + user agent dos headers da request pra audit log.
 * Trata cabeçalhos de proxy (x-forwarded-for, x-real-ip).
 */
export function extractRequestMeta(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  try {
    const headers = request.headers;
    const xff = headers.get('x-forwarded-for');
    const ip =
      (xff ? xff.split(',')[0]?.trim() : null) ||
      headers.get('x-real-ip') ||
      headers.get('cf-connecting-ip') ||
      null;
    const ua = headers.get('user-agent');
    return { ipAddress: ip, userAgent: ua };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}
