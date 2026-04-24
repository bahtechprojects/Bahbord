import { query } from './db';
import { createNotification } from './notifications';

export interface TriggerContext {
  ticket: any;
  event: string;
  workspace_id: string;
  actor_id?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

/**
 * Executa todas as automações ativas para um evento específico.
 *
 * Fire-and-forget safe: captura erros internamente e não bloqueia o fluxo
 * principal da API de tickets.
 */
export async function runAutomations(ctx: TriggerContext) {
  try {
    if (!ctx?.workspace_id || !ctx?.event || !ctx?.ticket) return;

    const rules = await query(
      `SELECT * FROM automations
       WHERE is_active = true
         AND workspace_id = $1
         AND trigger_event = $2
         AND (project_id IS NULL OR project_id = $3)`,
      [ctx.workspace_id, ctx.event, ctx.ticket?.project_id || null]
    );

    for (const rule of rules.rows) {
      if (!matchesConditions(rule.trigger_conditions, ctx)) continue;
      try {
        await executeAction(rule, ctx);
      } catch (err) {
        console.error(`Automation action failed (rule ${rule.id}):`, err);
      }
    }
  } catch (err) {
    console.error('Automation error:', err);
  }
}

function matchesConditions(conditions: any, ctx: TriggerContext): boolean {
  if (!conditions || typeof conditions !== 'object') return true;
  const keys = Object.keys(conditions);
  if (keys.length === 0) return true;
  for (const [key, value] of Object.entries(conditions)) {
    if (ctx.ticket[key] !== value) return false;
  }
  return true;
}

async function executeAction(rule: any, ctx: TriggerContext) {
  const { action_type, action_params } = rule;
  const params = action_params || {};

  switch (action_type) {
    case 'assign_to':
      if (params.member_id) {
        await query(
          `UPDATE tickets SET assignee_id = $1, updated_at = NOW() WHERE id = $2`,
          [params.member_id, ctx.ticket.id]
        );
      }
      break;

    case 'set_priority':
      if (params.priority) {
        await query(
          `UPDATE tickets SET priority = $1, updated_at = NOW() WHERE id = $2`,
          [params.priority, ctx.ticket.id]
        );
      }
      break;

    case 'add_comment':
      if (params.text && params.author_id) {
        await query(
          `INSERT INTO comments (ticket_id, author_id, body) VALUES ($1, $2, $3)`,
          [ctx.ticket.id, params.author_id, params.text]
        );
      }
      break;

    case 'notify_member':
      if (params.member_id) {
        await createNotification({
          workspace_id: ctx.workspace_id,
          recipient_id: params.member_id,
          actor_id: ctx.actor_id,
          type: 'automation',
          entity_type: 'ticket',
          entity_id: ctx.ticket.id,
          title: `Automação: ${rule.name}`,
          message: params.message || `Ticket ${ctx.ticket.title}`,
          link: `/ticket/${ctx.ticket.id}`,
        });
      }
      break;

    default:
      console.warn(`Unknown automation action_type: ${action_type}`);
  }
}
