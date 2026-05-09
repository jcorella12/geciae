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

export function TabsNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-[1480px] gap-1 px-6">
        {TABS.map((t) => {
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
