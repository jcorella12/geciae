import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  empresasDondeGestionaProyectos,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

import { ProyectosTable } from "./proyectos-table";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    estado?: string;
    empresa?: string;
    marca?: string;
  };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeCrear = empresasDondeGestionaProyectos(vinculos).length > 0;

  // Filtro por empresa activa del switcher
  const filtro = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: vinculos.map((v) => v.empresa_id),
    puedeConsolidado: puedeVerConsolidado(vinculos),
  });

  const q = (searchParams.q ?? "").trim();

  type EstadoP =
    | "cotizacion"
    | "contrato_firmado"
    | "planeacion"
    | "en_ejecucion"
    | "en_cierre"
    | "entregado"
    | "en_om"
    | "cerrado"
    | "cancelado";
  const validEstados: readonly EstadoP[] = [
    "cotizacion",
    "contrato_firmado",
    "planeacion",
    "en_ejecucion",
    "en_cierre",
    "entregado",
    "en_om",
    "cerrado",
    "cancelado",
  ];

  let query = supabase
    .from("proyectos")
    .select(
      "id, codigo, nombre, tipo, estado, fecha_inicio_planeado, fecha_fin_planeado, monto_contratado, monto_facturado, presupuesto_costo, costo_real, semaforo, empresa_id, empresas!proyectos_empresa_id_fkey(codigo, nombre_comercial), clientes(razon_social, nombre_comercial)",
      { count: "exact" },
    )
    .in("empresa_id", filtro.empresasIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (
    searchParams.estado &&
    validEstados.includes(searchParams.estado as EstadoP)
  ) {
    query = query.eq("estado", searchParams.estado as EstadoP);
  }
  if (searchParams.empresa) query = query.eq("empresa_id", searchParams.empresa);
  if (searchParams.marca)
    query = query.eq("marca_visible_id", searchParams.marca);
  if (q) {
    query = query.or(`codigo.ilike.%${q}%,nombre.ilike.%${q}%`);
  }

  const { data: proyectos, count, error } = await query;

  const { data: empresasFiltro } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  // KPIs (calculados sobre los proyectos filtrados visibles)
  const lista = proyectos ?? [];
  const activosEstados: EstadoP[] = [
    "contrato_firmado",
    "planeacion",
    "en_ejecucion",
    "en_cierre",
  ];
  const activos = lista.filter((p) =>
    activosEstados.includes(p.estado as EstadoP),
  );
  const enRiesgo = lista.filter((p) => p.semaforo === "rojo").length;
  const totalContratado = lista.reduce(
    (acc, p) => acc + Number(p.monto_contratado ?? 0),
    0,
  );
  const totalFacturado = lista.reduce(
    (acc, p) => acc + Number(p.monto_facturado ?? 0),
    0,
  );
  const avancePromedio =
    activos.length > 0
      ? activos.reduce((acc, p) => {
          const c = Number(p.monto_contratado ?? 0);
          const f = Number(p.monto_facturado ?? 0);
          return acc + (c > 0 ? (f / c) * 100 : 0);
        }, 0) / activos.length
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Operación de Proyectos</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Proyectos
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {count ?? 0} proyecto{count === 1 ? "" : "s"} · {activos.length}{" "}
            activos · ordenados por última actualización
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton tipo="proyectos" />
          {puedeCrear && (
            <Button asChild>
              <Link href="/proyectos/nuevo">
                <Plus className="h-4 w-4" />
                Nuevo proyecto
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Proyectos activos"
          value={activos.length}
          sub={`${lista.length - activos.length} en otros estados`}
        />
        <KpiCard
          label="En riesgo"
          value={enRiesgo}
          sub="Semáforo rojo"
          accent={enRiesgo > 0 ? "danger" : "ok"}
        />
        <KpiCard
          label="Avance promedio"
          value={`${avancePromedio.toFixed(1)}`}
          unit="%"
          sub="Activos · facturado / contratado"
        />
        <KpiCard
          label="Contratado"
          value={fmtMxn.format(totalContratado)}
          sub={`${fmtMxn.format(totalFacturado)} facturado`}
        />
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </p>
      )}

      <ProyectosTable
        proyectos={(proyectos ?? []) as never}
        empresas={empresasFiltro ?? []}
        currentQ={q}
        currentEstado={searchParams.estado ?? ""}
        currentEmpresa={searchParams.empresa ?? ""}
        currentMarca={searchParams.marca ?? ""}
      />
    </div>
  );
}
