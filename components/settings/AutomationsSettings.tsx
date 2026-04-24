'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Zap, Loader2, Edit2 } from 'lucide-react';

interface Automation {
  id: string;
  workspace_id: string;
  project_id: string | null;
  project_name?: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_event: string;
  trigger_conditions: Record<string, unknown> | null;
  action_type: string;
  action_params: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
}

const TRIGGER_EVENTS = [
  { value: 'ticket.created', label: 'Ticket criado' },
  { value: 'ticket.status_changed', label: 'Status alterado' },
  { value: 'ticket.assigned', label: 'Responsável alterado' },
];

const ACTION_TYPES = [
  { value: 'assign_to', label: 'Atribuir para membro', hint: '{ "member_id": "..." }' },
  { value: 'set_priority', label: 'Definir prioridade', hint: '{ "priority": "urgent" }' },
  { value: 'add_comment', label: 'Adicionar comentário', hint: '{ "text": "...", "author_id": "..." }' },
  { value: 'notify_member', label: 'Notificar membro', hint: '{ "member_id": "...", "message": "..." }' },
];

const emptyForm = {
  id: null as string | null,
  name: '',
  description: '',
  project_id: '',
  is_active: true,
  trigger_event: 'ticket.created',
  trigger_conditions: '{}',
  action_type: 'assign_to',
  action_params: '{}',
};

function eventLabel(v: string) {
  return TRIGGER_EVENTS.find((e) => e.value === v)?.label || v;
}
function actionLabel(v: string) {
  return ACTION_TYPES.find((a) => a.value === v)?.label || v;
}

export default function AutomationsSettings() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch('/api/automations');
      const data = await res.json();
      if (Array.isArray(data)) setAutomations(data);
    } catch (err) {
      console.error('Erro ao carregar automações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (Array.isArray(data)) setProjects(data.map((p: Project) => ({ id: p.id, name: p.name })));
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
    fetchProjects();
  }, [fetchAutomations, fetchProjects]);

  function resetForm() {
    setForm(emptyForm);
    setFormError(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(a: Automation) {
    setForm({
      id: a.id,
      name: a.name,
      description: a.description || '',
      project_id: a.project_id || '',
      is_active: a.is_active,
      trigger_event: a.trigger_event,
      trigger_conditions: JSON.stringify(a.trigger_conditions || {}, null, 2),
      action_type: a.action_type,
      action_params: JSON.stringify(a.action_params || {}, null, 2),
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

    let trigger_conditions: unknown = {};
    let action_params: unknown = {};
    try {
      trigger_conditions = form.trigger_conditions.trim()
        ? JSON.parse(form.trigger_conditions)
        : {};
    } catch {
      setFormError('Condições: JSON inválido');
      return;
    }
    try {
      action_params = form.action_params.trim()
        ? JSON.parse(form.action_params)
        : {};
    } catch {
      setFormError('Parâmetros da ação: JSON inválido');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: form.id || undefined,
        name: form.name.trim(),
        description: form.description.trim() || null,
        project_id: form.project_id || null,
        is_active: form.is_active,
        trigger_event: form.trigger_event,
        trigger_conditions,
        action_type: form.action_type,
        action_params,
      };
      const res = await fetch('/api/automations', {
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
      fetchAutomations();
    } catch (err) {
      console.error('Erro ao salvar automação:', err);
      setFormError('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(a: Automation) {
    try {
      await fetch('/api/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, is_active: !a.is_active }),
      });
      fetchAutomations();
    } catch (err) {
      console.error('Erro ao alternar automação:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta automação?')) return;
    try {
      await fetch(`/api/automations?id=${id}`, { method: 'DELETE' });
      fetchAutomations();
    } catch (err) {
      console.error('Erro ao remover automação:', err);
    }
  }

  const currentActionHint =
    ACTION_TYPES.find((a) => a.value === form.action_type)?.hint || '{}';

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 size={16} className="animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Automações</h2>
          <p className="text-xs text-slate-400">
            Execute ações automaticamente quando eventos acontecerem (tipo Jira Automation / IFTTT).
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/80"
        >
          <Plus size={14} />
          Nova automação
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white">
            {form.id ? 'Editar automação' : 'Nova automação'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Urgente → atribuir ao líder"
                className="input-premium w-full text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Projeto (opcional)
              </label>
              <select
                value={form.project_id}
                onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="input-premium w-full text-sm"
              >
                <option value="">Todos os projetos</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Descrição (opcional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-premium w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Evento (gatilho)
              </label>
              <select
                value={form.trigger_event}
                onChange={(e) => setForm({ ...form, trigger_event: e.target.value })}
                className="input-premium w-full text-sm"
              >
                {TRIGGER_EVENTS.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Ação
              </label>
              <select
                value={form.action_type}
                onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                className="input-premium w-full text-sm"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Condições (JSON) — filtra quando a regra dispara
            </label>
            <textarea
              value={form.trigger_conditions}
              onChange={(e) => setForm({ ...form, trigger_conditions: e.target.value })}
              rows={3}
              placeholder='{ "priority": "urgent" }'
              className="input-premium w-full text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Vazio = sempre dispara. Campos são comparados com os do ticket (ex.: priority, service_id, status_id).
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Parâmetros da ação (JSON)
            </label>
            <textarea
              value={form.action_params}
              onChange={(e) => setForm({ ...form, action_params: e.target.value })}
              rows={3}
              placeholder={currentActionHint}
              className="input-premium w-full text-sm font-mono"
            />
            <p className="mt-1 text-[11px] text-slate-500">Exemplo: {currentActionHint}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-border accent-accent"
            />
            Ativa
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
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent/80 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-slate-400 transition hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {automations.length === 0 && !showForm ? (
        <p className="text-sm text-slate-500">Nenhuma automação cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {automations.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              {/* Toggle */}
              <button
                onClick={() => handleToggle(a)}
                className={`mt-1 h-4 w-8 shrink-0 rounded-full transition relative ${
                  a.is_active ? 'bg-accent' : 'bg-slate-600'
                }`}
                title={a.is_active ? 'Desativar' : 'Ativar'}
              >
                <span
                  className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                    a.is_active ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-accent shrink-0" />
                  <p className="truncate text-sm font-medium text-white">{a.name}</p>
                  {a.project_name && (
                    <span className="rounded-full bg-input/50 px-2 py-0.5 text-[10px] text-slate-400">
                      {a.project_name}
                    </span>
                  )}
                </div>
                {a.description && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{a.description}</p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  <span className="text-slate-500">Quando</span>{' '}
                  <span className="text-slate-300">{eventLabel(a.trigger_event)}</span>
                  {a.trigger_conditions && Object.keys(a.trigger_conditions).length > 0 && (
                    <>
                      {' '}
                      <span className="text-slate-500">com filtros</span>{' '}
                      <span className="font-mono text-slate-300">
                        {JSON.stringify(a.trigger_conditions)}
                      </span>
                    </>
                  )}
                  {' → '}
                  <span className="text-slate-300">{actionLabel(a.action_type)}</span>
                </p>
              </div>

              {/* Actions */}
              <button
                onClick={() => openEdit(a)}
                className="rounded p-1.5 text-slate-400 transition hover:bg-input/50 hover:text-white"
                title="Editar"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="rounded p-1.5 text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
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
