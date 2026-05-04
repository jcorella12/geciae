import Link from "next/link";
import { notFound } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  puedeAprobarPrestamo,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_PRESTAMO,
  ETIQUETA_ESTADO_PRESTAMO,
  type EstadoPrestamo,
} from "@/lib/prestamos/state";
import { createClient } from "@/lib/supabase/server";

import { PrestamoActions } from "./prestamo-actions";

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

const fmtPct = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export default async function PrestamoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("prestamos_inter_co")
    .select(
      `*,
       acreedora:empresas!prestamos_inter_co_empresa_acreedora_id_fkey(codigo, razon_social, nombre_comercial),
       deudora:empresas!prestamos_inter_co_empresa_deudora_id_fkey(codigo, razon_social, nombre_comercial),
       linea:lineas_credito_inter_co(id, tasa_base, spread, capitaliza_intereses, vigencia_inicio, vigencia_fin)`,
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!p) notFound();

  const { data: intereses } = await supabase
    .from("prestamos_intereses")
    .select("fecha, saldo_principal, tasa_aplicada, intereses_dia, intereses_acumulados")
    .eq("prestamo_id", params.id)
    .order("fecha", { ascending: false })
    .limit(60);

  const v = await obtenerVinculos();
  const monto = Number(p.monto ?? 0);
  const pagado = Number(p.monto_pagado ?? 0);
  const saldo = Number(p.saldo_pendiente ?? monto - pagado);
  const estado = p.estado as EstadoPrestamo;

  const interesesTotal = (intereses ?? []).reduce(
    (acc, r) => acc + Number(r.intereses_dia ?? 0),
    0,
  );

  const permisos = {
    puedeAprobar: puedeAprobarPrestamo(v, p.empresa_acreedora_id, monto),
    puedeEjecutar: esCEO(v) || tieneAtributo(v, "tesorero_corporativo"),
    puedeConfirmar:
      esCEO(v) || esRolEn(v, p.empresa_deudora_id, "director"),
    puedePagar:
      esCEO(v) ||
      tieneAtributo(v, "tesorero_corporativo") ||
      esRolEn(v, p.empresa_deudora_id, "director"),
    puedeCancelar:
      esCEO(v) ||
      tieneAtributo(v, "tesorero_corporativo") ||
      esRolEn(v, p.empresa_acreedora_id, "director") ||
      esRolEn(v, p.empresa_deudora_id, "director"),
  };

  const acr = p.acreedora as { codigo: string; nombre_comercial: string | null; razon_social: string } | null;
  const deu = p.deudora as { codigo: string; nombre_comercial: string | null; razon_social: string } | null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria/prestamos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Préstamos
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold leading-tight">
            Préstamo {p.numero}
          </h1>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO_PRESTAMO[estado]}`}
          >
            {ETIQUETA_ESTADO_PRESTAMO[estado]}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Acreedora (presta)</p>
                <p className="mt-0.5 inline-flex items-center gap-2 text-sm font-medium">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      empresaCodigoColor[acr?.codigo ?? ""] ?? "bg-muted-foreground"
                    }`}
                  />
                  {acr?.nombre_comercial ?? acr?.razon_social ?? "?"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deudora (recibe)</p>
                <p className="mt-0.5 inline-flex items-center gap-2 text-sm font-medium">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      empresaCodigoColor[deu?.codigo ?? ""] ?? "bg-muted-foreground"
                    }`}
                  />
                  {deu?.nombre_comercial ?? deu?.razon_social ?? "?"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Solicitado</p>
                <p className="mt-0.5 text-sm">
                  {new Date(p.fecha_solicitud).toLocaleDateString("es-MX")}
                </p>
              </div>
              {p.fecha_aprobacion && (
                <div>
                  <p className="text-xs text-muted-foreground">Aprobado</p>
                  <p className="mt-0.5 text-sm">
                    {new Date(p.fecha_aprobacion).toLocaleDateString("es-MX")}
                  </p>
                </div>
              )}
              {p.fecha_ejecucion && (
                <div>
                  <p className="text-xs text-muted-foreground">Ejecutado</p>
                  <p className="mt-0.5 text-sm">
                    {new Date(p.fecha_ejecucion).toLocaleDateString("es-MX")}
                  </p>
                </div>
              )}
              {p.fecha_confirmacion && (
                <div>
                  <p className="text-xs text-muted-foreground">Confirmado</p>
                  <p className="mt-0.5 text-sm">
                    {new Date(p.fecha_confirmacion).toLocaleDateString("es-MX")}
                  </p>
                </div>
              )}
              {p.fecha_vencimiento && (
                <div>
                  <p className="text-xs text-muted-foreground">Vencimiento</p>
                  <p className="mt-0.5 text-sm">
                    {new Date(p.fecha_vencimiento).toLocaleDateString("es-MX")}
                  </p>
                </div>
              )}
              {p.comprobante_transferencia && (
                <div>
                  <p className="text-xs text-muted-foreground">Comprobante</p>
                  <p className="mt-0.5 font-mono text-xs">
                    {p.comprobante_transferencia}
                  </p>
                </div>
              )}
            </div>
            {p.motivo && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Motivo / destino</p>
                <p className="mt-1 text-sm">{p.motivo}</p>
              </div>
            )}
            {p.observaciones && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Observaciones</p>
                <p className="mt-1 text-sm">{p.observaciones}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Acciones</h2>
            <div className="mt-3">
              <PrestamoActions
                prestamoId={p.id}
                estado={estado}
                saldoPendiente={saldo}
                permisos={permisos}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Intereses devengados</h2>
              <p className="text-xs text-muted-foreground">
                Total acumulado:{" "}
                <span className="font-mono font-medium text-foreground">
                  {fmtMxn.format(interesesTotal)}
                </span>
              </p>
            </div>
            {(intereses?.length ?? 0) === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Aún no hay intereses calculados. Se devengan automáticamente
                cada día (TIIE 28 + spread / 360).
              </p>
            ) : (
              <div className="mt-3 max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-card text-left text-muted-foreground">
                    <tr>
                      <th className="py-1 font-medium">Fecha</th>
                      <th className="py-1 text-right font-medium">Saldo</th>
                      <th className="py-1 text-right font-medium">Tasa</th>
                      <th className="py-1 text-right font-medium">Día</th>
                      <th className="py-1 text-right font-medium">Mes acum.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(intereses ?? []).map((r) => (
                      <tr key={r.fecha}>
                        <td className="py-1.5 font-mono">
                          {new Date(r.fecha).toLocaleDateString("es-MX")}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {fmtMxn.format(Number(r.saldo_principal))}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {fmtPct.format(Number(r.tasa_aplicada))}
                        </td>
                        <td className="py-1.5 text-right font-mono">
                          {Number(r.intereses_dia).toLocaleString("es-MX", {
                            style: "currency",
                            currency: "MXN",
                            maximumFractionDigits: 4,
                          })}
                        </td>
                        <td className="py-1.5 text-right font-mono font-medium">
                          {fmtMxn.format(Number(r.intereses_acumulados))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Monto del préstamo
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">
              {fmtMxn.format(monto)}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado</span>
                <span className="font-mono">{fmtMxn.format(pagado)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Saldo pendiente</span>
                <span className="font-mono">{fmtMxn.format(saldo)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: `${
                      monto > 0
                        ? Math.min((pagado / monto) * 100, 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {p.linea && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Línea de crédito
              </p>
              <p className="mt-1 text-xs">
                {(p.linea as { tasa_base: string }).tasa_base?.toUpperCase() ??
                  "—"}{" "}
                + spread{" "}
                {fmtPct.format(Number((p.linea as { spread: number }).spread ?? 0))}
              </p>
              <Link
                href={`/finanzas/tesoreria/creditos`}
                className="mt-2 inline-block text-xs text-primary hover:underline"
              >
                Ver línea →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
