"use client";

import {
  BarChart3,
  Briefcase,
  HelpCircle,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const espacios = [
  { href: "/mi-dia", label: "Mi día", icon: Sun },
  { href: "/proyectos", label: "Operación de Proyectos", icon: Briefcase },
  { href: "/clientes", label: "Comercial y Clientes", icon: Users },
  { href: "/finanzas", label: "Administración y Finanzas", icon: Wallet },
  { href: "/personas", label: "Personas", icon: Users2 },
  { href: "/calidad", label: "Calidad y Cumplimiento", icon: ShieldCheck },
] as const;

type Props = {
  puedeVerConfiguracion: boolean;
};

export function AppSidebar({ puedeVerConfiguracion }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const transversales = [
    { href: "/reportes", label: "Reportes y BI", icon: BarChart3 },
    ...(puedeVerConfiguracion
      ? [{ href: "/configuracion", label: "Configuración", icon: Settings }]
      : []),
    { href: "/ayuda", label: "Ayuda", icon: HelpCircle },
  ];

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-card">
      <Link
        href="/mi-dia"
        className="flex h-14 items-center gap-2 border-b border-border px-4 transition-colors hover:bg-secondary/50"
      >
        <Image
          src="/logos/ciae.png"
          alt="ERP GECIAE"
          width={32}
          height={32}
          priority
        />
        <span className="text-sm font-semibold">GECIAE</span>
      </Link>

      <div className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-0.5 px-2">
          {espacios.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <hr className="my-3 border-border" />

        <ul className="space-y-0.5 px-2">
          {transversales.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
