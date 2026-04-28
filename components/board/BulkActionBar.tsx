'use client';

import { useEffect, useState } from 'react';
import { Archive, X, ArrowRightCircle, User, Flag } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmModal';
import { useRouter } from 'next/navigation';

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
  statuses: Array<{ id: string; name: string; color: string }>;
}

const priorityOptions = [
  { value: 'urgent', label: 'Urgente', color: '#ef4444' },
  { value: 'high', label: 'Alta', color: '#f97316' },
  { value: 'medium', label: 'Média', color: '#3b6cf5' },
  { value: 'low', label: 'Baixa', color: '#71717a' },
];

export default function BulkActionBar({ selectedIds, onClear, statuses }: BulkActionBarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [members, setMembers] = useState<Array<{ id: string; display_name: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/options?type=members')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  if (selectedIds.length === 0) return null;

  async function bulk(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch('/api/tickets/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action, ...payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Erro ao aplicar ação', 'error');
        return false;
      }
      const data = await res.json();
      let msg = `${data.updated} ticket${data.updated !== 1 ? 's' : ''} atualizado${data.updated !== 1 ? 's' : ''}`;
      if (data.skipped > 0) msg += ` (${data.skipped} sem acesso ignorado${data.skipped !== 1 ? 's' : ''})`;
      toast(msg, 'success');
      onClear();
      router.refresh();
      return true;
    } catch {
      toast('Erro de rede', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    const ok = await confirm({
      title: 'Arquivar tickets',
      message: `Arquivar ${selectedIds.length} ticket(s) selecionado(s)? Eles ficam ocultos do board mas não são deletados.`,
      confirmText: 'Arquivar',
      variant: 'danger',
    });
    if (!ok) return;
    bulk('archive');
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-slide-up">
      <div className="flex items-center gap-1 rounded-lg border border-[var(--card-border)] bg-[var(--modal-bg)] px-2 py-1.5 shadow-2xl shadow-black/40">
        <span className="px-2 text-[12.5px] text-secondary tabular-nums">
          <span className="text-primary font-semibold">{selectedIds.length}</span> selecionado{selectedIds.length !== 1 ? 's' : ''}
        </span>
        <div className="h-5 w-px bg-[var(--card-border)]" />

        {/* Mover */}
        <div className="relative group">
          <button
            disabled={busy}
            className="btn-premium btn-ghost text-[12px]"
          >
            <ArrowRightCircle size={13} /> Mover
          </button>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
            <div className="rounded-md border border-[var(--card-border)] bg-[var(--modal-bg)] py-1 min-w-[160px] shadow-xl">
              {statuses.map((s) => (
                <button
                  key={s.id}
                  onClick={() => bulk('move', { status_id: s.id })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-primary hover:bg-[var(--overlay-hover)]"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Atribuir */}
        <div className="relative group">
          <button disabled={busy} className="btn-premium btn-ghost text-[12px]">
            <User size={13} /> Atribuir
          </button>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
            <div className="rounded-md border border-[var(--card-border)] bg-[var(--modal-bg)] py-1 min-w-[180px] max-h-[260px] overflow-y-auto shadow-xl">
              <button
                onClick={() => bulk('assign', { assignee_id: null })}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-secondary hover:bg-[var(--overlay-hover)] italic"
              >
                Sem responsável
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => bulk('assign', { assignee_id: m.id })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-primary hover:bg-[var(--overlay-hover)]"
                >
                  {m.display_name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prioridade */}
        <div className="relative group">
          <button disabled={busy} className="btn-premium btn-ghost text-[12px]">
            <Flag size={13} /> Prioridade
          </button>
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block">
            <div className="rounded-md border border-[var(--card-border)] bg-[var(--modal-bg)] py-1 min-w-[140px] shadow-xl">
              {priorityOptions.map((p) => (
                <button
                  key={p.value}
                  onClick={() => bulk('priority', { priority: p.value })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-[12.5px] text-primary hover:bg-[var(--overlay-hover)]"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Arquivar */}
        <button
          onClick={handleArchive}
          disabled={busy}
          className="btn-premium btn-ghost text-[12px] hover:!text-[var(--danger)]"
        >
          <Archive size={13} /> Arquivar
        </button>

        <div className="h-5 w-px bg-[var(--card-border)]" />

        {/* Cancelar */}
        <button
          onClick={onClear}
          disabled={busy}
          className="rounded p-1.5 text-secondary hover:bg-[var(--overlay-hover)] hover:text-primary"
          title="Limpar seleção (Esc)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
