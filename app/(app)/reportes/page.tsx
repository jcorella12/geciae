import {
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Reportes" };

const fmtNum = new Intl.NumberFormat("es-MX");

const reportes = [
  {
    grupo: "Finanzas",
    items: [
      {
        href: "/reportes/ejecutivo-mensual",
        label: "Reporte ejecutivo mensual",
        desc: "Ingresos vs egresos · top 10 clientes y proveedores · CxC/CxP · alertas REPSE. Imprimible a PDF.",
        icon: TrendingUp,
        ready: true,
      },
      {
        href: "/finanzas/cfdi",
        label: "CFDI emitidos / recibidos",
        desc: "Lista filtrable por empresa, dirección y estado.",
        icon: Receipt,
        ready: true,
      },
      {
        href: "/finanzas/oc",
        label: "Órdenes de compra",
        desc: "Por estado, empresa, proveedor.",
        icon: ShoppingCart,
        ready: true,
      },
      {
        href: "/finanzas/tesoreria/matriz",
        label: "Matriz inter-co mensual",
        desc: "Saldos cruzados acreedora × deudora con intereses.",
        icon: Building2,
        ready: true,
      },
      {
        href: "/finanzas/tesoreria",
        label: "Posición consolidada",
        desc: "Bancos, OC pagar, OT cobrar, préstamos.",
        icon: Wallet,
        ready: true,
      },
    ],
  },
  {
    grupo: "Operación",
    items: [
      {
        href: "/proyectos",
        label: "Proyectos",
        desc: "Cartera completa con avance, contratado y semáforo.",
        icon: Briefcase,
        ready: true,
      },
      {
        href: "/reportes/proyectos-pnl",
        label: "Rentabilidad por proyecto (P&L)",
        desc: "Job costing: presupuesto vs real, margen neto, salud por proyecto y agregado del portafolio.",
        icon: TrendingUp,
        ready: true,
      },
      {
        href: "/finanzas/ot",
        label: "OT inter-co",
        desc: "Órdenes de trabajo entre empresas con estado del ciclo.",
        icon: ClipboardList,
        ready: true,
      },
    ],
  },
  {
    grupo: "Maestros",
    items: [
      {
        href: "/clientes",
        label: "Clientes",
        desc: "Catálogo con tipo, RFC y empresas vinculadas.",
        icon: Users,
        ready: true,
      },
      {
        href: "/finanzas/proveedores",
        label: "Proveedores",
        desc: "Catálogo con semáforo de cumplimiento.",
        icon: Users,
        ready: true,
      },
      {
        href: "/personas",
        label: "Empleados",
        desc: "Plantilla por empresa, categoría y puesto.",
        icon: Users,
        ready: true,
      },
    ],
  },
  {
    grupo: "Avanzados",
    items: [
      {
        href: "#",
        label: "Export mensual XML para CONTPAQi",
        desc: "Paquete de XMLs por mes para subir al contador externo.",
        icon: FileSpreadsheet,
        ready: false,
      },
      {
        href: "#",
        label: "Estado de resultados",
        desc: "P&L por empresa con eliminación de inter-co.",
        icon: TrendingUp,
        ready: false,
      },
      {
        href: "#",
        label: "Cumplimiento SAT",
        desc: "RFC con CSF, lista 69-B, opinión 32-D, REPSE.",
        icon: BarChart3,
        ready: false,
      },
    ],
  },
] as const;

export default async function ReportesPage() {
  const supabase = createClient();
  await obtenerVinculos();

  const [
    { count: proyectosCount },
    { count: cfdisCount },
    { count: ocsCount },
    { count: clientesCount },
    { count: proveedoresCount },
    { count: empleadosCount },
  ] = await Promise.all([
    supabase
      .from("proyectos")
      .select("id", { count: "exact", head: true }),
    supabase.from("cfdi").select("id", { count: "exact", head: true }),
    supabase
      .from("ordenes_compra")
      .select("id", { count: "exact", head: true }),
    supabase.from("clientes").select("id", { count: "exact", head: true }),
    supabase
      .from("proveedores")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("empleados")
      .select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7">
        <p className="lbl-mini">Reportes y BI</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Reportes
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Vistas filtrables y exports para análisis externo.
        </p>
      </div>

      <div className="mb-6 grid gap-5 rounded-md border border-border bg-card p-5 shadow-xs sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Proyectos" value={fmtNum.format(proyectosCount ?? 0)} />
        <Stat label="CFDI" value={fmtNum.format(cfdisCount ?? 0)} />
        <Stat label="OC" value={fmtNum.format(ocsCount ?? 0)} />
        <Stat label="Clientes" value={fmtNum.format(clientesCount ?? 0)} />
        <Stat label="Proveedores" value={fmtNum.format(proveedoresCount ?? 0)} />
        <Stat label="Empleados" value={fmtNum.format(empleadosCount ?? 0)} />
      </div>

      <div className="space-y-6">
        {reportes.map((grupo) => (
          <section key={grupo.grupo}>
            <h2 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {grupo.grupo}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {grupo.items.map((item) => {
                const Icon = item.icon;
                if (!item.ready) {
                  return (
                    <li key={item.label}>
                      <div className="flex h-full items-start gap-3 rounded-md border border-border bg-card p-4 shadow-xs opacity-70">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-3 text-ink-4">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13.5px] font-semibold">
                              {item.label}
                            </p>
                            <StatusDot status="idle" />
                          </div>
                          <p className="mt-1 text-[12px] text-ink-3">
                            {item.desc}
                          </p>
                          <p className="mt-1.5 inline-block rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">
                            Próximamente
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="group flex h-full items-start gap-3 rounded-md border border-border bg-card p-4 shadow-xs transition hover:border-brand"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-2 text-ink-2 group-hover:bg-brand-soft group-hover:text-brand-deep">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[12px] text-ink-3">
                          {item.desc}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
