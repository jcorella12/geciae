"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/finanzas/estados-gerenciales", label: "Resumen" },
  { href: "/finanzas/estados-gerenciales/balance", label: "Balance" },
  { href: "/finanzas/estados-gerenciales/resultados", label: "Resultados" },
  { href: "/finanzas/estados-gerenciales/flujo", label: "Flujo" },
];

// Tab de Vista Real (ajustes ocultos). Solo se muestra a quien puede ver
// ajustes gerenciales (directivo); el page además lo guarda por URL directa.
const TAB_VISTA_REAL = {
  href: "/finanzas/estados-gerenciales/vista-real",
  label: "Vista real",
};

export function TabsNav({
  puedeVerVistaReal = false,
}: {
  puedeVerVistaReal?: boolean;
}) {
  const pathname = usePathname();
  const tabs = puedeVerVistaReal ? [...TABS, TAB_VISTA_REAL] : TABS;
  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1480px] gap-1 px-6">
        {tabs.map((t) => {
          const activo =
            t.href === "/finanzas/estados-gerenciales"
              ? pathname === t.href
              : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "border-b-2 px-4 py-3 text-[13px] font-medium transition-colors -mb-px",
                activo
                  ? "border-brand text-brand-deep"
                  : "border-transparent text-ink-3 hover:text-ink-1",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
