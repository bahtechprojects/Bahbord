'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils/cn';
import { Calendar, MessageSquare, Paperclip, CheckSquare } from 'lucide-react';
import { useBoardShell } from './BoardShell';
import TicketTypeIcon from '@/components/ui/TicketTypeIcon';

const priorityConfig: Record<string, { dot: string; border: string; label: string }> = {
  urgent: { dot: 'bg-red-500 shadow-red-500/40 shadow-sm', border: 'border-l-red-500', label: 'Urgente' },
  high: { dot: 'bg-orange-400 shadow-orange-400/30 shadow-sm', border: 'border-l-orange-400', label: 'Alta' },
  medium: { dot: 'bg-blue-400', border: 'border-l-blue-400', label: 'Média' },
  low: { dot: 'bg-slate-500', border: 'border-l-slate-600', label: 'Baixa' }
};

const serviceStyles: Record<string, { bg: string; text: string }> = {
  BAHTECH: { bg: 'bg-sky-500/8', text: 'text-sky-400' },
  BAHVITRINE: { bg: 'bg-emerald-500/8', text: 'text-emerald-400' },
  BAHSAUDE: { bg: 'bg-green-500/8', text: 'text-green-400' },
  BAHCOUNT: { bg: 'bg-amber-500/8', text: 'text-amber-400' },
  BAHFLASH: { bg: 'bg-rose-500/8', text: 'text-rose-400' },
  BAHPROJECT: { bg: 'bg-indigo-500/8', text: 'text-indigo-400' },
  LOVATTOFIT: { bg: 'bg-violet-500/8', text: 'text-violet-400' },
  EQUINOX: { bg: 'bg-yellow-500/8', text: 'text-yellow-400' }
};

function getServiceStyle(service: string) {
  const upper = service.toUpperCase();
  for (const [key, val] of Object.entries(serviceStyles)) {
    if (upper.includes(key)) return val;
  }
  return { bg: 'bg-slate-500/8', text: 'text-slate-400' };
}

// Gera cor consistente a partir do nome
function nameToColor(name: string): string {
  const colors = [
    'from-blue-600 to-blue-500',
    'from-violet-600 to-purple-500',
    'from-emerald-600 to-green-500',
    'from-amber-600 to-orange-500',
    'from-rose-600 to-pink-500',
    'from-cyan-600 to-teal-500',
    'from-indigo-600 to-blue-500',
    'from-fuchsia-600 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface TicketCardProps {
  id: string;
  title: string;
  service: string;
  due: string;
  assignee: string;
  priority: string;
  ticketKey: string;
  typeIcon: string;
  active: boolean;
  onClick: () => void;
}

export default function TicketCard({ id, title, service, due, assignee, priority, ticketKey, typeIcon, active, onClick }: TicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { openTicket } = useBoardShell();

  const prio = priorityConfig[priority] || priorityConfig.medium;
  const hasAssignee = assignee && assignee !== 'Sem responsável';
  const initials = hasAssignee
    ? assignee.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : null;
  const hasService = service && service !== 'Sem serviço';
  const hasDue = due && due !== '-';
  const svc = hasService ? getServiceStyle(service) : null;

  function handleClick() {
    if (isDragging) return;
    openTicket(id);
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer rounded-lg border border-white/[0.05] bg-[#232730] transition-all duration-200',
        'hover:border-white/[0.12] hover:bg-[#282d37] hover:shadow-lg hover:shadow-black/20',
        'border-l-[3px]',
        prio.border,
        isDragging && 'opacity-30 rotate-2 scale-105',
        active && 'ring-2 ring-blue-500/30 border-blue-500/20'
      )}
    >
      <div className="px-3.5 py-3">
        {/* Row 1: Type icon + Key + Priority dot */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TicketTypeIcon typeIcon={typeIcon} size="sm" />
            <span className="font-mono text-[11px] font-semibold tracking-wide text-slate-500">
              {ticketKey}
            </span>
          </div>
          <div className={cn('h-2 w-2 rounded-full', prio.dot)} title={prio.label} />
        </div>

        {/* Row 2: Title */}
        <h3 className="mb-3 text-[13px] font-medium leading-[1.5] text-[#d4d7dc] line-clamp-2 group-hover:text-white transition-colors">
          {title}
        </h3>

        {/* Row 3: Service badge */}
        {hasService && svc && (
          <div className="mb-3">
            <span className={cn(
              'inline-flex items-center rounded px-2 py-[3px] text-[10px] font-semibold tracking-wide',
              svc.bg, svc.text
            )}>
              {service}
            </span>
          </div>
        )}

        {/* Row 4: Footer — metadata + avatar */}
        <div className="flex items-center justify-between">
          {/* Left: date + counters */}
          <div className="flex items-center gap-2.5">
            {hasDue && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Calendar size={11} strokeWidth={1.5} />
                <span>{due}</span>
              </div>
            )}
          </div>

          {/* Right: Avatar */}
          {initials && (
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white shadow-sm',
                nameToColor(assignee)
              )}
              title={assignee}
            >
              {initials}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
