import { query } from './db';

const EVENT_LABELS: Record<string, string> = {
  'ticket.created': '📝 Novo ticket',
  'ticket.updated': '✏️ Ticket atualizado',
  'ticket.completed': '✅ Ticket concluído',
  'ticket.assigned': '👤 Ticket atribuído',
  'comment.created': '💬 Novo comentário',
  'sprint.started': '⚡ Sprint iniciado',
  'sprint.completed': '🏁 Sprint concluído',
};

interface SlackBlock { type: string; [key: string]: unknown }

function isSlack(url: string): boolean {
  return /hooks\.slack\.com\/services\//i.test(url);
}
function isDiscord(url: string): boolean {
  return /discord(app)?\.com\/api\/webhooks\//i.test(url);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://projetos.bahtech.com.br';
}

function formatForSlack(event: string, data: Record<string, unknown>): { text: string; blocks: SlackBlock[] } {
  const label = EVENT_LABELS[event] || `🔔 ${event}`;
  const title = (data.title as string) || (data.message as string) || event;
  const ticketKey = (data.ticket_key as string) || '';
  const link = data.ticket_id ? `${appUrl()}/ticket/${data.ticket_id}` : null;

  const text = `${label}: ${ticketKey ? `[${ticketKey}] ` : ''}${title}`;
  const blocks: SlackBlock[] = [
    { type: 'section', text: { type: 'mrkdwn', text: `*${label}*\n${ticketKey ? `\`${ticketKey}\` ` : ''}${title}` } },
  ];
  if (link) {
    blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `<${link}|Abrir no Bah!Flow>` }] });
  }
  return { text, blocks };
}

function formatForDiscord(event: string, data: Record<string, unknown>): { content: string; embeds: unknown[] } {
  const label = EVENT_LABELS[event] || `🔔 ${event}`;
  const title = (data.title as string) || (data.message as string) || event;
  const ticketKey = (data.ticket_key as string) || '';
  const link = data.ticket_id ? `${appUrl()}/ticket/${data.ticket_id}` : undefined;

  return {
    content: label,
    embeds: [
      {
        title: `${ticketKey ? `[${ticketKey}] ` : ''}${title}`.substring(0, 256),
        url: link,
        color: 0x3b6cf5,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export async function dispatchWebhook(event: string, data: Record<string, unknown>) {
  const result = await query(
    `SELECT url, secret FROM webhook_subscriptions WHERE is_active = true AND $1 = ANY(events)`,
    [event]
  );

  for (const sub of result.rows) {
    const url = sub.url as string;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let body: string;

    if (isSlack(url)) {
      body = JSON.stringify(formatForSlack(event, data));
    } else if (isDiscord(url)) {
      body = JSON.stringify(formatForDiscord(event, data));
    } else {
      // Generic webhook
      if (sub.secret) headers['X-Webhook-Secret'] = sub.secret;
      body = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    }

    fetch(url, { method: 'POST', headers, body })
      .catch((err) => console.error(`Webhook dispatch failed for ${url}:`, err));
  }
}
