import { Columns3, CheckCircle2, Clock, Activity } from 'lucide-react';

interface ShareLink {
  id: string;
  slug: string;
  project_id: string | null;
  board_id: string | null;
  project_name: string | null;
  project_color: string | null;
  expires_at: string | null;
  views_count: number;
}

interface PublicTicket {
  ticket_key: string;
  title: string;
  priority: string | null;
  status_name: string | null;
  status_color: string | null;
  type_name: string | null;
  type_icon: string | null;
  is_done?: boolean;
}

interface Stats {
  total_active: number;
  in_progress: number;
  completed_month: number;
}

interface PublicClientDashboardProps {
  link: ShareLink;
  tickets: PublicTicket[];
  stats: Stats;
}

const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: '#ef444420', text: '#ef4444', label: 'Urgente' },
  high: { bg: '#f9731620', text: '#f97316', label: 'Alta' },
  medium: { bg: '#eab30820', text: '#eab308', label: 'Média' },
  low: { bg: '#60a5fa20', text: '#60a5fa', label: 'Baixa' },
};

export default function PublicClientDashboard({ link, tickets, stats }: PublicClientDashboardProps) {
  const projectColor = link.project_color || '#3b82f6';
  const projectName = link.project_name || 'Painel do projeto';

  const statCards = [
    {
      label: 'Tickets ativos',
      value: stats.total_active,
      icon: Columns3,
      gradient: 'from-blue-600 to-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    {
      label: 'Em andamento',
      value: stats.in_progress,
      icon: Activity,
      gradient: 'from-violet-600 to-purple-400',
      iconBg: 'bg-violet-500/20',
    },
    {
      label: 'Concluídos (30d)',
      value: stats.completed_month,
      icon: CheckCircle2,
      gradient: 'from-emerald-600 to-green-400',
      iconBg: 'bg-emerald-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Banner */}
      <header
        className="relative overflow-hidden border-b border-white/[0.06]"
        style={{
          background: `linear-gradient(135deg, ${projectColor}26 0%, ${projectColor}0d 100%)`,
        }}
      >
        <div className="mx-auto flex max-w-[1100px] items-center gap-4 px-6 py-8">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-primary shadow-lg"
            style={{ backgroundColor: projectColor }}
          >
            {projectName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Painel do cliente
            </p>
            <h1 className="truncate text-2xl font-bold text-primary tracking-tight">
              {projectName}
            </h1>
          </div>
          {link.expires_at && (
            <div className="hidden shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-right sm:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Expira em</p>
              <p className="text-[12px] font-semibold text-slate-200">
                {new Date(link.expires_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-6 py-8">
        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card-premium group relative overflow-hidden">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-[0.06] transition-opacity group-hover:opacity-[0.12]`}
                />
                <div className="relative p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {card.label}
                    </span>
                    <div className={`rounded-lg p-2 ${card.iconBg}`}>
                      <Icon size={16} className="text-primary" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-primary tracking-tight tabular-nums">
                    {card.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tickets list */}
        <div className="card-premium overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
            <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-300">
              <Clock size={14} className="text-slate-500" />
              Atividades recentes
            </h2>
            <span className="text-[11px] text-slate-500 tabular-nums">
              {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-slate-600">
              Nenhum ticket para exibir.
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {tickets.map((t) => {
                const prio = t.priority ? PRIORITY_COLORS[t.priority] : null;
                return (
                  <div
                    key={t.ticket_key}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-[var(--overlay-hover)]"
                  >
                    <span className="w-20 shrink-0 font-mono text-[11px] font-bold text-slate-400">
                      {t.ticket_key}
                    </span>
                    <span className="flex-1 truncate text-[13px] font-medium text-slate-300">
                      {t.title}
                    </span>
                    {prio && (
                      <span
                        className="hidden shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold sm:inline"
                        style={{ backgroundColor: prio.bg, color: prio.text }}
                      >
                        {prio.label}
                      </span>
                    )}
                    {t.status_name && (
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: (t.status_color || '#64748b') + '20',
                          color: t.status_color || '#94a3b8',
                        }}
                      >
                        {t.status_name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="pt-4 pb-8 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-600">
            Powered by <span className="font-semibold text-slate-500">Bah!Flow</span>
          </p>
        </footer>
      </main>
    </div>
  );
}
