"use client";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition, type ReactNode } from "react";

export type KanbanItem = {
  id: string;
  columnId: string;
};

export type KanbanColumn = {
  id: string;
  titulo: string;
  color?: string;
};

export function KanbanBoard<T extends KanbanItem>({
  columns,
  items,
  renderItem,
  onMove,
}: {
  columns: KanbanColumn[];
  items: T[];
  renderItem: (item: T) => ReactNode;
  onMove: (itemId: string, fromColumn: string, toColumn: string) => Promise<void>;
}) {
  const [list, setList] = useState(items);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeItem = list.find((i) => i.id === active.id);
    if (!activeItem) return;

    // Si over.id es un id de columna (droppable), mover a esa columna
    const targetColumnId = columns.find((c) => c.id === over.id)?.id ?? list.find((i) => i.id === over.id)?.columnId;
    if (!targetColumnId || targetColumnId === activeItem.columnId) return;

    const updated = list.map((i) =>
      i.id === active.id ? { ...i, columnId: targetColumnId } : i,
    );
    setList(updated);
    startTransition(async () => {
      await onMove(active.id as string, activeItem.columnId, targetColumnId);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(220px, 1fr))` }}>
        {columns.map((col) => {
          const colItems = list.filter((i) => i.columnId === col.id);
          return (
            <KanbanColumn key={col.id} column={col} count={colItems.length}>
              <SortableContext items={colItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 p-2 min-h-[60px]">
                  {colItems.map((item) => (
                    <KanbanCard key={item.id} id={item.id}>
                      {renderItem(item)}
                    </KanbanCard>
                  ))}
                  {colItems.length === 0 && (
                    <p className="text-center text-[11px] text-ink-3 py-8">Sin tareas</p>
                  )}
                </div>
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  count,
  children,
}: {
  column: KanbanColumn;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-md border bg-bg-2/40 ${isOver ? "border-brand bg-brand/5" : "border-border"}`}
    >
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wide">{column.titulo}</h3>
        <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10px] text-ink-3">{count}</span>
      </div>
      {children}
    </div>
  );
}

function KanbanCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-md border border-border bg-card p-2 text-[12px] shadow-sm hover:bg-bg-2 active:cursor-grabbing"
    >
      {children}
    </div>
  );
}
