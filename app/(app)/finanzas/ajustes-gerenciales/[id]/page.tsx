import Link from "next/link";
import { notFound } from "next/navigation";

import {
  COLOR_ESTADO_AJUSTE,
  ETIQUETA_CONTRAPARTE,
  ETIQUETA_ESTADO_AJUSTE,
  ETIQUETA_NATURALEZA,
  ETIQUETA_TIPO_AJUSTE,
  ETIQUETA_TIPO_DOCUMENTO,
  type ContraparteRelacion,
  type EstadoAjusteGerencial,
  type TipoAjusteGerencial,
  type TipoDocumentoAjuste,
} from "@/lib/ajustes-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

import { obtenerAjuste } from "../actions";
import { AccionesAjuste } from "./acciones-ajuste";
import { SubirDocumento } from "./subir-documento";

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const dynamic = "force-dynamic";

export default async function DetalleAjustePage({
  params,
}: {
  params: { id: string };
}) {
  let ajuste, documentos;
  try {
    const r = await obtenerAjuste(params.id);
    ajuste = r.ajuste;
    documentos = r.documentos;
  } catch {
    notFound();
  }
  if (!ajuste) notFound();

  const estado = ajuste.estado as EstadoAjusteGerencial;
  const tipo = ajuste.tipo as TipoAjusteGerencial;

  // Audit log: solo si CEO
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: esCeoData } = await (supabase as any).rpc("usuario_es_ceo");
  const esCeo = Boolean(esCeoData);

  let auditLog: Array<{
    id: string;
    accion: string;
    created_at: string;
    detalles: Record<string, unknown> | null;
    usuario_id: string;
  }> = [];
  if (esCeo) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: aud } = await (supabase as any)
      .from("ajustes_gerenciales_audit")
      .select("id, accion, created_at, detalles, usuario_id")
      .eq("ajuste_id", params.id)
      .order("created_at", { ascending: false })
      .limit(50);
    auditLog = aud ?? [];
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-8 py-7">
      <div className="mb-2">
        <Link
          href="/finanzas/ajustes-gerenciales"
          className="text-[12px] text-ink-3 hover:underline"
        >
          ← Volver a Ajustes gerenciales
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] text-ink-3">{ajuste.codigo}</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight">
            {ETIQUETA_TIPO_AJUSTE[tipo]}
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-2">{ajuste.descripcion}</p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_AJUSTE[estado]}`}
            >
              {ETIQUETA_ESTADO_AJUSTE[estado]}
            </span>
            <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-ink-3">
              {ETIQUETA_NATURALEZA[ajuste.naturaleza]}
            </span>
            <span className="text-[11px] text-ink-3">
              {ajuste.empresa_codigo} · {ajuste.empresa_nombre ?? ""}
            </span>
          </div>
        </div>

        <AccionesAjuste id={params.id} estado={estado} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Datos */}
        <section className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-4 text-[14px] font-semibold">Datos del ajuste</h2>
          <dl className="grid gap-3 text-[12.5px] sm:grid-cols-2">
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                Valor original
              </dt>
              <dd className="mt-0.5 font-mono text-[15px] font-semibold tnum">
                {fmt.format(Number(ajuste.valor))}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                Valor en libros
              </dt>
              <dd className="mt-0.5 font-mono text-[15px] font-semibold tnum">
                {fmt.format(Number(ajuste.valor_en_libros ?? ajuste.valor))}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                Fecha de adquisición
              </dt>
              <dd className="mt-0.5">
                {new Date(ajuste.fecha_adquisicion).toLocaleDateString("es-MX")}
              </dd>
            </div>
            <div>
              <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                Fecha de registro
              </dt>
              <dd className="mt-0.5">
                {new Date(ajuste.fecha_registro).toLocaleDateString("es-MX")}
              </dd>
            </div>
            {ajuste.vida_util_anios && (
              <>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                    Vida útil
                  </dt>
                  <dd className="mt-0.5">{ajuste.vida_util_anios} años</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                    Valor residual
                  </dt>
                  <dd className="mt-0.5">{ajuste.valor_residual_pct}%</dd>
                </div>
              </>
            )}
            {ajuste.contraparte_nombre && (
              <>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                    Contraparte
                  </dt>
                  <dd className="mt-0.5">{ajuste.contraparte_nombre}</dd>
                </div>
                <div>
                  <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
                    Relación
                  </dt>
                  <dd className="mt-0.5">
                    {ajuste.contraparte_relacion
                      ? ETIQUETA_CONTRAPARTE[ajuste.contraparte_relacion as ContraparteRelacion]
                      : "—"}
                  </dd>
                </div>
              </>
            )}
            {ajuste.regularizado_fecha && (
              <div className="sm:col-span-2 rounded-md border border-sky-200 bg-sky-50 p-3">
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-sky-900">
                  Regularizado fiscalmente
                </dt>
                <dd className="mt-1 text-[12px] text-sky-900">
                  Fecha:{" "}
                  {new Date(ajuste.regularizado_fecha).toLocaleDateString(
                    "es-MX",
                  )}
                </dd>
                {ajuste.regularizado_observaciones && (
                  <dd className="mt-1 text-[11.5px] text-sky-800">
                    {ajuste.regularizado_observaciones}
                  </dd>
                )}
              </div>
            )}
          </dl>

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
              Justificación
            </h3>
            <p className="whitespace-pre-line text-[12.5px] leading-relaxed">
              {ajuste.justificacion}
            </p>
          </div>

          {ajuste.observaciones_origen && (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                Observaciones de origen
              </h3>
              <p className="whitespace-pre-line text-[12.5px]">
                {ajuste.observaciones_origen}
              </p>
            </div>
          )}

          {ajuste.observaciones && (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                Observaciones
              </h3>
              <p className="whitespace-pre-line text-[12.5px]">
                {ajuste.observaciones}
              </p>
            </div>
          )}
        </section>

        {/* Sidebar: documentos + audit (si CEO) */}
        <div className="space-y-6">
          <section className="rounded-md border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold">Documentos de soporte</h2>
              <span className="rounded-full bg-bg-2 px-2 py-0.5 text-[10.5px] tabular-nums text-ink-3">
                {documentos.length}
              </span>
            </div>

            {documentos.length === 0 ? (
              <p className="text-[12px] text-ink-3">Aún sin documentos.</p>
            ) : (
              <ul className="space-y-1.5">
                {documentos.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-md border border-border px-3 py-2"
                  >
                    <div className="text-[12.5px] font-medium leading-tight">
                      {d.nombre}
                    </div>
                    <div className="mt-0.5 text-[10.5px] text-ink-3">
                      {ETIQUETA_TIPO_DOCUMENTO[d.tipo_documento as TipoDocumentoAjuste]}
                      {d.fecha_documento &&
                        ` · ${new Date(d.fecha_documento).toLocaleDateString("es-MX")}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-border pt-3">
              <SubirDocumento ajusteId={params.id} />
            </div>
          </section>

          {esCeo && auditLog.length > 0 && (
            <section className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 text-[14px] font-semibold">Audit log</h2>
              <p className="mb-3 text-[10.5px] text-ink-3">
                Visible solo para CEO. Últimas {auditLog.length} entradas.
              </p>
              <ul className="space-y-1.5 text-[11.5px]">
                {auditLog.map((a) => (
                  <li
                    key={a.id}
                    className="border-b border-border pb-1.5 last:border-0"
                  >
                    <span className="font-mono text-[10.5px] text-ink-3">
                      {new Date(a.created_at).toLocaleString("es-MX")}
                    </span>
                    <span className="ml-2 font-medium">{a.accion}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
