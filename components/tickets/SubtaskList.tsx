'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckSquare, Square } from 'lucide-react';
import { useSubtasks } from '@/lib/hooks/useSubtasks';
import { cn } from '@/lib/utils/cn';

interface SubtaskListProps {
  ticketId: string;
}

export default function SubtaskList({ ticketId }: SubtaskListProps) {
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask } = useSubtasks(ticketId);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const doneCount = subtasks.filter((s) => s.is_completed).length;
  const total = subtasks.length;
  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addSubtask(newTitle.trim());
    setNewTitle('');
  }

  return (
    <div>
      <h3 className="mb-2 text-[14px] font-semibold text-slate-200">
        Subtarefas
        {total > 0 && <span className="ml-1.5 text-[12px] font-normal text-slate-500">{doneCount}/{total}</span>}
      </h3>

      {total > 0 && (
        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="space-y-0.5">
        {subtasks.map((sub) => (
          <div key={sub.id} className="group flex items-center gap-2 rounded-md px-1 py-1.5 transition hover:bg-white/[0.03]">
            <button onClick={() => toggleSubtask(sub.id, !sub.is_completed)} className="shrink-0">
              {sub.is_completed ? (
                <CheckSquare size={16} className="text-emerald-500" />
              ) : (
                <Square size={16} className="text-slate-500 hover:text-blue-400" />
              )}
            </button>
            <span className={cn('flex-1 text-[13px]', sub.is_completed ? 'text-slate-600 line-through' : 'text-slate-300')}>
              {sub.title}
            </span>
            <button onClick={() => deleteSubtask(sub.id)} className="shrink-0 opacity-0 group-hover:opacity-100">
              <Trash2 size={13} className="text-slate-600 hover:text-red-400" />
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="mt-2 flex gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
            placeholder="Título da subtarefa"
            className="flex-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[13px] text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500/30"
          />
          <button type="submit" className="rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500">
            Adicionar
          </button>
        </form>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-1 text-[13px] text-slate-500 hover:text-blue-400 transition">
          Adicionar subtarefa
        </button>
      )}
    </div>
  );
}
