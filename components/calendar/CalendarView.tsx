'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, Filter, CalendarDays, Zap } from 'lucide-react';
import TicketTypeIcon from '@/components/ui/TicketTypeIcon';
import TicketDetailModal from '@/components/tickets/TicketDetailModal';
import { cn } from '@/lib/utils/cn';

// ─── Types ───────────────────────────────────────────────────────────
interface CalTicket {
  id: string;
  ticket_key: string;
  title: string;
  priority: string;
  type_icon: string;
  status_name: string;
  status_color: string;
  is_done: boolean;
  service_name: string | null;
  service_color: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  sprint_id: string | null;
  sprint_name: string | null;
  due_date: string | null;
  project_id: string | null;
  project_name: string | null;
  project_prefix: string | null;
}

interface CalSprint {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  is_completed: boolean;
  project_id: string | null;
}

interface CalendarViewProps {
  year: number;
  monthIdx: number; // 0..11
  tickets: CalTicket[];
  sprints: CalSprint[];
  boardId: string | null;
  assigneeId: string | null;
}

interface AssigneeOpt {
  id: string;
  display_name: string;
  avatar_url?: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const PRIORITY_DOTS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#60a5fa',
};

// ─── Helpers ─────────────────────────────────────────────────────────
function pad(n: number): string { return n < 10 ? `0${n}` : `${n}`; }

