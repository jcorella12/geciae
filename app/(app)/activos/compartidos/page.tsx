import { AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_ALERTA,
  COLOR_ESTADO_ACTIVO,
  ETIQUETA_ALERTA,
  ETIQUETA_ESTADO_ACTIVO,
  ETIQUETA_TIPO_ACTIVO_GRUPO,
  ETIQUETA_UNIDAD,
  type ActivoEnriquecido,
} from "@/lib/activos-compartidos/state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
  IAE: "bg-blue-500",
};

export default async function ActivosCompartidosPage({
  searchParams,
}: {
  searchParams?: { tipo?: string; estado?: string; alerta?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puedeCrear =
    esCEO(v) ||
    v.some(
      (vi) =>
        
        (vi.rol === "director" || (vi.atributos ?? []).includes("contralor")),
    );

  const { data: activos } = (await supabase
    .from("v_activos_grupo_enriquecido" as never)
    .select("*")
    .order("codigo", { ascending: true })) as unknown as {
    data: ActivoEnriquecido[] | null;
  };

  const lista = activos ?? [];
  const tipoFiltro = searchParams?.tipo ?? "";
  const estadoFiltro = searchParams?.estado ?? "";
  const alertaFiltro = searchParams?.alerta ?? "";
  const filtrados = lista.filter(
    (a) =>
      (!tipoFiltro || a.tipo === tipoFiltro) &&
      (!estadoFiltro || a.estado === estadoFiltro) &&
      (!alertaFiltro || a.alerta === alertaFiltro),
  );

  const total = lista.length;
  const valorFlota = lista.reduce((acc, a) => acc + Number(a.costo_adquisicion ?? 0), 0);
  const conAlerta = lista.filter((a) => a.alerta !== "ok").length;
  const tarifaPromedio =
    lista.length > 0
      ? lista.reduce((acc, a) => acc + Number(a.tarifa_vigente ?? 0), 0) / lista.length
      : 0;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Activos · Compartidos del grupo</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Activos compartidos
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Equipos costosos del grupo (medición, elevación, perforación, etc.) que se prestan entre empresas con tarifa Costo + 12%.
          </p>
        </div>
        {puedeCrear && (
          <Link href="/activos/compartidos/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo activo
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total activos" value={total} />
        <KpiCard label="Valor flota" value={fmtMxn.format(valorFlota)} sub="Costo de adquisición" />
        <KpiCard
          label="Con alerta"
          value={conAlerta}
          accent={conAlerta > 0 ? "warn" : "ok"}
          sub="mantenimiento, calibración, seguro"
        />
        <KpiCard label="Tarifa promedio" value={fmtMxn.format(tarifaPromedio)} sub="por unidad de uso" />
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">Tipo:</span>
        <Link
          href="/activos/compartidos"
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            !tipoFiltro ? "bg-ink-1 text-bg-1" : "bg-card text-ink-2"
          }`}
        >
          Todos ({lista.length})
        </Link>
        {(Object.keys(ETIQUETA_TIPO_ACTIVO_GRUPO) as Array<keyof typeof ETIQUETA_TIPO_ACTIVO_GRUPO>).map((t) => {
          const n = lista.filter((a) => a.tipo === t).length;
          if (n === 0) return null;
          return (
            <Link
              key={t}
              href={`/activos/compartidos?tipo=${t}`}
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                tipoFiltro === t ? "bg-ink-1 text-bg-1" : "bg-card text-ink-2"
              }`}
            >
              {ETIQUETA_TIPO_ACTIVO_GRUPO[t]} ({n})
            </Link>
          );
        })}
      </div>

      {filtrados.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          {lista.length === 0
            ? "Sin activos. Crea el primero →"
            : "Sin resultados con los filtros actuales."}
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Propietaria</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead align="right">Tarifa</TableHead>
                <TableHead>Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((a) => (
                <TableRow
                  key={a.id}
                  href={`/activos/compartidos/${a.id}`}
                  linkLabel={`Abrir ${a.codigo}`}
                >
                  <TableCell className="font-mono text-xs">{a.codigo}</TableCell>
                  <TableCell>
                    <p className="text-[12.5px] font-medium leading-tight">{a.nombre}</p>
                    {a.marca && (
                      <p className="text-[10.5px] text-ink-3">
                        {[a.marca, a.modelo].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {ETIQUETA_TIPO_ACTIVO_GRUPO[a.tipo]}
                  </TableCell>
                  <TableCell>
                    {a.empresa_propietaria_codigo && (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            empresaCodigoColor[a.empresa_propietaria_codigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        {a.empresa_propietaria_codigo}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-ink-3">
                    {a.ubicacion_actual_codigo ?? a.empresa_propietaria_codigo ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ESTADO_ACTIVO[a.estado]}`}
                    >
                      {ETIQUETA_ESTADO_ACTIVO[a.estado]}
                    </span>
                  </TableCell>
                  <TableCell align="right" mono className="text-xs">
                    {fmtMxn.format(Number(a.tarifa_vigente ?? 0))}
                    <span className="ml-1 text-[10px] text-ink-3">
                      /{ETIQUETA_UNIDAD[a.unidad_uso]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {a.alerta !== "ok" && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ALERTA[a.alerta]}`}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {ETIQUETA_ALERTA[a.alerta]}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
