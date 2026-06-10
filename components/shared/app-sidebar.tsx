"use client";

import {
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  EyeOff,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  Lightbulb,
  Package,
  FileSignature,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Smartphone,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Sun,
  TrendingUp,
  Truck,
  Users,
  Users2,
  Wallet,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, type ComponentType, type SVGProps } from "react";

import { SidebarEmpresaSwitcher } from "@/components/shared/sidebar-empresa-switcher";
import type { EmpresaResumen } from "@/lib/empresa-activa";
import { toggleSidebar } from "@/lib/preferences/sidebar";
import { cn } from "@/lib/utils";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Capacidades de navegación — qué secciones del menú ve el usuario según su
 * rol/atributos. Se calculan en el layout (server) y se pasan acá. Los items
 * sin `cap` declarado son UNIVERSALES (siempre visibles). Cuando hay duda,
 * un item se deja universal: el RLS de cada página protege la acción real.
 */
export type NavCaps = {
  /** Dashboard ejecutivo + Reportes (visión de negocio). */
  gerencial: boolean;
  /** Clientes, pipeline, cotizaciones, servicios. */
  comercial: boolean;
  /** Proveedores. */
  proveedores: boolean;
  /** OC, OT, CFDI, tesorería, gastos recurrentes, cumplimiento. */
  finanzas: boolean;
  /** Gestión de personas (empleados, nómina, capacitación). */
  personas: boolean;
  /** Inventario y activos. */
  inventarioActivos: boolean;
  /** Módulo de calidad. */
  calidad: boolean;
};

type CapKey = keyof NavCaps;

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  count?: number;
  /** Si se define, el item solo aparece cuando navCaps[cap] === true. */
  cap?: CapKey;
};
type NavGroup = {
  label: string;
  items: NavItem[];
};

type Props = {
  puedeVerConfiguracion: boolean;
  /** CEO + atributo contralor + atributo tesorero_corporativo. */
  puedeVerAjustesGerenciales?: boolean;
  /** Capacidades de navegación por rol. Si se omite, se muestra todo. */
  navCaps?: NavCaps;
  empresas: EmpresaResumen[];
  activaId: string | null;
  puedeConsolidado: boolean;
  /** Si true, sidebar muestra solo iconos (~60px). */
  collapsed: boolean;
  user: {
    name: string;
    initials: string;
    role: string;
  };
};

