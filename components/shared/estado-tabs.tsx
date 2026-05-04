"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

type Tab = {
  key: "activo" | "inactivo" | "archivado" | "todos";
  label: string;
  count?: number;
};

const DEFAULT_TABS: Tab[] = [
  { key: "activo", label: "Activos" },
  { key: "inactivo", label: "Inactivos" },
  { key: "archivado", label: "Archivados" },
  { key: "todos", label: "Todos" },
];

/**
 * Tabs para filtrar por estado de archivado (clientes, proveedores, etc.).
 *
 * Lee `?estado=...` del URL. Default "activo". Tab "todos" elimina el param.
 */
export function EstadoTabs({
  current,
  counts,
  basePath,
}: {
  current: string;
  counts?: Partial<Record<Tab["key"], number>>;
  /** Path base; si no se pasa se usa el path actual (preserva otros params). */
  basePath?: string;
}) {
  const sp = useSearchParams();
  const tabs = DEFAULT_TABS.map((t) => ({
    ...t,
    count: counts?.[t.key],
  }));
  const active = current || "activo";

  const hrefFor = (key: Tab["key"]) => {
    const next = new URLSearchParams(sp?.toString() ?? "");
    next.delete("page");
    if (key === "todos") {
      next.delete("estado");
    } else {
      next.set("estado", key);
    }
    const qs = next.toString();
    const base = basePath ?? "";
    return qs ? `${base}?${qs}` : base || "?";
  };

  return (
    <nav
      aria-label="Filtrar por estado"
      className="mb-3 flex flex-wrap items-center gap-1 border-b border-border"
    >
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-medium transition-colors",
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-ink-3 hover:border-divider hover:text-ink-1",
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-mono text-[10px]",
                  isActive ? "bg-brand/10 text-brand" : "bg-bg-2 text-ink-3",
                )}
              >
                {t.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
