import { Box, ShieldCheck, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ESTADOS_SERIE, type EstadoSerie } from "../state";

import { SerieEditPanel } from "./edit-panel";

export const dynamic = "force-dynamic";

const fmtFecha = (d: string | null) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y.slice(2)}`;
};

export default async function SerieDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: serie } = await supabase
    .from("v_productos_serie_lista" as never)
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!serie) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = serie as any;

  // Cargar opciones para edit panel
  const [{ data: almacenes }, { data: proyectos }, { data: clientes }] =
    await Promise.all([
      supabase
        .from("almacenes")
        .select("id, codigo, nombre, empresa_id")
        .eq("activo", true)
        .order("codigo"),
      supabase
        .from("proyectos")
        .select("id, codigo, nombre")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("clientes")
        .select("id, razon_social, rfc")
        .eq("activo", true)
        .order("razon_social"),
    ]);

  const estadoSpec =
    ESTADOS_SERIE.find((e) => e.value === s.estado) ?? ESTADOS_SERIE[0];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/inventario/series"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Series
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
          <Box className="h-6 w-6" />
          <span className="font-mono">{s.numero_serie}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium">{s.producto_nombre}</span>{" "}
          <code className="ml-1 font-mono text-[11px]">
            {s.producto_codigo}
          </code>
          {s.producto_marca && ` · ${s.producto_marca}`}
          {s.producto_modelo && ` · ${s.producto_modelo}`}
        </p>
      </div>

      {/* Estado + garantía */}
      <section className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card p-4">
        <span
          className={`rounded-full px-2.5 py-1 text-[12.5px] font-medium ${estadoSpec.badge}`}
        >
          {estadoSpec.label}
        </span>
        {s.estado_garantia === "vencida" ? (
          <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[12.5px] font-medium text-red-800">
            <ShieldAlert className="h-3.5 w-3.5" />
            Garantía vencida
          </span>
        ) : s.estado_garantia === "vigente" ||
          s.estado_garantia === "por_vencer" ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[12.5px] font-medium text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Garantía vigente
            {s.dias_garantia_restantes != null &&
              ` · ${s.dias_garantia_restantes} días restantes`}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[12.5px] text-slate-700">
            Sin garantía
          </span>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-[14px] font-semibold">Datos del registro</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-ink-3">Fecha compra</dt>
            <dd className="font-mono">{fmtFecha(s.fecha_compra)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-3">Garantía inicio</dt>
            <dd className="font-mono">{fmtFecha(s.garantia_inicio)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-3">Garantía fin</dt>
            <dd className="font-mono">{fmtFecha(s.garantia_fin)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-3">Instalación</dt>
            <dd className="font-mono">{fmtFecha(s.fecha_instalacion)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-3">Almacén</dt>
            <dd>
              {s.almacen_codigo ? (
                <>
                  <code className="font-mono">{s.almacen_codigo}</code> ·{" "}
                  {s.almacen_nombre}
                </>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-ink-3">Ubicación actual</dt>
            <dd>{s.ubicacion_actual ?? "—"}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase text-ink-3">Proyecto</dt>
            <dd>
              {s.proyecto_codigo ? (
                <Link
                  href={`/proyectos/${s.proyecto_id}`}
                  className="text-primary hover:underline"
                >
                  <code className="font-mono">{s.proyecto_codigo}</code> ·{" "}
                  {s.proyecto_nombre}
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase text-ink-3">Cliente</dt>
            <dd>{s.cliente_razon_social ?? "—"}</dd>
          </div>
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase text-ink-3">Observaciones</dt>
            <dd className="whitespace-pre-wrap">{s.observaciones ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <SerieEditPanel
        serieId={s.id as string}
        estadoActual={s.estado as EstadoSerie}
        almacenes={(almacenes ?? []).map((a) => ({
          id: a.id,
          codigo: a.codigo,
          nombre: a.nombre,
        }))}
        proyectos={(proyectos ?? []).map((p) => ({
          id: p.id,
          codigo: p.codigo,
          nombre: p.nombre,
        }))}
        clientes={(clientes ?? []).map((c) => ({
          id: c.id,
          razon_social: c.razon_social,
          rfc: c.rfc,
        }))}
        defaults={{
          almacenId: s.almacen_id ?? null,
          proyectoId: s.proyecto_id ?? null,
          clienteId: s.cliente_id ?? null,
          ubicacionActual: s.ubicacion_actual ?? null,
          fechaInstalacion: s.fecha_instalacion ?? null,
        }}
      />
    </div>
  );
}
