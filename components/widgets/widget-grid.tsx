"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings2 } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  CATALOGO_WIDGETS,
  type WidgetLayout,
  type WidgetTamaño,
  widgetPorId,
} from "@/lib/widgets/catalogo";

import { WidgetCard } from "./widget-card";

type RenderWidget = (widgetId: string) => ReactNode;

export function WidgetGrid({
  pagina,
  layoutInicial,
  renderWidget,
  onSave,
}: {
  pagina: "mi-dia" | "dashboard";
  layoutInicial: WidgetLayout;
  renderWidget: RenderWidget;
  onSave: (layout: WidgetLayout) => Promise<{ ok: boolean; error: string | null }>;
}) {
  const [layout, setLayout] = useState<WidgetLayout>(layoutInicial);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibles = layout.filter((l) => l.visible).sort((a, b) => a.orden - b.orden);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibles.findIndex((v) => v.widget_id === active.id);
    const newIndex = visibles.findIndex((v) => v.widget_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(visibles, oldIndex, newIndex).map((entry, i) => ({
      ...entry,
      orden: i,
    }));
    const ocultos = layout.filter((l) => !l.visible);
    const nuevo = [...reordered, ...ocultos];
    setLayout(nuevo);
    startTransition(async () => {
      await onSave(nuevo);
    });
  }

  function ocultarWidget(widgetId: string) {
    const nuevo = layout.map((l) =>
      l.widget_id === widgetId ? { ...l, visible: false } : l,
    );
    setLayout(nuevo);
    startTransition(async () => {
      await onSave(nuevo);
    });
  }

  function mostrarWidget(widgetId: string, tamaño: WidgetTamaño) {
    const existing = layout.find((l) => l.widget_id === widgetId);
    let nuevo: WidgetLayout;
    if (existing) {
      nuevo = layout.map((l) =>
        l.widget_id === widgetId
          ? { ...l, visible: true, orden: visibles.length, tamaño }
          : l,
      );
    } else {
      nuevo = [
        ...layout,
        {
          widget_id: widgetId,
          orden: visibles.length,
          visible: true,
          tamaño,
        },
      ];
    }
    setLayout(nuevo);
    startTransition(async () => {
      await onSave(nuevo);
    });
  }

  const disponibles = CATALOGO_WIDGETS.filter(
    (w) => w.pagina === pagina || w.pagina === "ambas",
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing((e) => !e)}>
          <Settings2 className="h-3.5 w-3.5" />
          {editing ? "Listo" : "Personalizar"}
        </Button>
        {editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPickerOpen(true)}
            className="ml-2"
          >
            + Agregar widget
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibles.map((v) => v.widget_id)} strategy={rectSortingStrategy}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibles.map((entry) => {
              const meta = widgetPorId(entry.widget_id);
              if (!meta) return null;
              return (
                <SortableWidget key={entry.widget_id} id={entry.widget_id} editing={editing}>
                  <WidgetCard
                    titulo={meta.nombre}
                    descripcion={editing ? meta.descripcion : undefined}
                    tamaño={entry.tamaño}
                    draggable={editing}
                    onOcultar={editing ? () => ocultarWidget(entry.widget_id) : undefined}
                  >
                    {renderWidget(entry.widget_id)}
                  </WidgetCard>
                </SortableWidget>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-6"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-semibold">Agregar widget</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {disponibles.map((w) => {
                const visible = layout.some(
                  (l) => l.widget_id === w.id && l.visible,
                );
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={visible}
                    onClick={() => mostrarWidget(w.id, w.tamañoDefault)}
                    className="rounded-md border border-border bg-bg-2/40 p-3 text-left text-sm hover:bg-bg-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <p className="font-medium">{w.nombre}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">{w.descripcion}</p>
                    {visible && (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">
                        Ya visible
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setPickerOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      {pending && (
        <p className="mt-4 text-center text-[11px] text-ink-3">Guardando…</p>
      )}
    </div>
  );
}

function SortableWidget({
  id,
  children,
  editing,
}: {
  id: string;
  children: ReactNode;
  editing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !editing,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="contents">
      {children}
    </div>
  );
}
