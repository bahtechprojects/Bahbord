'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Repeat, Loader2, X } from 'lucide-react';

interface RecurringTicket {
  id: string;
  workspace_id: string;
  project_id: string | null;
  project_name: string | null;
  board_id: string | null;
  board_name: string | null;
  name: string;
  title_template: string;
  description_html: string | null;
  ticket_type_id: string | null;
  ticket_type_name: string | null;
  service_id: string | null;
  service_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  priority: string | null;
  cron_expression: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
}

interface SelectItem { id: string; name: string; display_name?: string; project_id?: string }

const PRIORITIES = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

const CRON_PRESETS = [
  { label: 'Toda segunda 9h', cron: '0 9 * * 1' },
  { label: 'Diariamente 8h', cron: '0 8 * * *' },
  { label: 'Todo dia 1 às 9h', cron: '0 9 1 * *' },
  { label: 'Toda sexta 17h', cron: '0 17 * * 5' },
  { label: 'A cada hora', cron: '0 * * * *' },
];

const emptyForm = {
  id: null as string | null,
  name: '',
  title_template: '',
  description_html: '',
  project_id: '',
  board_id: '',
  ticket_type_id: '',
  service_id: '',
  assignee_id: '',
  priority: 'medium',
  cron_expression: '0 9 * * 1',
  is_active: true,
};

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export default function RecurringTicketsSettings() {
  const [items, setItems] = useState<RecurringTicket[]>([]);
  const [projects, setProjects] = useState<SelectItem[]>([]);
  const [boards, setBoards] = useState<SelectItem[]>([]);
  const [ticketTypes, setTicketTypes] = useState<SelectItem[]>([]);
  const [services, setServices] = useState<SelectItem[]>([]);
  const [members, setMembers] = useState<SelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/recurring-tickets');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) {
      console.error('Erro ao carregar recurring tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      const [pr, br, tt, sv, mem] = await Promise.all([
        fetch('/api/options?type=projects'),
        fetch('/api/options?type=boards'),
        fetch('/api/options?type=ticket_types'),
        fetch('/api/options?type=services'),
        fetch('/api/options?type=members'),
      ]);
      if (pr.ok) setProjects(await pr.json());
      if (br.ok) setBoards(await br.json());
      if (tt.ok) setTicketTypes(await tt.json());
      if (sv.ok) setServices(await sv.json());
      if (mem.ok) setMembers(await mem.json());
    } catch (err) {
      console.error('Erro ao carregar opções:', err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchOptions();
  }, [fetchItems, fetchOptions]);

  function resetForm() {
    setForm(emptyForm);
    setFormError(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(r: RecurringTicket) {
    setForm({
      id: r.id,
      name: r.name,
      title_template: r.title_template,
      description_html: r.description_html || '',
      project_id: r.project_id || '',
      board_id: r.board_id || '',
      ticket_type_id: r.ticket_type_id || '',
      service_id: r.service_id || '',
      assignee_id: r.assignee_id || '',
      priority: r.priority || 'medium',
      cron_expression: r.cron_expression,
      is_active: r.is_active,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave() {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Nome é obrigatório');
      return;
    }
    if (!form.title_template.trim()) {
      setFormError('Título do ticket gerado é obrigatório');
      return;
    }
    if (!form.cron_expression.trim()) {
      setFormError('Cron expression é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id || undefined,
        name: form.name.trim(),
        title_template: form.title_template.trim(),
        description_html: form.description_html || null,
        project_id: form.project_id || null,
        board_id: form.board_id || null,
        ticket_type_id: form.ticket_type_id || null,
        service_id: form.service_id || null,
        assignee_id: form.assignee_id || null,
        priority: form.priority || 'medium',
        cron_expression: form.cron_expression.trim(),
        is_active: form.is_active,
      };
      const res = await fetch('/api/recurring-tickets', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Erro ao salvar');
        return;
      }
      setShowForm(false);
      resetForm();
      fetchItems();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      setFormError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(r: RecurringTicket) {
    try {
      await fetch('/api/recurring-tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, is_active: !r.is_active }),
      });
      fetchItems();
    } catch (err) {
      console.error('Erro ao alternar:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este recurring ticket?')) return;
    try {
      await fetch(`/api/recurring-tickets?id=${id}`, { method: 'DELETE' });
      fetchItems();
    } catch (err) {
      console.error('Erro ao remover:', err);
    }
  }

  // Filter boards by selected project
  const filteredBoards = form.project_id
    ? boards.filter((b) => b.project_id === form.project_id)
    : boards;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-secondary">
        <Loader2 size={16} className="animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">Tickets recorrentes</h2>
          <p className="text-xs text-secondary">
            Cria tickets automaticamente em um interval (rotinas: backup, planning, reuniões).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn-premium btn-primary flex items-center gap-1.5 text-xs"
        >
          <Plus size={14} />
          Novo recorrente
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-premium space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">
              {form.id ? 'Editar recurring' : 'Novo recurring'}
            </h3>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded p-1 text-secondary hover:text-primary"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Nome interno</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Planning semanal"
                className="input-premium w-full text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Prioridade</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="input-premium w-full text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">
              Título do ticket gerado (use {'{{date}}'} {'{{week}}'} {'{{month}}'})
            </label>
            <input
              type="text"
              value={form.title_template}
              onChange={(e) => setForm({ ...form, title_template: e.target.value })}
              placeholder="Ex.: Planning semana {{week}}"
              className="input-premium w-full text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Descrição (HTML — opcional)</label>
            <textarea
              value={form.description_html}
              onChange={(e) => setForm({ ...form, description_html: e.target.value })}
              rows={3}
              placeholder="<p>Pauta padrão do planning...</p>"
              className="input-premium w-full text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Projeto</label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value, board_id: '' })}
                className="input-premium w-full text-sm"
              >
                <option value="">— sem projeto —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Board</label>
              <select
                value={form.board_id}
                onChange={(e) => setForm({ ...form, board_id: e.target.value })}
                className="input-premium w-full text-sm"
              >
                <option value="">— sem board —</option>
                {filteredBoards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Tipo</label>
              <select
                value={form.ticket_type_id}
                onChange={(e) => setForm({ ...form, ticket_type_id: e.target.value })}
                className="input-premium w-full text-sm"
              >
                <option value="">—</option>
                {ticketTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Serviço</label>
              <select
                value={form.service_id}
                onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                className="input-premium w-full text-sm"
              >
                <option value="">—</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-secondary">Responsável</label>
              <select
                value={form.assignee_id}
                onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                className="input-premium w-full text-sm"
              >
                <option value="">—</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name || m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Cadência (cron)</label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.cron}
                  type="button"
                  onClick={() => setForm({ ...form, cron_expression: p.cron })}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                    form.cron_expression === p.cron
                      ? 'border-accent bg-accent/15 text-primary'
                      : 'border-[var(--card-border)] text-secondary hover:text-primary'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.cron_expression}
              onChange={(e) => setForm({ ...form, cron_expression: e.target.value })}
              placeholder="0 9 * * 1"
              className="input-premium w-full text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-secondary">
              Formato cron padrão: minuto hora dia-do-mês mês dia-da-semana.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs text-secondary">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-[var(--card-border)] accent-accent"
            />
            Ativo
          </label>

          {formError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-premium btn-primary text-xs disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="btn-premium btn-ghost text-xs"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 && !showForm ? (
        <p className="text-sm text-secondary">Nenhum recurring ticket cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <div
              key={r.id}
              className="card-premium flex items-start gap-3 px-4 py-3"
            >
              <button
                onClick={() => handleToggle(r)}
                className={`mt-1 h-4 w-8 shrink-0 rounded-full transition relative ${
                  r.is_active ? 'bg-accent' : 'bg-slate-600'
                }`}
                title={r.is_active ? 'Desativar' : 'Ativar'}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                    r.is_active ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>

              <Repeat size={14} className="mt-1 shrink-0 text-accent" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="truncate text-sm font-medium text-primary">{r.name}</p>
                  {r.project_name && (
                    <span className="rounded-full bg-input/50 px-2 py-0.5 text-[10px] text-secondary">
                      {r.project_name}
                    </span>
                  )}
                  {r.priority && (
                    <span className="rounded-full bg-input/50 px-2 py-0.5 text-[10px] uppercase text-secondary">
                      {r.priority}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-secondary">
                  Cria: <span className="text-primary">{r.title_template}</span>
                </p>
                <p className="mt-1 text-[11px] text-secondary">
                  <span className="font-mono text-primary">{r.cron_expression}</span>
                  {' · próximo: '}
                  <span className="text-primary">{formatDate(r.next_run_at)}</span>
                  {r.last_run_at && (
                    <>
                      {' · último: '}
                      <span className="text-primary">{formatDate(r.last_run_at)}</span>
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => openEdit(r)}
                className="rounded p-1.5 text-secondary transition hover:bg-input/50 hover:text-primary"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                className="rounded p-1.5 text-secondary transition hover:bg-red-500/20 hover:text-red-400"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
