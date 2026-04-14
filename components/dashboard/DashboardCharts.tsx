'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, ResponsiveContainer } from 'recharts';
import { Package } from 'lucide-react';

interface ChartData {
  name: string;
  color: string;
  value: number;
}

interface TypeChartData extends ChartData {
  last_30d: number;
  last_7d: number;
}

interface DashboardChartsProps {
  byStatus: ChartData[];
  byService: ChartData[];
  byPriority: ChartData[];
  byType: TypeChartData[];
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border/40 bg-surface2 px-3 py-1.5 text-xs shadow-lg">
      <span className="text-slate-300">{payload[0].payload.name}: </span>
      <span className="font-semibold text-white">{payload[0].value}</span>
    </div>
  );
}

type PeriodFilter = '7d' | '30d' | 'all';

export default function DashboardCharts({ byStatus, byService, byPriority, byType }: DashboardChartsProps) {
  const [typePeriod, setTypePeriod] = useState<PeriodFilter>('all');
  const filteredByType = byType.map((t) => ({
    ...t,
    value: typePeriod === '7d' ? t.last_7d : typePeriod === '30d' ? t.last_30d : t.value,
  })).filter((t) => t.value > 0);

  const totalDelivered = filteredByType.reduce((sum, t) => sum + t.value, 0);

  return (
    <>
    {/* Entregas por tipo de ticket */}
    <div className="rounded-lg border border-border/40 bg-surface2 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Package size={13} />
          Entregas por tipo de ticket
        </h3>
        <div className="flex gap-1 rounded-md bg-surface p-0.5">
          {([['7d', '7 dias'], ['30d', '30 dias'], ['all', 'Todos']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTypePeriod(key)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                typePeriod === key
                  ? 'bg-accent text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredByType.length > 0 ? (
        <>
          {/* Summary cards */}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {filteredByType.slice(0, 8).map((t) => (
              <div
                key={t.name}
                className="flex items-center gap-2.5 rounded-md border border-border/30 bg-surface px-3 py-2"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-slate-300">{t.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="font-semibold text-white">{t.value}</span>
                    {typePeriod === 'all' && (
                      <>
                        <span>30d: {t.last_30d}</span>
                        <span>7d: {t.last_7d}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pie chart */}
          <div className="flex items-center">
            <ResponsiveContainer width="40%" height={180}>
              <PieChart>
                <Pie
                  data={filteredByType}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={2}
                  stroke="none"
                >
                  {filteredByType.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-1 flex-col gap-1.5">
              {filteredByType.map((t) => {
                const pct = totalDelivered > 0 ? ((t.value / totalDelivered) * 100).toFixed(0) : 0;
                return (
                  <div key={t.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="truncate text-[10px] text-slate-400">{t.name}</span>
                    <span className="ml-auto text-[10px] font-medium text-slate-300">{t.value}</span>
                    <span className="text-[10px] text-slate-600">({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-xs text-slate-600">Sem entregas no período selecionado</p>
      )}
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      {/* Por Status - Bar chart */}
      <div className="rounded-lg border border-border/40 bg-surface2 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tickets por status
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={byStatus} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#969896', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#969896', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(55,59,65,0.3)' }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {byStatus.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Por Serviço - Pie chart */}
      <div className="rounded-lg border border-border/40 bg-surface2 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tickets por serviço
        </h3>
        <div className="flex items-center">
          <ResponsiveContainer width="50%" height={180}>
            <PieChart>
              <Pie
                data={byService}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                paddingAngle={2}
                stroke="none"
              >
                {byService.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-1 flex-col gap-1.5">
            {byService.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="truncate text-[10px] text-slate-400">{s.name}</span>
                <span className="ml-auto text-[10px] font-medium text-slate-300">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Por Prioridade - Horizontal bar */}
      <div className="rounded-lg border border-border/40 bg-surface2 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tickets por prioridade
        </h3>
        <div className="space-y-2.5">
          {byPriority.map((p) => {
            const max = Math.max(...byPriority.map((x) => x.value), 1);
            const pct = (p.value / max) * 100;
            return (
              <div key={p.name}>
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                  <span className="text-[11px] font-medium text-slate-300">{p.value}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: p.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </>
  );
}
