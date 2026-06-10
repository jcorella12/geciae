"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type TabKey =
  | "resumen"
  | "tareas"
  | "solicitudes"
  | "costos"
  | "oc"
  | "etapas"
  | "documentos"
  | "equipo"
  | "bitacora"
  | "reportes";

export type TabConfig = {
  key: TabKey;
  label: string;
  count?: number;
  ready?: boolean;
};

export function ProyectoTabs({
  tabs,
  panels,
}: {
  tabs: TabConfig[];
  panels: Partial<Record<TabKey, ReactNode>>;
}) {
  // Tab inicial: si la URL trae ?tab=<key> y ese tab existe y está listo,
  // abrirlo directo. Permite que enlaces como /proyectos/X?tab=tareas o
  // ?tab=solicitudes aterricen en el panel correcto (deep-linking desde
  // widgets del dashboard). Cae al primer tab si el param es inválido.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabKey | null;
  const tabInicial =
    tabParam && tabs.some((t) => t.key === tabParam && t.ready !== false)
      ? tabParam
      : tabs[0].key;
  const [active, setActive] = useState<TabKey>(tabInicial);

  return (
    <>
      <nav
        className="mb-6 flex gap-1 border-b border-border-strong"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              disabled={tab.ready === false}
              onClick={() => setActive(tab.key)}
              className={cn(
                "relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-ink-3 hover:text-ink-1",
                tab.ready === false && "cursor-not-allowed opacity-50",
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px font-mono text-[10px] font-semibold",
                    isActive
                      ? "bg-brand text-brand-fg"
                      : "bg-bg-2 text-ink-2",
                  )}
                >
                  {tab.count}
                </span>
              )}
              {tab.ready === false && (
                <span className="rounded bg-bg-2 px-1 py-px font-mono text-[9px] text-ink-4">
                  pronto
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div role="tabpanel">{panels[active] ?? null}</div>
    </>
  );
}
