"use client";

import { GripVertical, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { KpiCard } from "@/components/ui/kpi-card";
import { cn } from "@/lib/utils";

export type KpiTile = {
  /** Key estable para persistir orden (ej. "cash", "inversion", "inventario") */
  id: string;
  label: string;
  value: string | number;
  sub?: string;
  unit?: string;
  href: string;
  accent?: "brand" | "ok" | "warn" | "danger";
};

/**
 * Grid de KPIs draggables + clickables.
 * - Arrastra desde el handle (≡) para reordenar
 * - Click en el cuerpo para navegar al href
 * - Orden persiste en localStorage por `storageKey`
 */
export function DraggableKpiGrid({
  tiles,
  storageKey = "dashboard-kpi-order",
  columns = 4,
}: {
  tiles: KpiTile[];
  storageKey?: string;
  columns?: number;
}) {
  const [order, setOrder] = useState<string[]>(() => tiles.map((t) => t.id));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Cargar orden guardado en localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[];
        // Asegurar que todos los IDs actuales existan; añadir nuevos al final
        const validOrder = parsed.filter((id) =>
          tiles.some((t) => t.id === id),
        );
        const newIds = tiles
          .map((t) => t.id)
          .filter((id) => !validOrder.includes(id));
        setOrder([...validOrder, ...newIds]);
      } catch {
        setOrder(tiles.map((t) => t.id));
      }
    }
    setHydrated(true);
  }, [storageKey, tiles]);

  const persistOrder = (newOrder: string[]) => {
    setOrder(newOrder);
    localStorage.setItem(storageKey, JSON.stringify(newOrder));
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };

  const onDragLeave = () => {
    setDragOverId(null);
  };

  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    setDragId(null);
    const sourceId = e.dataTransfer.getData("text/plain");
    if (!sourceId || sourceId === targetId) return;

    const newOrder = [...order];
    const sourceIdx = newOrder.indexOf(sourceId);
    const targetIdx = newOrder.indexOf(targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    newOrder.splice(sourceIdx, 1);
    newOrder.splice(targetIdx, 0, sourceId);
    persistOrder(newOrder);
  };

  const onDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  const onReset = () => {
    const original = tiles.map((t) => t.id);
    persistOrder(original);
  };

  const tilesById = new Map(tiles.map((t) => [t.id, t]));
  const ordered = order
    .map((id) => tilesById.get(id))
    .filter((t): t is KpiTile => Boolean(t));

  // Antes de hidratar, render igual al server (orden inicial)
  const display = hydrated ? ordered : tiles;

  const reordered =
    hydrated && JSON.stringify(order) !== JSON.stringify(tiles.map((t) => t.id));

  const gridCols =
    columns === 6
      ? "lg:grid-cols-6"
      : columns === 5
        ? "lg:grid-cols-5"
        : columns === 3
          ? "lg:grid-cols-3"
          : "lg:grid-cols-4";

  return (
    <div className="relative">
      {reordered && (
        <button
          type="button"
          onClick={onReset}
          className="absolute -top-7 right-0 inline-flex items-center gap-1 text-[11px] text-ink-3 hover:text-ink-1"
          title="Restaurar orden original"
        >
          <RotateCcw className="h-3 w-3" />
          Restaurar orden
        </button>
      )}
      <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2", gridCols)}>
        {display.map((tile) => {
          const isDragging = dragId === tile.id;
          const isOver = dragOverId === tile.id && dragId !== tile.id;
          return (
            <div
              key={tile.id}
              draggable
              onDragStart={(e) => onDragStart(e, tile.id)}
              onDragOver={(e) => onDragOver(e, tile.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, tile.id)}
              onDragEnd={onDragEnd}
              className={cn(
                "group relative cursor-grab transition active:cursor-grabbing",
                isDragging && "opacity-40",
                isOver && "scale-[1.02] ring-2 ring-brand ring-offset-2 ring-offset-bg-2 rounded-md",
              )}
            >
              <Link
                href={tile.href}
                className="block transition hover:-translate-y-0.5"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              >
                <KpiCard
                  label={tile.label}
                  value={tile.value}
                  unit={tile.unit}
                  sub={tile.sub}
                  accent={tile.accent}
                />
              </Link>
              {/* Drag handle visible solo on hover, esquina sup-der */}
              <div
                className="pointer-events-none absolute right-2 top-2 rounded bg-card/80 p-0.5 opacity-0 transition group-hover:opacity-100"
                title="Arrastra para reordenar"
              >
                <GripVertical className="h-3 w-3 text-ink-3" />
              </div>
            </div>
          );
        })}
      </div>
      {hydrated && (
        <p className="mt-2 text-[10.5px] text-ink-4">
          💡 Arrastra los KPIs para reordenarlos · click en cualquiera para ver
          su detalle
        </p>
      )}
    </div>
  );
}
