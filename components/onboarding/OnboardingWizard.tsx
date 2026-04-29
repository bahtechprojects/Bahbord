'use client';

import { useRouter } from 'next/navigation';
import { useState, type KeyboardEvent } from 'react';
import { X, Check, Mail } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';

type Step = 1 | 2 | 3;

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#ef4444', // red
];

export default function OnboardingWizard({ ownerName }: { ownerName: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [projectName, setProjectName] = useState('');
  const [projectPrefix, setProjectPrefix] = useState('');
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0]);
  const [projectCreated, setProjectCreated] = useState(false);

  // Step 2
  const [emailDraft, setEmailDraft] = useState('');
  const [invites, setInvites] = useState<string[]>([]);
  const [invitedCount, setInvitedCount] = useState(0);

  function isValidEmail(s: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
  }

  function pushEmail() {
    const v = emailDraft.trim();
    if (!v) return;
    if (!isValidEmail(v)) {
      toast('Email inválido', 'error');
      return;
    }
    if (invites.includes(v)) {
      setEmailDraft('');
      return;
    }
    setInvites((prev) => [...prev, v]);
    setEmailDraft('');
  }

  function removeEmail(e: string) {
    setInvites((prev) => prev.filter((x) => x !== e));
  }

  function onEmailKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      pushEmail();
    } else if (e.key === 'Backspace' && !emailDraft && invites.length > 0) {
      setInvites((prev) => prev.slice(0, -1));
    }
  }

  async function createProject() {
    if (!projectName.trim() || projectPrefix.trim().length < 2) {
      toast('Preencha nome e prefixo (mín. 2 letras)', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName.trim(),
          prefix: projectPrefix.trim().toUpperCase().slice(0, 10),
          color: projectColor,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Erro ao criar projeto', 'error');
        return;
      }
      setProjectCreated(true);
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendInvites() {
    // Push qualquer rascunho restante no input
    const pending = emailDraft.trim();
    let toSend = invites;
    if (pending && isValidEmail(pending) && !invites.includes(pending)) {
      toSend = [...invites, pending];
      setInvites(toSend);
      setEmailDraft('');
    }

    if (toSend.length === 0) {
      setStep(3);
      return;
    }

    setSubmitting(true);
    let ok = 0;
    try {
      for (const email of toSend) {
        const display = email.split('@')[0];
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'members',
            display_name: display,
            email,
            user_id: crypto.randomUUID(),
            role: 'member',
          }),
        });
        if (res.ok) ok++;
      }
      setInvitedCount(ok);
      if (ok < toSend.length) {
        toast(`${ok} de ${toSend.length} convites criados`, 'warning');
      }
      setStep(3);
    } finally {
      setSubmitting(false);
    }
  }

  async function complete() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboarding/complete', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || 'Erro ao concluir onboarding', 'error');
        return;
      }
      router.push('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function skip() {
    // Skip = pula o resto do wizard. Se já criou projeto, marca como onboarded
    // pra não cair em loop de redirect. Se não, só vai pra dashboard (que vai
    // redirecionar de volta enquanto não tiver projeto).
    setSubmitting(true);
    try {
      if (projectCreated) {
        await fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {});
      }
      router.push('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-10">
      {/* Skip button (top-right) */}
      <button
        type="button"
        onClick={skip}
        disabled={submitting}
        className="absolute right-6 top-6 inline-flex items-center gap-1 text-[12px] text-secondary transition hover:text-primary disabled:opacity-50"
      >
        Pular
        <X size={14} />
      </button>

      {/* Header */}
      <div className="mb-8 flex flex-col items-center">
        <Logo className="h-8 object-contain" />
        <p className="mt-4 page-eyebrow">Bem-vindo</p>
        <h1 className="mt-1 font-serif text-[32px] tracking-tight text-primary">
          Vamos começar.
        </h1>
      </div>

      {/* Progress dots */}
      <div className="mb-8 flex items-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-2 rounded-full transition-all ${
              n === step
                ? 'w-8 bg-[var(--accent)]'
                : n < step
                ? 'w-2 bg-[var(--accent)]/60'
                : 'w-2 bg-[var(--card-border)]'
            }`}
            aria-label={`Passo ${n}${n === step ? ' atual' : ''}`}
          />
        ))}
      </div>

      {/* Card */}
      <div className="card-premium w-full max-w-[600px] p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="section-eyebrow">Passo 1 de 3</p>
              <h2 className="font-serif text-[24px] tracking-tight text-primary">
                Seu primeiro projeto.
              </h2>
              <p className="text-[13px] text-secondary">
                Tudo no Bah!Flow começa com um projeto. Você pode criar mais depois.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-secondary">
                  Nome do projeto
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    if (!projectPrefix) {
                      const auto = e.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, '')
                        .slice(0, 3);
                      if (auto.length >= 2) setProjectPrefix(auto);
                    }
                  }}
                  placeholder="Ex: Bah!Flow Web"
                  className="w-full rounded-md border border-[var(--card-border)] bg-transparent px-3 py-2 text-[14px] text-primary outline-none transition focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-[120px_1fr] gap-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-secondary">
                    Prefixo
                  </label>
                  <input
                    type="text"
                    value={projectPrefix}
                    onChange={(e) =>
                      setProjectPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))
                    }
                    placeholder="ABC"
                    className="w-full rounded-md border border-[var(--card-border)] bg-transparent px-3 py-2 text-center font-mono text-[14px] uppercase tracking-widest text-primary outline-none transition focus:border-[var(--accent)]"
                    maxLength={3}
                  />
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">3 letras</p>
                </div>

                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-secondary">
                    Cor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setProjectColor(c)}
                        className={`h-7 w-7 rounded-full transition ${
                          projectColor === c
                            ? 'ring-2 ring-offset-2 ring-offset-[var(--surface)] ring-[var(--accent)]'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={createProject}
                disabled={submitting || !projectName.trim() || projectPrefix.length < 2}
                className="btn-premium btn-primary"
              >
                {submitting ? 'Criando…' : 'Continuar'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="section-eyebrow">Passo 2 de 3</p>
              <h2 className="font-serif text-[24px] tracking-tight text-primary">
                Convide o time.
              </h2>
              <p className="text-[13px] text-secondary">
                Adicione emails. Eles entram pendentes e ganham acesso quando se cadastram.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-secondary">
                Emails (Enter, vírgula ou espaço para adicionar)
              </label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--card-border)] bg-transparent px-2 py-2 transition focus-within:border-[var(--accent)]">
                {invites.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1 rounded bg-[var(--overlay-subtle)] px-2 py-0.5 text-[12px] text-primary"
                  >
                    <Mail size={11} className="text-secondary" />
                    {e}
                    <button
                      type="button"
                      onClick={() => removeEmail(e)}
                      className="text-secondary transition hover:text-primary"
                      aria-label={`Remover ${e}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(ev) => setEmailDraft(ev.target.value)}
                  onKeyDown={onEmailKey}
                  onBlur={pushEmail}
                  placeholder={invites.length === 0 ? 'pessoa@empresa.com' : ''}
                  className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-[14px] text-primary outline-none"
                />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                Opcional. Você pode convidar pessoas depois em Configurações → Membros.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-premium btn-ghost"
                disabled={submitting}
              >
                ← Voltar
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInvites([]);
                    setEmailDraft('');
                    setStep(3);
                  }}
                  className="btn-premium btn-ghost"
                  disabled={submitting}
                >
                  Pular
                </button>
                <button
                  type="button"
                  onClick={sendInvites}
                  disabled={submitting}
                  className="btn-premium btn-primary"
                >
                  {submitting ? 'Enviando…' : invites.length > 0 ? `Convidar ${invites.length}` : 'Continuar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="space-y-1">
              <p className="section-eyebrow">Passo 3 de 3</p>
              <h2 className="font-serif text-[28px] tracking-tight text-primary">
                Tudo certo, <span className="font-serif-italic text-[var(--accent)]">{ownerName}</span>.
              </h2>
              <p className="mt-2 text-[13px] text-secondary">
                Seu workspace está pronto. Cria seu primeiro ticket e vamos.
              </p>
            </div>

            <div className="mx-auto max-w-[360px] space-y-2 text-left">
              <div className="flex items-center gap-3 rounded-md border border-[var(--card-border)] px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                  <Check size={14} />
                </span>
                <div className="text-[13px] text-primary">
                  Projeto <span className="font-medium">{projectName || '—'}</span> criado
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-[var(--card-border)] px-3 py-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  invitedCount > 0
                    ? 'bg-[var(--success)]/15 text-[var(--success)]'
                    : 'bg-[var(--card-border)] text-secondary'
                }`}>
                  <Check size={14} />
                </span>
                <div className="text-[13px] text-primary">
                  {invitedCount > 0
                    ? `${invitedCount} convite${invitedCount > 1 ? 's' : ''} enviado${invitedCount > 1 ? 's' : ''}`
                    : 'Sem convites por agora'}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-[var(--card-border)] px-3 py-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
                  <Check size={14} />
                </span>
                <div className="text-[13px] text-primary">
                  Sprint inicial e board kanban prontos
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={complete}
                disabled={submitting}
                className="btn-premium btn-primary"
              >
                {submitting ? 'Indo…' : 'Ir pra Dashboard →'}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-[var(--text-tertiary)]">
        Você pode reconfigurar tudo depois em Configurações.
      </p>
    </div>
  );
}
