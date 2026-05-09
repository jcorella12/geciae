import { AlertTriangle, Download, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { fmtFechaCorta } from "@/lib/fechas";
import {
  COLOR_ESTADO_DESCARGA,
  ETIQUETA_ESTADO_DESCARGA,
  type EstadoDescargaSat,
} from "@/lib/sat/state";
import { createClient } from "@/lib/supabase/server";

import { listarDescargas } from "./descarga-actions";
import { listarFiels } from "./fiel-actions";
import { TablaFiels } from "./tabla-fiels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configuración SAT" };

type EmpresaRow = { id: string; codigo: string; rfc: string };

export default async function ConfiguracionSatPage() {
  const [fiels, descargas] = await Promise.all([
    listarFiels(),
    listarDescargas(),
  ]);

  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, rfc")
    .in("id", empresasIds)
    .order("codigo")) as unknown as { data: EmpresaRow[] | null };

  const porVencer = fiels.filter((f) => f.estatus_vigencia === "por_vencer");
  const vencidas = fiels.filter((f) => f.estatus_vigencia === "vencida");

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-7">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lbl-mini">Configuración · SAT</p>
          <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
            Descarga directa SAT
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            FIELs por empresa y descarga masiva de CFDIs desde el servicio
            oficial del SAT.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/configuracion/sat/nueva-descarga">
              <Download className="mr-1.5 h-4 w-4" />
              Nueva descarga
            </Link>
          </Button>
        </div>
      </header>

      {(vencidas.length > 0 || porVencer.length > 0) && (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
            <div>
              <h2 className="text-[14px] font-semibold text-amber-900">
                Atención: FIELs por revisar
              </h2>
              <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-amber-900">
                {vencidas.map((f) => (
                  <li key={f.id}>
                    <strong>{f.empresa_codigo}</strong>: FIEL VENCIDA desde{" "}
                    {fmtFechaCorta(f.vigencia_hasta)}
                  </li>
                ))}
                {porVencer.map((f) => (
                  <li key={f.id}>
                    <strong>{f.empresa_codigo}</strong>: FIEL vence en{" "}
                    {f.dias_restantes} días ({fmtFechaCorta(f.vigencia_hasta)})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* FIELs */}
      <section className="mb-8">
        <h2 className="mb-3 text-[15px] font-semibold">FIELs por empresa</h2>
        <TablaFiels empresas={empresas ?? []} fiels={fiels} />
      </section>

      {/* Descargas recientes */}
      <section>
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Descargas recientes</h2>
          <Link
            href="/configuracion/sat/nueva-descarga"
            className="text-[12px] text-brand hover:underline"
          >
            <Plus className="inline h-3 w-3" /> Nueva descarga
          </Link>
        </header>
        {descargas.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-[13px] text-ink-3">
            Sin descargas todavía.{" "}
            <Link
              href="/configuracion/sat/nueva-descarga"
              className="text-brand hover:underline"
            >
              Solicitar primera →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-[12.5px]">
              <thead className="bg-bg-2 text-[10.5px] uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium">Empresa</th>
                  <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-medium">Periodo</th>
                  <th className="px-3 py-2.5 text-left font-medium">Estado</th>
                  <th className="px-3 py-2.5 text-right font-medium">CFDIs</th>
                  <th className="px-3 py-2.5 text-left font-medium">
                    Solicitada
                  </th>
                </tr>
              </thead>
              <tbody>
                {descargas.map((d) => (
                  <tr
                    key={d.id}
                    className="border-t border-border hover:bg-bg-2/40"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/configuracion/sat/descargas/${d.id}`}
                        className="font-mono text-[11px] text-brand hover:underline"
                      >
                        {d.empresas?.codigo ?? "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.tipo_descarga === "emitidos"
                        ? "Emitidos"
                        : "Recibidos"}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      {fmtFechaCorta(d.fecha_inicio)} →{" "}
                      {fmtFechaCorta(d.fecha_fin)}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                          COLOR_ESTADO_DESCARGA[d.estado as EstadoDescargaSat]
                        }`}
                      >
                        {ETIQUETA_ESTADO_DESCARGA[d.estado as EstadoDescargaSat]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tnum">
                      {d.estado === "completada"
                        ? `${d.cfdis_importados} / ${d.cfdis_descargados}`
                        : (d.numero_cfdis_estimados ?? "—")}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-ink-3">
                      {fmtFechaCorta(d.iniciada_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
