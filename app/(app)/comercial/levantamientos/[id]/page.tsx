import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { esCEO, esRolEn, obtenerVinculos } from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_LEVANTAMIENTO,
  ETIQUETA_ESTADO_LEVANTAMIENTO,
  ETIQUETA_ESTADO_PASO,
  type EstadoLevantamiento,
  type EstadoPasoLevantamiento,
} from "@/lib/levantamientos/state";
import { createClient } from "@/lib/supabase/server";

import { ActualizarLevantamientoForm } from "./actualizar-form";
import { CompletarPasoForm } from "./completar-paso-form";
import { EstadoButtons } from "./estado-buttons";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function LevantamientoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const vinculos = await obtenerVinculos();
  if (vinculos.length === 0) redirect("/mi-dia");

  const supabase = createClient();

  const { data: lev } = await supabase
    .from("levantamientos")
    .select(
      "id, empresa_id, oportunidad_id, vendedor_id, ingeniero_id, cliente_id, fecha_solicitud, fecha_propuesta, fecha_realizada, confirmado_cliente_at, confirmado_ventas_at, confirmado_ingenieria_at, horas_ingeniero, viaticos, kilometraje, costo_calculado, estado, resultado_descripcion, url_informe, centro_id, proyecto_destino_id, observaciones, created_at, empresas(codigo, nombre_comercial), clientes(razon_social), oportunidades(nombre), centros(codigo, nombre)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!lev) notFound();

  const empresaCodigo = lev.empresas?.codigo ?? "";
  const empresaNombre = lev.empresas?.nombre_comercial ?? empresaCodigo;
  const cliente = lev.clientes?.razon_social ?? "—";
  const oportunidad = lev.oportunidades?.nombre ?? null;
  const centroVendedor = lev.centros
    ? `${lev.centros.codigo} — ${lev.centros.nombre}`
    : null;
  const estadoLev = lev.estado as EstadoLevantamiento;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const puedeEditar =
    esCEO(vinculos) ||
    user?.id === lev.vendedor_id ||
    esRolEn(vinculos, lev.empresa_id, ["director", "operativo"]);

  // Pasos del levantamiento
  const { data: pasos } = await supabase
    .from("levantamiento_pasos")
    .select("id, numero, nombre, estado, observaciones, fecha_completado")
    .eq("levantamiento_id", params.id)
    .order("numero");

  // Ingenieros candidatos (rough — usuarios con vínculo a la empresa)
  const { data: usuariosEmp } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .eq("empresa_id", lev.empresa_id)
    .eq("activo", true);
  const ingenieros = Array.from(
    new Set((usuariosEmp ?? []).map((u) => u.usuario_id as string)),
  ).map((id) => ({
    id,
    email: id.slice(0, 8),
  }));

  // Proyectos candidatos para conversión (mismos cliente o empresa)
  const { data: proyectosDestino } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre")
    .eq("empresa_id", lev.empresa_id)
    .eq("activo", true)
    .in("estado", [
      "cotizacion",
      "contrato_firmado",
      "planeacion",
      "en_ejecucion",
    ])
    .order("created_at", { ascending: false })
    .limit(50);

  // Proyecto destino (si convertido)
  let proyectoDestino: { codigo: string; nombre: string } | null = null;
  if (lev.proyecto_destino_id) {
    const { data } = await supabase
      .from("proyectos")
      .select("codigo, nombre")
      .eq("id", lev.proyecto_destino_id)
      .maybeSingle();
    proyectoDestino = data ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/comercial/levantamientos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a levantamientos
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  codigoColor[empresaCodigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="font-medium">{empresaCodigo}</span>
              <span className="text-muted-foreground">· {empresaNombre}</span>
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${COLOR_ESTADO_LEVANTAMIENTO[estadoLev]}`}
              >
                {ETIQUETA_ESTADO_LEVANTAMIENTO[estadoLev]}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold">
              Levantamiento del {lev.fecha_realizada ?? lev.fecha_solicitud}
            </h1>
            <p className="text-sm text-muted-foreground">
              Cliente: {cliente}
              {oportunidad && (
                <>
                  <span className="mx-1">·</span>
                  Oportunidad: {oportunidad}
                </>
              )}
            </p>
          </div>

          {lev.costo_calculado != null && (
            <div className="rounded-lg border border-border bg-bg-2 px-4 py-2 text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Costo calculado
              </p>
              <p className="font-mono text-lg font-semibold tabular-nums">
                {fmt(Number(lev.costo_calculado))}
              </p>
            </div>
          )}
        </div>

        {centroVendedor && (
          <p className="mt-3 text-xs text-muted-foreground">
            Centro vendedor: <span className="font-mono">{centroVendedor}</span>
          </p>
        )}
        {proyectoDestino && (
          <p className="mt-1 text-xs text-emerald-700">
            ✓ Convertido a proyecto:{" "}
            <span className="font-mono">{proyectoDestino.codigo}</span> —{" "}
            {proyectoDestino.nombre}
          </p>
        )}
      </div>

      {/* Pasos del levantamiento */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Checklist (6 pasos)
        </h2>
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Paso</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Completado</th>
                <th className="px-4 py-2 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(pasos ?? []).map((paso) => {
                const estadoPaso = paso.estado as EstadoPasoLevantamiento;
                const completado = estadoPaso === "completado";
                return (
                  <tr
                    key={paso.id}
                    className={completado ? "bg-emerald-50/30" : ""}
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {paso.numero}
                    </td>
                    <td className="px-4 py-3">{paso.nombre}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          completado
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700"
                            : "rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-600"
                        }
                      >
                        {ETIQUETA_ESTADO_PASO[estadoPaso]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {paso.fecha_completado
                        ? new Date(paso.fecha_completado).toLocaleString(
                            "es-MX",
                            { dateStyle: "short", timeStyle: "short" },
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!completado && puedeEditar && (
                        <CompletarPasoForm
                          levantamientoId={lev.id}
                          pasoNumero={paso.numero}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {(pasos ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    Sin pasos. (El trigger debería haberlos creado al insertar.)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Datos editables */}
      <ActualizarLevantamientoForm
        lev={{
          id: lev.id,
          fecha_propuesta: lev.fecha_propuesta,
          fecha_realizada: lev.fecha_realizada,
          ingeniero_id: lev.ingeniero_id,
          horas_ingeniero: lev.horas_ingeniero
            ? Number(lev.horas_ingeniero)
            : null,
          viaticos: lev.viaticos ? Number(lev.viaticos) : null,
          kilometraje: lev.kilometraje ? Number(lev.kilometraje) : null,
          resultado_descripcion: lev.resultado_descripcion,
          url_informe: lev.url_informe,
          observaciones: lev.observaciones,
        }}
        ingenieros={ingenieros}
        puedeEditar={puedeEditar}
      />

      {/* Cambio de estado */}
      {puedeEditar && (
        <EstadoButtons
          levantamientoId={lev.id}
          estado={estadoLev}
          proyectosDestino={proyectosDestino ?? []}
        />
      )}
    </div>
  );
}