function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseYmd(s: string): Date {
  // Parse YYYY-MM-DD as a *local* date (no timezone shift surprises)
  const [y, m, d] = s.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Component ───────────────────────────────────────────────────────
export default function CalendarView({
  year, monthIdx, tickets, sprints, boardId, assigneeId,
}: CalendarViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openDay, setOpenDay] = useState<Date | null>(null);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOpt[]>([]);

  const today = useMemo(() => new Date(), []);

  // Load assignee options (only when we have a board context, otherwise leave empty)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = boardId
          ? `/api/members/by-access?board_id=${boardId}`
          : `/api/members/by-access`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list: AssigneeOpt[] = Array.isArray(data) ? data : (data?.members || []);
        setAssignees(list);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [boardId]);

  // Build the 6x7 grid (weeks starting on Sunday)
  const grid = useMemo(() => {
    const firstOfMonth = new Date(year, monthIdx, 1);
    const startWeekday = firstOfMonth.getDay(); // 0..6 (Sun..Sat)
    const start = new Date(year, monthIdx, 1 - startWeekday);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return cells;
  }, [year, monthIdx]);

  // Index tickets and sprints by day key
  const ticketsByDay = useMemo(() => {
    const map = new Map<string, CalTicket[]>();
    for (const t of tickets) {
      if (!t.due_date) continue;
      const key = t.due_date.slice(0, 10);
      const arr = map.get(key) || [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tickets]);

  const sprintsByDay = useMemo(() => {
    const map = new Map<string, CalSprint[]>();
    for (const s of sprints) {
      if (!s.start_date || !s.end_date) continue;
      const start = parseYmd(s.start_date);
      const end = parseYmd(s.end_date);
      const cur = new Date(start);
      while (cur <= end) {
        const k = ymd(cur);
        const arr = map.get(k) || [];
        arr.push(s);
        map.set(k, arr);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [sprints]);

  function buildHref(opts: { year?: number; monthIdx?: number; assigneeId?: string | null }): string {
    const y = opts.year ?? year;
    const m = opts.monthIdx ?? monthIdx;
    const a = opts.assigneeId === undefined ? assigneeId : opts.assigneeId;
    const sp = new URLSearchParams();
    if (boardId) sp.set('board_id', boardId);
    sp.set('month', `${y}-${pad(m + 1)}`);
    if (a) sp.set('assignee_id', a);
    return `/calendar?${sp.toString()}`;
  }

  function navigate(dir: -1 | 1) {
    let newMonth = monthIdx + dir;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    if (newMonth > 11) { newMonth = 0; newYear += 1; }
    router.push(buildHref({ year: newYear, monthIdx: newMonth }) as any);
  }

  function onAssigneeChange(value: string) {
    router.push(buildHref({ assigneeId: value || null }) as any);
  }

  function gotoToday() {
    const t = new Date();
    router.push(buildHref({ year: t.getFullYear(), monthIdx: t.getMonth() }) as any);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="card-premium p-5 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="page-eyebrow">Workspace · Calendário</p>
              <h1 className="font-serif text-[28px] leading-tight text-primary">
                {MONTH_NAMES[monthIdx]} <span className="text-secondary italic font-normal">{year}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              aria-label="Mês anterior"
              className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2 text-secondary hover:text-primary hover:bg-white/[0.05] transition"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={gotoToday}
              className="rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px] text-secondary hover:text-primary hover:bg-white/[0.05] transition"
            >
              Hoje
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="Próximo mês"
              className="rounded-md border border-white/[0.06] bg-white/[0.02] p-2 text-secondary hover:text-primary hover:bg-white/[0.05] transition"
            >
              <ChevronRight size={15} />
            </button>

            <div className="ml-3 flex items-center gap-2">
              <Filter size={13} className="text-secondary" />
              <select
                value={assigneeId ?? ''}
                onChange={(e) => onAssigneeChange(e.target.value)}
                className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[12px] text-primary focus:outline-none focus:border-white/[0.15]"
              >
                <option value="">Todos os responsáveis</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>{a.display_name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="card-premium overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.02]">
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-secondary text-center">
              {w}
            </div>
          ))}
        </div>

        {/* 6 rows × 7 cols */}
        <div className="grid grid-cols-7 grid-rows-6">
          {grid.map((day, idx) => {
            const inMonth = day.getMonth() === monthIdx;
            const isToday = isSameDay(day, today);
            const key = ymd(day);
            const dayTickets = ticketsByDay.get(key) || [];
            const daySprints = sprintsByDay.get(key) || [];
            const items: Array<{ kind: 'ticket'; t: CalTicket } | { kind: 'sprint'; s: CalSprint }> = [
              ...daySprints.map((s) => ({ kind: 'sprint' as const, s })),
              ...dayTickets.map((t) => ({ kind: 'ticket' as const, t })),
            ];
            const visible = items.slice(0, 3);
            const overflow = items.length - visible.length;

            return (
              <button
                key={idx}
                onClick={() => setOpenDay(day)}
                className={cn(
                  'group relative min-h-[112px] border-b border-r border-white/[0.04] p-1.5 text-left transition hover:bg-white/[0.025]',
                  !inMonth && 'bg-black/10 opacity-50',
                  // Last column: no right border
                  (idx + 1) % 7 === 0 && 'border-r-0',
                  // Last row: no bottom border
                  idx >= 35 && 'border-b-0'
                )}
              >
                <div className="flex items-center justify-between mb-1 px-1">
                  <span
                    className={cn(
                      'text-[11.5px] font-medium tabular-nums',
                      isToday
                        ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white font-bold'
                        : inMonth ? 'text-primary' : 'text-secondary'
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {items.length > 0 && (
                    <span className="text-[9.5px] tabular-nums text-secondary font-mono">{items.length}</span>
                  )}
                </div>

                <div className="space-y-1">
                  {visible.map((item, i) => {
                    if (item.kind === 'sprint') {
                      const s = item.s;
                      return (
                        <div
                          key={`s-${s.id}-${i}`}
                          className="flex items-center gap-1 rounded px-1.5 py-[2px] text-[10px] truncate"
                          style={{
                            backgroundColor: 'rgba(139, 92, 246, 0.12)',
                            color: '#c4b5fd',
                          }}
                        >
                          <Zap size={9} />
                          <span className="truncate">{s.name}</span>
                        </div>
                      );
                    }
                    const t = item.t;
                    return (
                      <div
                        key={`t-${t.id}-${i}`}
                        onClick={(e) => { e.stopPropagation(); setOpenTicketId(t.id); }}
                        className={cn(
                          'flex items-center gap-1 rounded px-1.5 py-[2px] text-[10.5px] truncate cursor-pointer hover:brightness-110 transition',
                          t.is_done && 'opacity-60 line-through'
                        )}
                        style={{
                          backgroundColor: t.service_color ? `${t.service_color}1f` : 'rgba(255,255,255,0.05)',
                          color: t.service_color || '#cbd5e1',
                        }}
                        title={`${t.ticket_key} · ${t.title}`}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: PRIORITY_DOTS[t.priority] || '#64748b' }}
                        />
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="px-1.5 text-[10px] font-medium text-secondary">
                      +{overflow} mais
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day modal */}
      {openDay && (
        <DayModal
          day={openDay}
          tickets={ticketsByDay.get(ymd(openDay)) || []}
          sprints={sprintsByDay.get(ymd(openDay)) || []}
          onClose={() => setOpenDay(null)}
          onTicketClick={(id) => { setOpenDay(null); setOpenTicketId(id); }}
        />
      )}

      {/* Ticket detail modal */}
      {openTicketId && (
        <TicketDetailModal
          ticketId={openTicketId}
          onClose={() => setOpenTicketId(null)}
        />
      )}
    </div>
  );
}

// ─── Day modal ───────────────────────────────────────────────────────
function DayModal({
  day, tickets, sprints, onClose, onTicketClick,
}: {
  day: Date;
  tickets: CalTicket[];
  sprints: CalSprint[];
  onClose: () => void;
  onTicketClick: (id: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dateLabel = `${WEEKDAY_LABELS[day.getDay()]}, ${day.getDate()} de ${MONTH_NAMES[day.getMonth()].toLowerCase()} ${day.getFullYear()}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card-premium w-full max-w-[520px] max-h-[80vh] overflow-y-auto p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="page-eyebrow">Agenda do dia</p>
            <h2 className="font-serif text-[22px] text-primary">{dateLabel}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded p-1.5 text-secondary hover:bg-white/[0.06] hover:text-primary transition"
          >
            <X size={16} />
          </button>
        </div>

        {sprints.length === 0 && tickets.length === 0 && (
          <div className="rounded-md border border-dashed border-white/[0.08] p-6 text-center">
            <CalendarDays size={20} className="mx-auto text-secondary mb-2" />
            <p className="text-[12.5px] text-secondary">Nada agendado neste dia.</p>
          </div>
        )}

        {sprints.length > 0 && (
          <div className="mb-5">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-secondary mb-2">Sprints</div>
            <div className="space-y-1.5">
              {sprints.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <Zap size={13} className="text-violet-400 shrink-0" />
                  <span className="flex-1 text-[12.5px] text-primary truncate">{s.name}</span>
                  <span className="text-[10px] text-secondary tabular-nums">
                    {s.start_date?.slice(0, 10)} → {s.end_date?.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tickets.length > 0 && (
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-secondary mb-2">
              Tickets com prazo ({tickets.length})
            </div>
            <div className="space-y-1.5">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onTicketClick(t.id)}
                  className={cn(
                    'group flex w-full items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition hover:bg-white/[0.05] hover:border-white/[0.12]',
                    t.is_done && 'opacity-60'
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: PRIORITY_DOTS[t.priority] || '#64748b' }}
                  />
                  <TicketTypeIcon typeIcon={t.type_icon} size="sm" showBackground={false} />
                  <span className="font-mono text-[10px] text-secondary tabular-nums shrink-0">{t.ticket_key}</span>
                  <span className={cn('flex-1 text-[12.5px] text-primary truncate', t.is_done && 'line-through')}>{t.title}</span>
                  {t.assignee_name && (
                    <span className="text-[10.5px] text-secondary truncate max-w-[100px]">{t.assignee_name}</span>
                  )}
                  <span
                    className="rounded px-1.5 py-px text-[9.5px] font-medium shrink-0"
                    style={{
                      backgroundColor: t.status_color ? `${t.status_color}22` : 'rgba(255,255,255,0.05)',
                      color: t.status_color || '#cbd5e1',
                    }}
                  >
                    {t.status_name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
