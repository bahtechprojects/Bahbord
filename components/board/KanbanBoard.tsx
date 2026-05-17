'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import TicketCard from './TicketCard';
import BoardFilters from './BoardFilters';
import BulkActionBar from './BulkActionBar';
import EmptyState from '@/components/ui/EmptyState';
import { useBoardShell } from './BoardShell';
import { useBoard, type BoardItems } from '@/lib/hooks/useBoard';

export type { TicketItem, BoardItems } from '@/lib/hooks/useBoard';

export type BoardColumn = { id: string; title: string; color: string; isDone?: boolean };

interface KanbanBoardProps {
  initialItems: BoardItems;
  columns: BoardColumn[];
  wipLimits?: Record<string, number | null>;
  availableProjects?: { id: string; name: string }[];
}

export default function KanbanBoard({ initialItems, columns, wipLimits = {}, availableProjects = [] }: KanbanBoardProps) {
  const {
    items,
    selectedCard,
    setSelectedCard,
    filters,
    setFilters,
    filterTickets,
    handleDragStart: handleCardDragStart,
    handleDragOver: handleCardDragOver,
    handleDragEnd: handleCardDragEnd,
    allTickets,
    overdueCount,
  } = useBoard(initialItems, wipLimits);

  const [orderedColumns, setOrderedColumns] = useState(columns);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);

  // Sync columns when server data changes
  useEffect(() => {
    setOrderedColumns(columns);
  }, [columns]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { createInColumn } = useBoardShell();

  // Detect if a drag involves a column (id matches a column id)
  const isColumnDrag = useCallback((id: string) => {
    return orderedColumns.some((col) => col.id === id);
  }, [orderedColumns]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = event.active.id as string;
    if (event.active.data.current?.type === 'column') {
      setDraggingColumnId(activeId);
    } else {
      handleCardDragStart(event);
    }
  }, [handleCardDragStart]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (draggingColumnId) return; // Column drag doesn't need dragOver
    handleCardDragOver(event);
  }, [draggingColumnId, handleCardDragOver]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (draggingColumnId) {
      setDraggingColumnId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = orderedColumns.findIndex((col) => col.id === active.id);
      const newIndex = orderedColumns.findIndex((col) => col.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(orderedColumns, oldIndex, newIndex);
      setOrderedColumns(reordered);

      // Persist new positions to API
      try {
        await Promise.all(
          reordered.map((col, idx) =>
            fetch('/api/settings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ table: 'statuses', id: col.id, position: idx }),
            })
          )
        );
      } catch {
        // Revert on failure
        setOrderedColumns(orderedColumns);
      }
      return;
    }
    handleCardDragEnd(event);
  }, [draggingColumnId, orderedColumns, handleCardDragEnd]);

  // Bulk selection (Cmd/Ctrl+Click no card)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statuses, setStatuses] = useState<Array<{ id: string; name: string; color: string }>>([]);

  useEffect(() => {
    fetch('/api/options?type=statuses')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setStatuses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Esc limpa seleção
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds.size]);

  const availableServices = useMemo(() =>
    [...new Set(allTickets.map((t) => t.service).filter((s) => s !== 'Sem serviço'))],
    [allTickets]
  );

  const availableAssignees = useMemo(() =>
    [...new Set(allTickets.map((t) => t.assignee).filter((a) => a !== 'Sem responsável'))],
    [allTickets]
  );

  const availableTypes = useMemo(() => {
    const seen = new Set<string>();
    return allTickets
      .filter((t) => {
        if (seen.has(t.typeIcon)) return false;
        seen.add(t.typeIcon);
        return true;
      })
      .map((t) => ({ icon: t.typeIcon, name: t.typeIcon }));
  }, [allTickets]);

  // Encontrar o card sendo arrastado para o overlay
  const activeCard = selectedCard
    ? allTickets.find((t) => t.id === selectedCard)
    : null;

  const hasAnyTickets = allTickets.length > 0;
  const hasActiveFilters =
    !!filters.search ||
    filters.services.length > 0 ||
    filters.assignees.length > 0 ||
    filters.types.length > 0 ||
    filters.priorities.length > 0 ||
    filters.projects.length > 0 ||
    !!filters.onlyOverdue;

  return (
    <div className="flex h-full flex-col">
      <BoardFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableServices={availableServices}
        availableAssignees={availableAssignees}
        availableTypes={availableTypes}
        availableProjects={availableProjects}
        overdueCount={overdueCount}
      />

      {!hasAnyTickets && !hasActiveFilters ? (
        <EmptyState
          illustration="tickets"
          title="Nenhum ticket aqui ainda"
          description="Crie o primeiro ticket pra começar a organizar o trabalho do board."
          actions={[
            { label: 'Novo ticket', onClick: () => createInColumn(columns[0]?.id ?? ''), variant: 'primary' },
          ]}
        />
      ) : (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        autoScroll={{
          enabled: true,
          threshold: { x: 0.15, y: 0.25 },
          acceleration: 12,
          interval: 5,
        }}
      >
        <SortableContext items={orderedColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
          {/* Mobile: scroll horizontal com snap; Desktop: layout natural */}
          <div className="flex gap-3 pb-2 overflow-x-auto snap-x snap-mandatory md:snap-none -mx-2 px-2 sm:mx-0 sm:px-0">
            {orderedColumns.map((column) => (
              <div key={column.id} className="w-[85vw] max-w-[280px] sm:w-[260px] shrink-0 snap-start">
                <KanbanColumn
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  cards={filterTickets(items[column.id] ?? [])}
                  activeItemId={selectedCard}
                  onSelectCard={setSelectedCard}
                  wipLimit={wipLimits[column.id] ?? null}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  sortableColumn
                />
              </div>
            ))}
          </div>
        </SortableContext>

        {/* Drag overlay — mostra uma cópia fluida do card durante o arraste */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {draggingColumnId ? (
            <div className="w-[260px] rounded-lg border border-[var(--card-border)] bg-[var(--bg-primary)] p-3 opacity-90 shadow-lg">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-muted">
                {orderedColumns.find((c) => c.id === draggingColumnId)?.title}
              </span>
            </div>
          ) : activeCard ? (
            <div className="w-[220px] rotate-2 opacity-90">
              <TicketCard
                {...activeCard}
                active={false}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {/* Floating bulk action bar */}
      <BulkActionBar
        selectedIds={Array.from(selectedIds)}
        onClear={() => setSelectedIds(new Set())}
        statuses={statuses}
      />
    </div>
  );
}
