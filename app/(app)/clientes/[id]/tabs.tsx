"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { key: "general", label: "General", path: "" },
  { key: "contactos", label: "Contactos", path: "/contactos" },
  { key: "documentos", label: "Documentos", path: "/documentos" },
  { key: "cfdi", label: "CFDI", path: "/cfdi" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function ClienteTabs({
  clienteId,
  counts,
}: {
  clienteId: string;
  counts: Partial<Record<Exclude<TabKey, "general">, number>>;
}) {
  const pathname = usePathname();
  const base = `/clientes/${clienteId}`;

  // Determinar tab activo desde pathname.
  const activo: TabKey = pathname.endsWith("/contactos")
    ? "contactos"
    : pathname.endsWith("/documentos")
      ? "documentos"
      : pathname.endsWith("/cfdi")
        ? "cfdi"
        : "general";

  return (
    <nav className="mb-6 flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const isActive = tab.key === activo;
        const n = tab.key !== "general" ? counts[tab.key] : undefined;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {n != null && n > 0 && (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] ${
                  isActive ? "bg-primary/15 text-primary" : "bg-secondary text-ink-3"
                }`}
              >
                {n}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
