'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface ActivityItem {
  id: string;
  ticket_id: string;
  ticket_key: string | null;
  ticket_title: string | null;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_name: string | null;
  created_at: string;
}

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days}d`;
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function describeActivity(item: ActivityItem): string {
  const actor = item.actor_name || 'Alguém';
  const ticketRef = item.ticket_key || 'um ticket';

  if (item.action === 'create') return `${actor} criou ${ticketRef}`;
  if (item.action === 'delete') return `${actor} excluiu ${ticketRef}`;

  if (item.field_name === 'status' && item.new_value) {
    return `${actor} moveu ${ticketRef} pra ${item.new_value}`;
  }
  if (item.field_name === 'assignee' && item.new_value) {
    return `${actor} atribuiu ${ticketRef} a ${item.new_value}`;
  }
  if (item.field_name === 'priority' && item.new_value) {
    return `${actor} mudou prioridade de ${ticketRef} para ${item.new_value}`;
  }
  if (item.field_name === 'sprint' && item.new_value) {
    return `${actor} adicionou ${ticketRef} ao sprint ${item.new_value}`;
  }
  if (item.field_name === 'comment') {
    return `${actor} comentou em ${ticketRef}`;
  }

  return `${actor} atualizou ${ticketRef}`;
}

export default function ActivityFeed({ projectId, limit = 12 }: ActivityFeedProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = projectId
      ? `/api/activity?project_id=${projectId}&limit=${limit}`
      : `/api/activity?limit=${limit}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [projectId, limit]);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-2.5 animate-pulse">
            <div className="h-5 w-5 rounded-full bg-[var(--overlay-hover)] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-[var(--overlay-hover)]" />
              <div className="h-2.5 w-1/3 rounded bg-[var(--overlay-subtle)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-[12px] text-[var(--text-tertiary)] py-2">
        Nenhuma atividade recente.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const initials = (item.actor_name || '?')
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        return (
          <Link
            key={item.id}
            href={`/ticket/${item.ticket_id}` as any}
            className="flex items-start gap-2.5 group hover:bg-[var(--overlay-subtle)] rounded-md px-1.5 py-1 -mx-1.5 transition-colors"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[9px] font-bold text-[var(--accent)] shrink-0 mt-0.5">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] text-secondary leading-snug">
                {describeActivity(item)}
              </p>
              <p className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">{timeAgo(item.created_at)}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
