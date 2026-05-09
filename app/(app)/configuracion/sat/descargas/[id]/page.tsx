import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  Package,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { fmtFechaCorta } from "@/lib/fechas";
import {
  COLOR_ESTADO_DESCARGA,
  ETIQUETA_ESTADO_DESCARGA,
  type EstadoDescargaSat,
} from "@/lib/sat/state";

import { obtenerDescarga } from "../../descarga-actions";
import { BotonesFlujo } from "./botones-flujo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Descarga SAT" };

const PASOS: Array<{
  estado: EstadoDescargaSat;
  label: string;
  icon: typeof Clock;
}> = [
  { estado: "borrador", label: "Solicitud creada", icon: FileSearch },
  { estado: "solicitada", label: "Enviada al SAT", icon: Clock },
  { estado: "lista_descargar", label: "Paquetes listos", icon: Package },
  { estado: "descargando", label: "Descargando", icon: Download },
  { estado: "completada", label: "Completada", icon: CheckCircle2 },
];

const ORDEN_ESTADO: Record<EstadoDescargaSat, number> = {
  borrador: 0,
  solicitada: 1,
  verificando: 1,
  lista_descargar: 2,
  descargando: 3,
  descargada: 3,
  procesando: 3,
  completada: 4,
  error: -1,
  expirada: -1,
};

export default async function DetalleDescargaPage({
  params,
}: {
  params: { id: string };
}) {
  const desc = await obtenerDescarga(params.id);
  if (!desc) notFound();

  const estado = desc.estado as EstadoDescargaSat;
  const pasoActual = ORDEN_ESTADO[estado];

  return (
    <div className="mx-auto w-full max-w-[1100px] px-8 py-7">
      <div className="mb-2">
        <Link
          href="/configuracion/sat"
          className="text-[12px] text-ink-3 hover:underline"
        >
          ← Configuración SAT
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold leading-tight">
            Descarga SAT — {desc.empresas?.codigo ?? "?"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {desc.tipo_descarga === "emitidos" ? "Emitidos" : "Recibidos"} ·{" "}
            {fmtFechaCorta(desc.fecha_inicio)} →{" "}
            {fmtFechaCorta(desc.fecha_fin)}
          </p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              COLOR_ESTADO_DESCARGA[estado]
            }`}
          >
            {ETIQUETA_ESTADO_DESCARGA[estado]}
          </span>
        </div>
        <BotonesFlujo descarga={desc} />
      </div>

      {/* Timeline visual */}
      <section className="mb-6 rounded-md border border-border bg-card p-5">
        <h2 className="mb-4 text-[14px] font-semibold">Flujo</h2>
        <ol className="grid grid-cols-5 gap-2">
          {PASOS.map((p, idx) => {
            const Icon = p.icon;
            const completado = pasoActual >= idx && pasoActual >= 0;
            const actual = ORDEN_ESTADO[estado] === idx && estado !== "completada";
            const conError = estado === "error" || estado === "expirada";

            let claseDot = "bg-bg-2 text-ink-3";
            if (conError && idx > pasoActual) claseDot = "bg-danger/15 text-danger-deep";
            else if (completado) claseDot = "bg-emerald-100 text-emerald-700";
            else if (actual) claseDot = "bg-amber-100 text-amber-700";

            return (
              <li key={p.estado} className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${claseDot}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-center text-[10.5px]">{p.label}</div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Datos */}
      <section className="mb-6 rounded-md border border-border bg-card p-5">
        <h2 className="mb-3 text-[14px] font-semibold">Datos</h2>
        <dl className="grid gap-3 text-[12.5px] sm:grid-cols-2">
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Empresa
            </dt>
            <dd className="mt-0.5 font-mono">{desc.empresas?.codigo}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Tipo
            </dt>
            <dd className="mt-0.5">
              {desc.tipo_descarga === "emitidos" ? "Emitidos" : "Recibidos"}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Período
            </dt>
            <dd className="mt-0.5 font-mono">
              {fmtFechaCorta(desc.fecha_inicio)} →{" "}
              {fmtFechaCorta(desc.fecha_fin)}
            </dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
              Solicitada
            </dt>
            <dd className="mt-0.5">
              {new Date(desc.iniciada_at).toLocaleString("es-MX")}
            </dd>
          </div>
          {desc.sat_request_id && (
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                Request ID SAT
              </dt>
              <dd className="mt-0.5 break-all font-mono text-[11px]">
                {desc.sat_request_id}
              </dd>
            </div>
          )}
          {desc.intentos_verificacion > 0 && (
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                Verificaciones
              </dt>
              <dd className="mt-0.5">
                {desc.intentos_verificacion}
                {desc.ultima_verificacion_at && (
                  <span className="ml-2 text-ink-3">
                    · última{" "}
                    {new Date(desc.ultima_verificacion_at).toLocaleString(
                      "es-MX",
                    )}
                  </span>
                )}
              </dd>
            </div>
          )}
          {desc.numero_cfdis_estimados !== null && (
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                CFDIs estimados
              </dt>
              <dd className="mt-0.5 font-mono tnum">
                {desc.numero_cfdis_estimados}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Resultado si completada */}
      {estado === "completada" && (
        <section className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="mb-3 text-[14px] font-semibold text-emerald-900">
            Descarga completada
          </h2>
          <div className="grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-emerald-800">
                Total descargados
              </div>
              <div className="mt-1 font-mono text-[18px] font-semibold tnum">
                {desc.cfdis_descargados}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-emerald-800">
                Importados (nuevos)
              </div>
              <div className="mt-1 font-mono text-[18px] font-semibold tnum text-emerald-700">
                {desc.cfdis_importados}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-emerald-800">
                Duplicados
              </div>
              <div className="mt-1 font-mono text-[18px] font-semibold tnum text-ink-3">
                {desc.cfdis_duplicados}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide text-emerald-800">
                Errores
              </div>
              <div
                className={`mt-1 font-mono text-[18px] font-semibold tnum ${
                  desc.cfdis_con_error > 0 ? "text-danger-deep" : "text-ink-3"
                }`}
              >
                {desc.cfdis_con_error}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11.5px] text-emerald-900">
            Los CFDIs nuevos ya aparecen en{" "}
            <Link href="/finanzas/cfdi" className="underline">
              /finanzas/cfdi
            </Link>
            .
          </p>
        </section>
      )}

      {/* Error si aplica */}
      {(estado === "error" || estado === "expirada") && desc.error_mensaje && (
        <section className="mb-6 rounded-md border border-danger/30 bg-danger/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger-deep" />
            <div>
              <h2 className="text-[14px] font-semibold text-danger-deep">
                {estado === "expirada" ? "Descarga expirada" : "Error"}
              </h2>
              <p className="mt-1 text-[12.5px] text-danger-deep">
                {desc.error_mensaje}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
