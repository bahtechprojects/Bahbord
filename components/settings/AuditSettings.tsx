'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import Avatar from '@/components/ui/Avatar';

interface AuditLogRow {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
  actor_avatar: string | null;
}

interface AuditResponse {
  data: AuditLogRow[];
  pagination: { page: number; limit: number; total: number; has_more: boolean };
  warning?: string;
}

const ENTITY_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Tudo' },
  { key: 'member', label: 'Membros' },
  { key: 'project', label: 'Projetos' },
  { key: 'automation', label: 'Automações' },
  { key: 'share_link', label: 'Share links' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'clients', label: 'Clientes' },
];

const ACTION_LABELS: Record<string, string> = {
  'member.role_changed': 'Mudou role do membro',
  'member.sync_clerk': 'Sincronizou usuários do Clerk',
  'member.time_tracking_toggled': 'Alterou time tracking',
  'members.created': 'Criou membro',
  'members.updated': 'Atualizou membro',
  'members.deleted': 'Removeu membro',
  'project.created': 'Criou projeto',
  'project.updated': 'Editou projeto',
  'project.archived': 'Arquivou projeto',
  'automation.created': 'Criou automação',
  'automation.updated': 'Atualizou automação',
  'automation.deleted': 'Removeu automação',
  'share_link.created': 'Criou share link',
  'share_link.revoked': 'Revogou share link',
  'workspace.updated': 'Atualizou workspace',
  'clients.created': 'Criou cliente',
  'clients.updated': 'Atualizou cliente',
  'clients.deleted': 'Removeu cliente',
};

function formatDate(d: string) {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export default function AuditSettings() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchPage = useCallback(
    async (pg: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set('page', String(pg));
        params.set('limit', '50');
        if (entityFilter) params.set('entity_type', entityFilter);

        const res = await fetch(`/api/audit-log?${params.toString()}`);
        if (!res.ok) {
          setWarning(`Erro ${res.status} ao carregar auditoria`);
          return;
        }
        const json: AuditResponse = await res.json();
        setWarning(json.warning || null);
        setHasMore(json.pagination.has_more);
        setTotal(json.pagination.total);
        setRows((prev) => (append ? [...prev, ...json.data] : json.data));
      } catch (err) {
        console.error('Erro ao carregar audit log:', err);
        setWarning('Falha ao carregar auditoria');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [entityFilter]
  );

  useEffect(() => {
    setPage(1);
    setExpanded(new Set());
    fetchPage(1, false);
  }, [fetchPage]);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Auditoria</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Histórico de eventos sensíveis no workspace.
            {total > 0 && (
              <span className="ml-1 text-slate-400">
                {total} evento{total === 1 ? '' : 's'}.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtro por entity_type */}
      <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-surface px-3 py-2">
        <Filter size={13} className="text-slate-500" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Tipo
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              onClick={() => setEntityFilter(f.key)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition',
                entityFilter === f.key
                  ? 'bg-accent text-white'
                  : 'text-slate-400 hover:bg-input/40 hover:text-slate-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {warning && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-300">
          {warning}
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 size={18} className="animate-spin text-accent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          Nenhum evento de auditoria registrado.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/40 bg-surface">
          {/* Header */}
          <div className="grid grid-cols-[160px_1fr_1fr_24px] items-center gap-3 border-b border-border/40 bg-surface2 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Quando</span>
            <span>Quem</span>
            <span>O quê</span>
            <span />
          </div>

          {/* Rows */}
          <div>
            {rows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <div key={r.id} className="border-b border-border/30 last:border-0">
                  <button
                    onClick={() => toggleExpanded(r.id)}
                    className="grid w-full grid-cols-[160px_1fr_1fr_24px] items-center gap-3 px-4 py-3 text-left transition hover:bg-input/20"
                  >
                    <span className="text-[12px] text-slate-400 tabular-nums">
                      {formatDate(r.created_at)}
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      {r.actor_name ? (
                        <>
                          <Avatar name={r.actor_name} imageUrl={r.actor_avatar} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-medium text-white">
                              {r.actor_name}
                            </p>
                            {r.actor_email && (
                              <p className="truncate text-[10px] text-slate-500">
                                {r.actor_email}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-[12px] italic text-slate-500">Sistema</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-white">{actionLabel(r.action)}</p>
                      <p className="truncate text-[10px] text-slate-500">
                        <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono">
                          {r.entity_type}
                        </span>
                        {r.entity_id && (
                          <span className="ml-1 font-mono text-slate-600">
                            {r.entity_id.slice(0, 8)}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="flex items-center justify-end text-slate-500">
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="space-y-2 border-t border-border/30 bg-surface2/40 px-4 py-3 text-[11px]">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
                        <span>
                          <span className="text-slate-500">Action:</span>{' '}
                          <span className="font-mono text-slate-300">{r.action}</span>
                        </span>
                        {r.ip_address && (
                          <span>
                            <span className="text-slate-500">IP:</span>{' '}
                            <span className="font-mono text-slate-300">{r.ip_address}</span>
                          </span>
                        )}
                        {r.user_agent && (
                          <span className="max-w-full truncate">
                            <span className="text-slate-500">UA:</span>{' '}
                            <span className="font-mono text-slate-300">
                              {r.user_agent.slice(0, 80)}
                            </span>
                          </span>
                        )}
                      </div>
                      {r.changes && Object.keys(r.changes).length > 0 && (
                        <div>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Mudanças
                          </p>
                          <pre className="overflow-x-auto rounded bg-black/40 p-2 font-mono text-[11px] text-slate-300">
                            {JSON.stringify(r.changes, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Carregar mais */}
      {!loading && hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className={cn(
              'flex items-center gap-2 rounded-md border border-border/40 bg-surface px-4 py-2 text-[12px] font-medium transition',
              loadingMore
                ? 'cursor-not-allowed text-slate-600'
                : 'text-slate-300 hover:bg-input/30 hover:text-white'
            )}
          >
            {loadingMore && <Loader2 size={13} className="animate-spin" />}
            Carregar mais
          </button>
        </div>
      )}
    </div>
  );
}
