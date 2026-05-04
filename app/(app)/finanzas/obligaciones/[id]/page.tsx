import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Stat } from "@/components/ui/stat";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_OBLIGACION,
  ETIQUETA_ESTADO_OBLIGACION,
  ETIQUETA_TIPO_OBLIGACION,
  type EstadoObligacion,
  type TipoObligacion,
} from "@/lib/obligaciones/state";
import { createClient } from "@/lib/supabase/server";

import { AccionesPanel } from "./acciones-panel";
import { DownloadDocumento } from "./download-documento";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtFecha = (d: string | null) =>
  !d
    ? "—"
    : new Date(d).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

export default async function ObligacionDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: o } = await supabase
    .from("obligaciones_sat")
    .select(
      "*, empresas(codigo, razon_social, nombre_comercial)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!o) notFound();

  const tipo = o.tipo as TipoObligacion;
  const estado = o.estado as EstadoObligacion;
  const empresa = o.empresas as
    | { codigo: string; razon_social: string; nombre_comercial: string | null }
    | null;

  const puedeEditar =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    tieneAtributo(v, "aprobador_financiero") ||
    esRolEn(v, o.empresa_id, ["director", "operativo"]);
  const puedeRevertir = esCEO(v) || tieneAtributo(v, "tesorero_corporativo");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(o.fecha_vencimiento);
  venc.setHours(0, 0, 0, 0);
  const diasAlVencer = Math.round(
    (venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );

  const periodoLabel =
    (o.periodo_label as string | null) ??
    `${o.periodo_anio}${o.periodo_mes ? `-${String(o.periodo_mes).padStart(2, "0")}` : ""}`;

  const isTerminal =
    estado === "pagada" || estado === "no_aplica" || estado === "rechazada";

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-7">
      <div className="mb-6">
        <Link
          href={`/finanzas/obligaciones?anio=${o.periodo_anio}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Obligaciones SAT
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-2 py-0.5 text-[11px] font-medium">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    empresaCodigoColor[empresa?.codigo ?? ""] ??
                    "bg-muted-foreground"
                  }`}
                />
                {empresa?.codigo}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_OBLIGACION[estado]}`}
              >
                {ETIQUETA_ESTADO_OBLIGACION[estado]}
              </span>
            </div>
            <h1 className="mt-2 text-[22px] font-semibold leading-tight">
              {ETIQUETA_TIPO_OBLIGACION[tipo] ?? tipo}
            </h1>
            <p className="mt-1 text-[13px] text-ink-3">
              {periodoLabel} · {empresa?.nombre_comercial ?? empresa?.razon_social}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Vencimiento"
          value={fmtFecha(o.fecha_vencimiento)}
          color={
            !isTerminal && diasAlVencer < 0
              ? "var(--destructive)"
              : !isTerminal && diasAlVencer <= 7
                ? "var(--warning)"
                : undefined
          }
        />
        <Stat
          label={
            isTerminal
              ? "—"
              : diasAlVencer < 0
                ? "Días vencido"
                : diasAlVencer === 0
                  ? "Vence hoy"
                  : "Días al vencer"
          }
          value={
            isTerminal
              ? "—"
              : diasAlVencer < 0
                ? `${Math.abs(diasAlVencer)}`
                : `${diasAlVencer}`
          }
          color={
            !isTerminal && diasAlVencer < 0
              ? "var(--destructive)"
              : !isTerminal && diasAlVencer <= 7
                ? "var(--warning)"
                : undefined
          }
        />
        <Stat
          label="Monto calculado"
          value={
            o.monto_calculado != null
              ? fmtMxn.format(Number(o.monto_calculado))
              : "—"
          }
        />
        <Stat
          label="Monto pagado"
          value={
            o.monto_pagado != null
              ? fmtMxn.format(Number(o.monto_pagado))
              : "—"
          }
          color={o.monto_pagado != null ? "var(--ok)" : undefined}
        />
      </div>

      {/* Línea de tiempo */}
      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Progreso</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Step
            label="Pendiente"
            done={true}
            current={
              estado === "pendiente" ||
              estado === "en_proceso" ||
              estado === "fuera_plazo" ||
              estado === "extemporanea"
            }
            icon={<Clock className="h-3.5 w-3.5" />}
            sub={fmtFecha(o.created_at)}
          />
          <Step
            label="Presentada"
            done={
              estado === "presentada" ||
              estado === "pagada" ||
              estado === "rechazada"
            }
            current={estado === "presentada"}
            icon={<FileText className="h-3.5 w-3.5" />}
            sub={fmtFecha(o.fecha_presentacion as string | null)}
          />
          <Step
            label={
              estado === "no_aplica"
                ? "No aplica"
                : estado === "rechazada"
                  ? "Rechazada"
                  : "Pagada"
            }
            done={isTerminal}
            current={isTerminal}
            icon={
              estado === "rechazada" ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )
            }
            sub={fmtFecha((o.fecha_pago as string | null) ?? null)}
            destructive={estado === "rechazada"}
          />
        </div>
      </section>

      {/* Documentos */}
      {(o.url_acuse || o.url_comprobante) && (
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-[13.5px] font-semibold">Documentos</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {o.url_acuse && (
              <DownloadDocumento
                label="Acuse SAT"
                path={o.url_acuse as string}
                kind="acuse"
                obligacionId={params.id}
                puedeEliminar={puedeRevertir}
              />
            )}
            {o.url_comprobante && (
              <DownloadDocumento
                label="Comprobante de pago"
                path={o.url_comprobante as string}
                kind="comprobante"
                obligacionId={params.id}
                puedeEliminar={puedeRevertir}
              />
            )}
          </div>
        </section>
      )}

      {/* Acciones */}
      {puedeEditar && (
        <div className="mb-5">
          <AccionesPanel
            obligacionId={params.id}
            estadoActual={estado}
            puedeRevertir={puedeRevertir}
          />
        </div>
      )}

      {/* Información adicional */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Información</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
          <Field
            label="Número de operación"
            value={(o.numero_operacion as string | null) ?? "—"}
            mono
          />
          <Field
            label="Saldo a favor"
            value={
              o.saldo_a_favor != null
                ? fmtMxn.format(Number(o.saldo_a_favor))
                : "—"
            }
            mono
          />
          <Field
            label="Fecha presentación"
            value={fmtFecha(o.fecha_presentacion as string | null)}
          />
          <Field
            label="Fecha pago"
            value={fmtFecha(o.fecha_pago as string | null)}
          />
          <div className="sm:col-span-2">
            <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">
              Observaciones
            </dt>
            <dd className="mt-0.5 whitespace-pre-wrap">
              {(o.observaciones as string | null) ?? "—"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Step({
  label,
  done,
  current,
  icon,
  sub,
  destructive,
}: {
  label: string;
  done: boolean;
  current: boolean;
  icon: React.ReactNode;
  sub: string;
  destructive?: boolean;
}) {
  const palette = destructive
    ? "border-red-300 bg-red-50 text-red-800"
    : done
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : current
        ? "border-brand bg-brand/10 text-brand"
        : "border-border bg-bg-2/40 text-ink-3";
  return (
    <div className={`rounded-md border px-3 py-2 ${palette}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <p className="mt-0.5 text-[10.5px] opacity-80">{sub}</p>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">
        {label}
      </dt>
      <dd className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
