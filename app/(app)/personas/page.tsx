import { AlertTriangle, Download, Plus, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusDot } from "@/components/ui/status-dot";
import {
  empresasDondeGestionaEmpleados,
  esCEO,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

import { EmpleadosTable } from "./empleados-table";

const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    categoria?: string;
    empresa?: string;
    activo?: string;
    puesto?: string;
    orden?: string;
  };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeAlta = empresasDondeGestionaEmpleados(vinculos).length > 0;
  const ceo = esCEO(vinculos);

  const q = (searchParams.q ?? "").trim();

  // Filtro por empresa activa del switcher (cookie). Si el usuario eligió
  // PSE en el sidebar, solo muestra empleados de PSE — a menos que pase
  // ?empresa= explícito en URL para override.
  const filtroSwitcher = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: vinculos.map((v) => v.empresa_id),
    puedeConsolidado: puedeVerConsolidado(vinculos),
  });

  // Validar orden
  type OrdenKey = "nombre" | "categoria" | "puesto" | "estado" | "fecha_ingreso";
  const ORDEN_COL: Record<OrdenKey, { col: string; asc: boolean }> = {
    nombre: { col: "nombre_completo", asc: true },
    categoria: { col: "categoria", asc: true },
    puesto: { col: "puesto", asc: true },
    estado: { col: "activo", asc: false }, // activos primero
    fecha_ingreso: { col: "fecha_ingreso", asc: false }, // recientes primero
  };
  const ordenKey: OrdenKey = ((): OrdenKey => {
    const v = searchParams.orden;
    if (v && (v === "nombre" || v === "categoria" || v === "puesto" || v === "estado" || v === "fecha_ingreso"))
      return v;
    return "nombre";
  })();
  const ordenSpec = ORDEN_COL[ordenKey];

  let query = supabase
    .from("empleados")
    .select(
      "id, nombre_completo, curp, numero_empleado, categoria, puesto, area, fecha_ingreso, activo, vigencia_repse_hasta, empresa_id, empresas(codigo, nombre_comercial, razon_social)",
      { count: "exact" },
    )
    .order(ordenSpec.col, { ascending: ordenSpec.asc })
    .limit(500);

  if (searchParams.activo === "true") query = query.eq("activo", true);
  if (searchParams.activo === "false") query = query.eq("activo", false);
  const validCats = ["planta", "por_obra", "repse"] as const;
  type Cat = (typeof validCats)[number];
  if (
    searchParams.categoria &&
    validCats.includes(searchParams.categoria as Cat)
  ) {
    query = query.eq("categoria", searchParams.categoria as Cat);
  }

  // Empresa: prioridad searchParams (override) → switcher cookie → todas
  if (searchParams.empresa) {
    query = query.eq("empresa_id", searchParams.empresa);
  } else if (filtroSwitcher.empresasIds.length > 0) {
    query = query.in("empresa_id", filtroSwitcher.empresasIds);
  }

  if (searchParams.puesto) {
    query = query.eq("puesto", searchParams.puesto);
  }

  if (q) {
    query = query.or(
      `nombre_completo.ilike.%${q}%,curp.ilike.%${q}%,numero_empleado.ilike.%${q}%,puesto.ilike.%${q}%`,
    );
  }

  const { data: empleados, count, error } = await query;

  // Lista de puestos únicos (para el filtro dropdown) — del set actual
  const puestosUnicos = Array.from(
    new Set(
      (empleados ?? [])
        .map((e) => e.puesto)
        .filter((p): p is string => Boolean(p) && p !== "Por definir"),
    ),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  // KPIs (sobre los visibles, no filtrados)
  const lista = empleados ?? [];
  const activos = lista.filter((e) => e.activo).length;
  const repse = lista.filter((e) => e.categoria === "repse" && e.activo);
  const obra = lista.filter((e) => e.categoria === "por_obra" && e.activo)
    .length;

  // Alertas REPSE: vencidos + próximos 30 días
  const ahora = new Date();
  const en30 = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);
  const repseAlertas = repse
    .map((e) => {
      const v = e.vigencia_repse_hasta
        ? new Date(e.vigencia_repse_hasta)
        : null;
      const status = !v
        ? "sin_constancia"
        : v < ahora
          ? "vencida"
          : v < en30
            ? "urgente"
            : null;
      return { empleado: e, vigencia: v, status };
    })
    .filter((x) => x.status !== null);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Personas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Empleados
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {count ?? 0} empleado{count === 1 ? "" : "s"} visibles · {activos}{" "}
            activos · {obra} por obra · {repse.length} REPSE
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ceo && empresas && empresas.length > 0 && (
            <ExportNominaMenu empresas={empresas} />
          )}
          {puedeAlta && (
            <Button asChild>
              <Link href="/personas/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo empleado
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Activos" value={activos} sub="Plantilla actual" />
        <KpiCard
          label="Por obra"
          value={obra}
          sub="Temporales"
          accent="warn"
        />
        <KpiCard
          label="REPSE"
          value={repse.length}
          sub="Subcontratados"
        />
        <KpiCard
          label="Alertas REPSE"
          value={repseAlertas.length}
          sub={
            repseAlertas.length === 0
              ? "Todo en orden"
              : `${repseAlertas.filter((a) => a.status === "vencida" || a.status === "sin_constancia").length} vencidas/sin`
          }
          accent={repseAlertas.length > 0 ? "danger" : "ok"}
        />
      </div>

      {/* Alertas REPSE */}
      {repseAlertas.length > 0 && (
        <section className="mb-6 rounded-md border border-warn/40 bg-warn-soft/40 p-5">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-warn-deep" />
            <h2 className="text-[13.5px] font-semibold">
              Constancias REPSE que requieren atención
            </h2>
          </div>
          <ul className="space-y-2">
            {repseAlertas.slice(0, 6).map((a) => (
              <li
                key={a.empleado.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5"
              >
                <StatusDot
                  status={
                    a.status === "vencida" || a.status === "sin_constancia"
                      ? "danger"
                      : "warning"
                  }
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/personas/${a.empleado.id}`}
                    className="text-[13px] font-medium hover:text-brand"
                  >
                    {a.empleado.nombre_completo}
                  </Link>
                  <p className="text-[11.5px] text-ink-3">
                    {a.status === "sin_constancia"
                      ? "Sin constancia REPSE registrada"
                      : a.status === "vencida"
                        ? `Vencida el ${fmtFecha(a.empleado.vigencia_repse_hasta!)}`
                        : `Vence el ${fmtFecha(a.empleado.vigencia_repse_hasta!)} (≤ 30 días)`}
                  </p>
                </div>
                <Link href={`/personas/${a.empleado.id}`}>
                  <Button size="sm" variant="outline">
                    Renovar
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
          {repseAlertas.length > 6 && (
            <p className="mt-2 text-[12px] text-ink-3">
              + {repseAlertas.length - 6} más con alertas REPSE.
            </p>
          )}
        </section>
      )}

      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </p>
      )}

      <EmpleadosTable
        empleados={empleados ?? []}
        empresas={empresas ?? []}
        puestos={puestosUnicos}
        currentQ={q}
        currentCategoria={searchParams.categoria ?? ""}
        currentEmpresa={searchParams.empresa ?? ""}
        currentActivo={searchParams.activo ?? ""}
        currentPuesto={searchParams.puesto ?? ""}
        currentOrden={ordenKey}
      />
    </div>
  );
}

type EmpresaSummary = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
  razon_social: string;
};

function ExportNominaMenu({ empresas }: { empresas: EmpresaSummary[] }) {
  const ahora = new Date();
  const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  return (
    <details className="relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-bg-2">
        <Download className="h-3.5 w-3.5" />
        Export nómina
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-72 rounded-md border border-border bg-popover p-1 shadow-md">
        <p className="px-2 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
          Período {periodo} · CSV
        </p>
        {empresas.map((e) => (
          <a
            key={e.id}
            href={`/api/personas/nomina-export?empresa=${e.id}&periodo=${periodo}`}
            className="flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-[13px] hover:bg-bg-2"
          >
            <span>{e.nombre_comercial ?? e.razon_social}</span>
            <span className="font-mono text-[10px] text-ink-3">
              {e.codigo}
            </span>
          </a>
        ))}
        <div className="mt-1 border-t border-divider px-2 py-1.5 text-[10px] text-ink-4">
          <AlertTriangle className="mr-1 inline h-2.5 w-2.5" />
          Compatible con CONTPAQi Nóminas y Aspel NOI
        </div>
      </div>
    </details>
  );
}
