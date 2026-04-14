'use client';

import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils/cn';
import TicketCard from './TicketCard';
import { Plus } from 'lucide-react';

interface ColumnCard {
  id: string;
  title: string;
  service: string;
  due: string;
  assignee: string;
  priority: string;
  ticketKey: string;
  typeIcon: string;
}

interface ColumnProps {
  id: string;
  title: string;
  color: string;
  cards: ColumnCard[];
  activeItemId: string | null;
  onSelectCard: (id: string) => void;
}

const columnAccents: Record<string, string> = {
  todo: 'bg-slate-400',
  waiting: 'bg-amber-400',
  progress: 'bg-blue-500',
  done: 'bg-emerald-500',
};

export default function KanbanColumn({ id, title, color, cards, activeItemId, onSelectCard }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const accent = columnAccents[id] || color;

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'flex min-h-0 flex-col rounded-xl transition-all duration-200',
        isOver && 'bg-blue-500/[0.04] ring-1 ring-blue-500/10 ring-inset'
      )}
    >
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between px-1.5">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-2.5 w-2.5 rounded-[3px]', accent)} />
          <span className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-white/[0.04] px-1 text-[10px] font-bold tabular-nums text-slate-500">
            {cards.length}
          </span>
        </div>
        <button className="rounded-md p-0.5 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:bg-white/[0.06] hover:text-slate-400">
          <Plus size={14} />
        </button>
      </div>

      {/* Cards */}
      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-0.5">
          {cards.map((card) => (
            <TicketCard
              key={card.id}
              {...card}
              active={activeItemId === card.id}
              onClick={() => onSelectCard(card.id)}
            />
          ))}
          {cards.length === 0 && (
            <div className={cn(
              'flex h-24 items-center justify-center rounded-lg border border-dashed text-[11px] transition-all',
              isOver
                ? 'border-blue-500/30 bg-blue-500/[0.04] text-blue-400'
                : 'border-white/[0.04] text-slate-600'
            )}>
              {isOver ? 'Soltar aqui' : 'Sem tickets'}
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
