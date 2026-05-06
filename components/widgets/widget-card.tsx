"use client";

import { GripVertical, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function WidgetCard({
  titulo,
  descripcion,
  tamaño = "medium",
  draggable = false,
  dragHandleProps,
  onOcultar,
  children,
}: {
  titulo: string;
  descripcion?: string;
  tamaño?: "small" | "medium" | "large";
  draggable?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onOcultar?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        tamaño === "small" && "col-span-1",
        tamaño === "medium" && "col-span-1 md:col-span-2",
        tamaño === "large" && "col-span-full",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {draggable && (
            <button
              type="button"
              {...dragHandleProps}
              className="cursor-grab text-ink-3 hover:text-ink-1 active:cursor-grabbing"
              aria-label="Mover widget"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <div>
            <h3 className="text-[13px] font-semibold leading-tight">{titulo}</h3>
            {descripcion && (
              <p className="text-[10.5px] text-ink-3">{descripcion}</p>
            )}
          </div>
        </div>
        {onOcultar && (
          <button
            type="button"
            onClick={onOcultar}
            className="text-ink-3 hover:text-ink-1"
            aria-label="Ocultar widget"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