export function AppSidebar({
  puedeVerConfiguracion,
  puedeVerAjustesGerenciales = false,
  navCaps,
  empresas,
  activaId,
  puedeConsolidado,
  collapsed,
  user,
}: Props) {
  const pathname = usePathname();

  // Si no llegan capacidades (uso del componente sin la prop), se muestra
  // todo — política fail-open para no esconder navegación por accidente.
  const caps: NavCaps = navCaps ?? {
    gerencial: true,
    comercial: true,
    proveedores: true,
    finanzas: true,
    personas: true,
    inventarioActivos: true,
    calidad: true,
  };
  const [isPending, startTransition] = useTransition();
  const onToggle = () => {
    startTransition(() => {
      void toggleSidebar();
    });
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  // Sidebar reorganizado en 5 grupos lógicos:
  //  PRINCIPAL — accesos diarios y vista global
  //  COMERCIAL — front-end del negocio (lo que entra)
  //  PROYECTOS — ejecución y entrega
  //  RECURSOS — quién y con qué (gente, terceros, activos)
  //  FINANZAS — el back-office del dinero (incluye cumplimiento fiscal)
  // Cumplimiento fiscal absorbe obligaciones SAT y estados financieros vía
  // tabs internos; Reportes se sube a PRINCIPAL por ser transversal.
  const principal: NavGroup = {
    label: "PRINCIPAL",
    items: [
      { href: "/mi-dia", label: "Mi día", icon: Sun },
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        cap: "gerencial",
      },
      { href: "/calendario", label: "Calendario", icon: CalendarDays },
      { href: "/reportes", label: "Reportes", icon: BarChart3, cap: "gerencial" },
    ],
  };

  const comercial: NavGroup = {
    label: "COMERCIAL",
    items: [
      { href: "/clientes", label: "Clientes", icon: Users, cap: "comercial" },
      {
        href: "/comercial/oportunidades",
        label: "Pipeline",
        icon: TrendingUp,
        cap: "comercial",
      },
      {
        href: "/comercial/cotizaciones",
        label: "Cotizaciones",
        icon: FileSignature,
        cap: "comercial",
      },
      {
        href: "/finanzas/servicios",
        label: "Servicios",
        icon: FileText,
        cap: "comercial",
      },
    ],
  };

  const proyectos: NavGroup = {
    label: "PROYECTOS",
    items: [
      { href: "/proyectos", label: "Proyectos", icon: Briefcase },
      { href: "/solicitudes", label: "Solicitudes", icon: Inbox },
      { href: "/campo", label: "Captura campo", icon: Smartphone },
      { href: "/calidad", label: "Calidad", icon: CheckSquare, cap: "calidad" },
    ],
  };

  const recursos: NavGroup = {
    label: "RECURSOS",
    items: [
      { href: "/personas", label: "Personas", icon: Users2, cap: "personas" },
      {
        href: "/finanzas/proveedores",
        label: "Proveedores",
        icon: Truck,
        cap: "proveedores",
      },
      {
        href: "/activos",
        label: "Activos",
        icon: Wrench,
        cap: "inventarioActivos",
      },
      {
        href: "/inventario",
        label: "Inventario",
        icon: Package,
        cap: "inventarioActivos",
      },
      { href: "/soporte/tickets", label: "Tickets soporte", icon: LifeBuoy },
    ],
  };

  const finanzas: NavGroup = {
    label: "FINANZAS",
    items: [
      {
        href: "/finanzas",
        label: "Inicio finanzas",
        icon: LayoutGrid,
        cap: "finanzas",
      },
      {
        href: "/finanzas/oc",
        label: "Compras (OC)",
        icon: ShoppingCart,
        cap: "finanzas",
      },
      {
        href: "/finanzas/ot",
        label: "OT inter-co",
        icon: ClipboardList,
        cap: "finanzas",
      },
      { href: "/finanzas/cfdi", label: "CFDI", icon: Receipt, cap: "finanzas" },
      {
        href: "/finanzas/tesoreria",
        label: "Tesorería",
        icon: Wallet,
        cap: "finanzas",
      },
      {
        href: "/finanzas/gastos-recurrentes",
        label: "Gastos recurrentes",
        icon: RefreshCw,
        cap: "finanzas",
      },
      {
        href: "/finanzas/cumplimiento",
        label: "Cumplimiento fiscal",
        icon: ShieldCheck,
        cap: "finanzas",
      },
      // Módulos restringidos (Sprint S/EF) — solo CEO + contralor + tesorero
      ...(puedeVerAjustesGerenciales
        ? [
            {
              href: "/finanzas/estados-gerenciales",
              label: "Estados gerenciales",
              icon: BarChart3,
            },
            {
              href: "/finanzas/ajustes-gerenciales",
              label: "Ajustes gerenciales",
              icon: Shield,
            },
            {
              href: "/finanzas/vista-real",
              label: "Vista real",
              icon: EyeOff,
            },
          ]
        : []),
    ],
  };

  // Configuración + ayuda viven aparte, abajo
  const transversales: NavItem[] = [
    ...(puedeVerConfiguracion
      ? [{ href: "/configuracion", label: "Configuración", icon: Settings }]
      : []),
    // Admin de feedback y métricas — sólo CEO ve útil pero el RLS bloquea
    // a otros, así que el item siempre aparece para no obligar a checks
    // adicionales en el sidebar (la página redirige si no es CEO).
    ...(puedeVerConfiguracion
      ? [
          {
            href: "/admin/sugerencias",
            label: "Sugerencias",
            icon: Lightbulb,
          },
          {
            href: "/admin/uso",
            label: "Métricas de uso",
            icon: BarChart3,
          },
        ]
      : []),
    { href: "/ayuda", label: "Ayuda", icon: HelpCircle },
  ];

  // Filtrar items por capacidad y descartar grupos que queden vacíos.
  const grupos = [principal, comercial, proyectos, recursos, finanzas]
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => it.cap === undefined || caps[it.cap]),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <aside
      data-collapsed={collapsed ? "true" : undefined}
      className={cn(
        "group/sidebar flex h-full shrink-0 flex-col bg-brand-darker text-white/85 transition-[width] duration-200",
        isPending && "opacity-90",
      )}
      style={{ width: "var(--sidebar-w)" }}
      aria-label="Navegación principal"
    >
      {/* Logo + Brand + Toggle */}
      <div className="relative flex h-topbar-h shrink-0 items-center border-b border-white/[0.08]">
        <Link
          href="/mi-dia"
          className={cn(
            "flex h-full flex-1 items-center transition-colors hover:bg-white/[0.04]",
            collapsed ? "justify-center px-2" : "gap-2.5 px-4",
          )}
          title={collapsed ? "GECIAE · ERP" : undefined}
        >
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-white p-[3px]">
            <Image
              src="/logos/ciae.png"
              alt="ERP GECIAE"
              width={28}
              height={28}
              className="object-contain"
              priority
            />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-[14.5px] font-semibold leading-tight tracking-tight text-white">
                GECIAE
              </span>
              <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-white/55">
                ERP · OPERACIÓN
              </span>
            </span>
          )}
        </Link>
        {/* Botón de toggle: en colapsado va abajo del logo, en expandido a la derecha. */}
        <button
          type="button"
          onClick={onToggle}
          disabled={isPending}
          className={cn(
            "absolute -right-3 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-brand-darker text-white/70 transition hover:border-white/35 hover:text-white",
            isPending && "opacity-60",
          )}
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Empresa switcher */}
      <SidebarEmpresaSwitcher
        empresas={empresas}
        activaId={activaId}
        puedeConsolidado={puedeConsolidado}
        collapsed={collapsed}
      />

      {/* Nav */}
      <div
        className={cn(
          "flex-1 overflow-y-auto py-2",
          collapsed ? "px-1.5" : "px-2",
        )}
      >
        {grupos.map((grupo, gi) => (
          <div
            key={grupo.label}
            className={cn(
              "py-2",
              gi > 0 && "mt-1.5 border-t border-white/[0.06] pt-2",
            )}
          >
            {!collapsed && (
              <p className="px-3 pb-1.5 pt-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/55">
                {grupo.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {grupo.items.map(({ href, label, icon: Icon, count }) => {
                const active = isActive(href);
                return (
                  <li key={href} className="relative">
                    {active && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent-pse",
                          collapsed ? "-left-1.5" : "-left-2",
                        )}
                      />
                    )}
                    <Link
                      href={href}
                      title={collapsed ? label : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center rounded-md py-1.5 text-[13px] transition-colors",
                        collapsed
                          ? "justify-center px-1.5"
                          : "gap-2.5 px-3",
                        active
                          ? "bg-white/[0.12] font-medium text-white"
                          : "text-white/80 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <Icon
                        className="h-[15px] w-[15px] shrink-0 opacity-90"
                        aria-hidden
                      />
                      {!collapsed && (
                        <>
                          <span className="truncate">{label}</span>
                          {count !== undefined && (
                            <span
                              className={cn(
                                "ml-auto rounded-full px-1.5 py-px font-mono text-[10px] font-semibold",
                                active
                                  ? "bg-white text-brand-deep"
                                  : "bg-accent-pse text-white",
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {transversales.length > 0 && (
          <div className="mt-1.5 border-t border-white/[0.06] py-2 pt-2">
            <ul className="space-y-0.5">
              {transversales.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <li key={href} className="relative">
                    {active && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent-pse",
                          collapsed ? "-left-1.5" : "-left-2",
                        )}
                      />
                    )}
                    <Link
                      href={href}
                      title={collapsed ? label : undefined}
                      aria-label={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center rounded-md py-1.5 text-[13px] transition-colors",
                        collapsed
                          ? "justify-center px-1.5"
                          : "gap-2.5 px-3",
                        active
                          ? "bg-white/[0.12] font-medium text-white"
                          : "text-white/80 hover:bg-white/[0.06] hover:text-white",
                      )}
                    >
                      <Icon
                        className="h-[15px] w-[15px] shrink-0 opacity-90"
                        aria-hidden
                      />
                      {!collapsed && (
                        <span className="truncate">{label}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* User card */}
      <Link
        href="/perfil"
        title={collapsed ? `${user.name} · ${user.role}` : undefined}
        className={cn(
          "flex shrink-0 items-center border-t border-white/[0.08] py-3 transition-colors hover:bg-white/[0.04]",
          collapsed ? "justify-center px-2" : "gap-2.5 px-3",
        )}
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-pse text-[11.5px] font-semibold text-white">
          {user.initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] font-medium leading-tight text-white">
                {user.name}
              </span>
              <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-white/55">
                {user.role}
              </span>
            </span>
            <Settings
              className="ml-auto h-3.5 w-3.5 shrink-0 text-white/55"
              aria-hidden
            />
          </>
        )}
      </Link>
    </aside>
  );
}
