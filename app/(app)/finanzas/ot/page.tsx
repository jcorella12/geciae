import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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
import { ESTADOS_OT, type EstadoOT } from "@/lib/ot/state";
import { createClient } from "@/lib/supabase/server";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

export default async function OTListPage({
  searchParams,
}: {
  searchParams?: { estado?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puedeCrear =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    v.some((vi) => ["director", "operativo"].includes(vi.rol));

  let q = supabase
    .from("ordenes_trabajo_inter_co")
    .select(
      `id, numero, descripcion, empresa_origen_id, empresa_destino_id, fecha_solicitud, fecha_completacion_esperada, total, estado,
       servicio:catalogo_servicios(codigo, nombre),
       proyecto:proyectos(id, codigo, nombre),
       origen:empresas!ordenes_trabajo_inter_co_empresa_origen_id_fkey(codigo, razon_social),
       destino:empresas!ordenes_trabajo_inter_co_empresa_destino_id_fkey(codigo, razon_social)`,
    )
    .order("fecha_solicitud", { ascending: false });

  if (searchParams?.estado)
    q = q.eq("estado", searchParams.estado as EstadoOT);

  const { data: ots } = await q;

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">
            OT inter-compañías
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Órdenes de trabajo entre las empresas del grupo. Margen
            inter-co configurable, doble confirmación, generación de CFDI.
          </p>
        </div>
        {puedeCrear && (
          <Link href="/finanzas/ot/nueva">
            <Button>
              <Plus className="h-4 w-4" /> Nueva OT
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/finanzas/ot">
          <button
            className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${
              !searchParams?.estado
                ? "bg-brand text-brand-fg"
                : "bg-bg-2 text-ink-2 hover:bg-bg-3"
            }`}
          >
            Todas
          </button>
        </Link>
        {ESTADOS_OT.map((e) => (
          <Link key={e.value} href={`/finanzas/ot?estado=${e.value}`}>
            <button
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition ${
                searchParams?.estado === e.value
                  ? "bg-brand text-brand-fg"
                  : "bg-bg-2 text-ink-2 hover:bg-bg-3"
              }`}
            >
              {e.label}
            </button>
          </Link>
        ))}
      </div>

      {(ots?.length ?? 0) === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin OT registradas.
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Número</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Origen → Destino</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead align="right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ots ?? []).map((o) => {
                const estadoCfg = ESTADOS_OT.find((e) => e.value === o.estado);
                const origen = o.origen as { codigo: string; razon_social: string } | null;
                const destino = o.destino as { codigo: string; razon_social: string } | null;
                const proyecto = o.proyecto as { id: string; codigo: string; nombre: string } | null;
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link
                        href={`/finanzas/ot/${o.id}`}
                        className="font-mono text-xs text-brand hover:underline"
                      >
                        {o.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoCfg?.color ?? "bg-bg-2"}`}
                      >
                        {estadoCfg?.label ?? o.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[origen?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {origen?.codigo}
                        </span>
                        <span className="text-ink-4">→</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              empresaCodigoColor[destino?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          {destino?.codigo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <p className="line-clamp-1 max-w-xs">{o.descripcion}</p>
                    </TableCell>
                    <TableCell className="text-xs">
                      {proyecto ? (
                        <Link
                          href={`/proyectos/${proyecto.id}`}
                          className="text-brand hover:underline"
                        >
                          {proyecto.codigo}
                        </Link>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      <p>
                        Sol:{" "}
                        {new Date(o.fecha_solicitud).toLocaleDateString(
                          "es-MX",
                        )}
                      </p>
                      {o.fecha_completacion_esperada && (
                        <p>
                          Esp:{" "}
                          {new Date(
                            o.fecha_completacion_esperada,
                          ).toLocaleDateString("es-MX")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(Number(o.total ?? 0))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}
