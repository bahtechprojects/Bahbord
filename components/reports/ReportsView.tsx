'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Printer, FileBarChart, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Project {
  id: string;
  name: string;
  color: string | null;
}

interface Summary {
  total: number;
  done: number;
  open: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

interface ReportsViewProps {
  projects: Project[];
}

const emptySummary: Summary = {
  total: 0, done: 0, open: 0, urgent: 0, high: 0, medium: 0, low: 0,
};

export default function ReportsView({ projects }: ReportsViewProps) {
  const [projectId, setProjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) || null,
    [projects, projectId]
  );

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (projectId) sp.set('project_id', projectId);
    if (startDate) sp.set('start_date', startDate);
    if (endDate) sp.set('end_date', endDate);
    return sp.toString();
  }, [projectId, startDate, endDate]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reports/tickets/summary${queryString ? `?${queryString}` : ''}`);
        if (!res.ok) {
          if (!cancelled) setSummary(emptySummary);
          return;
        }
        const data = await res.json();
        if (!cancelled) setSummary({ ...emptySummary, ...data });
      } catch {
        if (!cancelled) setSummary(emptySummary);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  function handleExportCSV() {
    const url = `/api/reports/tickets/csv${queryString ? `?${queryString}` : ''}`;
    window.location.href = url;
  }

  function handlePrint() {
    window.print();
  }

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const rangeLabel = startDate || endDate
    ? `${startDate ? formatDate(startDate) : '...'} — ${endDate ? formatDate(endDate) : '...'}`
    : 'Todo o período';

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <style jsx global>{`
        @media print {
          aside, header, nav { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <FileBarChart size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Relatórios</h1>
            <p className="mt-1 text-sm text-secondary">
              Exporte relatórios de tickets em CSV ou PDF para análise externa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded border border-border/40 bg-surface2 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/[0.12] hover:bg-white/[0.06]"
          >
            <Download size={15} />
            Exportar CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <Printer size={15} />
            Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Print header (only on paper) */}
      <div className="print-only mb-4">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Relatório de Tickets</h1>
        <p style={{ fontSize: 13, color: '#444' }}>
          {selectedProject ? `Projeto: ${selectedProject.name}` : 'Todos os projetos'} · Período: {rangeLabel}
        </p>
        <p style={{ fontSize: 11, color: '#888' }}>
          Gerado em {new Date().toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border/40 bg-surface2 p-5 no-print">
        <h2 className="mb-4 text-sm font-semibold text-primary">Filtros</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Projeto</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full rounded border border-border/40 bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent/60"
            >
              <option value="">Todos os projetos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Data inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded border border-border/40 bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent/60"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Data final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded border border-border/40 bg-surface px-3 py-2 text-sm text-slate-200 outline-none focus:border-accent/60"
            />
          </div>
        </div>
        {(projectId || startDate || endDate) && (
          <div className="mt-3 flex items-center justify-between text-xs text-secondary">
            <span>
              Mostrando: {selectedProject ? selectedProject.name : 'Todos os projetos'} · {rangeLabel}
            </span>
            <button
              onClick={() => { setProjectId(''); setStartDate(''); setEndDate(''); }}
              className="text-slate-500 hover:text-slate-300"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Tickets no período"
          value={summary.total}
          icon={FileBarChart}
          color="text-accent"
          bg="bg-accent/10"
          loading={loading}
        />
        <SummaryCard
          label="Concluídos"
          value={summary.done}
          icon={CheckCircle2}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
          loading={loading}
        />
        <SummaryCard
          label="Em aberto"
          value={summary.open}
          icon={Clock}
          color="text-amber-400"
          bg="bg-amber-500/10"
          loading={loading}
        />
        <SummaryCard
          label="Urgentes"
          value={summary.urgent}
          icon={AlertTriangle}
          color="text-rose-400"
          bg="bg-rose-500/10"
          loading={loading}
        />
      </div>

      {/* Priority breakdown */}
      <div className="rounded-lg border border-border/40 bg-surface2 p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary">Por prioridade</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <PriorityRow label="Urgente" value={summary.urgent} total={summary.total} colorClass="bg-rose-500" />
          <PriorityRow label="Alta" value={summary.high} total={summary.total} colorClass="bg-orange-500" />
          <PriorityRow label="Média" value={summary.medium} total={summary.total} colorClass="bg-yellow-500" />
          <PriorityRow label="Baixa" value={summary.low} total={summary.total} colorClass="bg-sky-500" />
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-xs text-secondary no-print">
        Dica: o CSV é gerado com base nos filtros atuais. Use "Imprimir / PDF" para gerar um PDF a partir do diálogo de impressão do navegador.
      </p>
    </div>
  );
}

function SummaryCard({
  label, value, icon: Icon, color, bg, loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-surface2 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', bg)}>
          <Icon size={16} className={color} />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold text-primary">
        {loading ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-white/[0.06]" /> : value}
      </div>
    </div>
  );
}

function PriorityRow({
  label, value, total, colorClass,
}: {
  label: string;
  value: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-slate-300">{label}</span>
        <span className="text-[11px] text-slate-500">{value} · {pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className={cn('h-full rounded-full transition-all', colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
