"use client";

import {
  Briefcase,
  ClipboardList,
  FileText,
  PackageSearch,
  Plus,
  ShoppingCart,
  Truck,
  Users,
  Users2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CreateOption = {
  href: string;
  label: string;
  shortcut?: string;
  description?: string;
  icon: keyof typeof ICONS;
  group: "operacion" | "comercial" | "personas" | "tesoreria";
};

const ICONS = {
  oc: ShoppingCart,
  cfdi: FileText,
  ot: ClipboardList,
  proyecto: PackageSearch,
  cliente: Users,
  proveedor: Truck,
  empleado: Users2,
  prestamo: Briefcase,
} as const;

const GRUPOS: Record<string, string> = {
  operacion: "Operación",
  comercial: "Comercial",
  personas: "Personas",
  tesoreria: "Tesorería",
};

export function TopbarCreateButton({ options }: { options: CreateOption[] }) {
  if (options.length === 0) return null;

  // Agrupar opciones
  const grupos = options.reduce<Record<string, CreateOption[]>>((acc, o) => {
    if (!acc[o.group]) acc[o.group] = [];
    acc[o.group].push(o);
    return acc;
  }, {});

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Crear
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[18rem]">
        {Object.entries(grupos).map(([key, items], i) => (
          <div key={key}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {GRUPOS[key] ?? key}
            </DropdownMenuLabel>
            {items.map((opt) => {
              const Icon = ICONS[opt.icon];
              return (
                <DropdownMenuItem key={opt.href} asChild className="gap-3">
                  <Link href={opt.href} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-2 text-ink-2">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[13px] font-medium">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="block text-[11px] text-ink-3">
                          {opt.description}
                        </span>
                      )}
                    </span>
                    {opt.shortcut && (
                      <kbd className="rounded border border-border bg-surface px-1.5 py-px font-mono text-[10px] text-ink-4">
                        {opt.shortcut}
                      </kbd>
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
