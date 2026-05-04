import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { puedeVerConsolidado } from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vista pájaro · 4 empresas" };

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtMxnK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return fmtMxn.format(n);
};

const empresaCodigoColor: Record<string, string> = {
  PSE: "var(--c-pse)",
  CIAE: "var(--c-ciae)",
  IED: "var(--c-ied)",
  LIMSON: "var(--c-limson)",
};

export default async function VistaPajaroPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puedeConsolidado = puedeVerConsolidado(v);

  if (!puedeConsolidado) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 text-center">
        <h1 className="text-xl font-semibold">Acceso restringido</h1>
        <p className="mt-2 text-[13px] text-ink-3">
          La vista consolidada del grupo solo está disponible para CEO y
          tesorero corporativo.
        </p>
      </div>
    );
  }

  const empresasUser = Array.from(new Set(v.map((x) => x.empresa_id)));

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", empresasUser)
    .eq("activa", true)
    .order("codigo");

  // Por empresa: proyectos + CFDI + OCs + estados financieros mes actual
  const stats = await Promise.all(
    (empresas ?? []).map(async (e) => {
      const [
        { data: proyectos },
        { data: cfdis },
        { data: ocs },
        { data: alertas },
      ] = await Promise.all([
        supabase
          .from("proyectos")
          .select(
            "id, monto_contratado, monto_facturado, monto_cobrado, semaforo, estado",
          )
          .eq("empresa_id", e.id)
          .in("estado", ["en_ejecucion", "planeacion", "en_cierre"]),
        supabase
          .from("cfdi")
          .select("total, saldo_pendiente, es_emitido, estado")
          .eq("empresa_id", e.id)
          .gte(
            "fecha_emision",
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
              .toISOString()
              .slice(0, 10),
          ),
        supabase
          .from("ordenes_compra")
          .select("id, total, estado")
          .eq("empresa_id", e.id)
          .eq("estado", "pendiente_aprobacion"),
        supabase
          .from("v_repse_alertas")
          .select("id")
          .eq("empresa_id", e.id)
          .in("estado_repse", ["vencida", "urgente", "sin_constancia"]),
      ]);

      const proyectosArr = proyectos ?? [];
      const cfdisArr = cfdis ?? [];
      const ocsArr = ocs ?? [];

      const ingresosMes = cfdisArr
        .filter((c) => c.es_emitido)
        .reduce((a, c) => a + Number(c.total ?? 0), 0);
      const egresosMes = cfdisArr
        .filter((c) => !c.es_emitido)
        .reduce((a, c) => a + Number(c.total ?? 0), 0);
      const cxc = cfdisArr
        .filter((c) => c.es_emitido && Number(c.saldo_pendiente ?? 0) > 0)
        .reduce((a, c) => a + Number(c.saldo_pendiente ?? 0), 0);
      const margen =
        ingresosMes > 0
          ? ((ingresosMes - egresosMes) / ingresosMes) * 100
          : 0;

      const totalOCPend = ocsArr.reduce(
        (a, oc) => a + Number(oc.total ?? 0),
        0,
      );
      const enRiesgo = proyectosArr.filter(
        (p) => p.semaforo === "rojo" || p.semaforo === "amarillo",
      ).length;

      return {
        empresa: e,
        ingresosMes,
        margen,
        cxc,
        proyectosActivos: proyectosArr.length,
        enRiesgo,
        ocPendientes: ocsArr.length,
        ocPendientesMonto: totalOCPend,
        repseAlertas: (alertas ?? []).length,
      };
    }),
  );

  // Decisiones que requieren firma del CEO (OCs grandes pendientes, etc.)
  const { data: ocsGrandes } = await supabase
    .from("ordenes_compra")
    .select(
      "id, numero, total, fecha_emision, empresas(codigo), proveedores(razon_social)",
    )
    .in("empresa_id", empresasUser)
    .eq("estado", "pendiente_aprobacion")
    .gte("total", 100000)
    .order("total", { ascending: false })
    .limit(8);

  const totales = stats.reduce(
    (a, s) => ({
      ingresos: a.ingresos + s.ingresosMes,
      cxc: a.cxc + s.cxc,
      proyectos: a.proyectos + s.proyectosActivos,
      enRiesgo: a.enRiesgo + s.enRiesgo,
      ocPend: a.ocPend + s.ocPendientes,
    }),
    { ingresos: 0, cxc: 0, proyectos: 0, enRiesgo: 0, ocPend: 0 },
  );

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Vista consolidada · grupo GECIAE</p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-[-0.02em]">
            4 empresas · una pantalla
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Comparativo lado a lado · KPIs del mes actual · alertas y firmas
            pendientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <TrendingUp className="h-4 w-4" />
              Vista clásica
            </Link>
          </Button>
        </div>
      </div>

      {/* Resumen del grupo */}
      <div className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-border bg-card p-4 sm:grid-cols-5">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Ingresos mes
          </p>
          <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
            {fmtMxnK(totales.ingresos)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Por cobrar
          </p>
          <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
            {fmtMxnK(totales.cxc)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Proy. activos
          </p>
          <p className="mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em]">
            {totales.proyectos}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            En riesgo
          </p>
          <p
            className={`mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em] ${
              totales.enRiesgo > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {totales.enRiesgo}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            OC esperando
          </p>
          <p
            className={`mt-1 font-mono text-[20px] font-semibold tabular-nums tracking-[-0.02em] ${
              totales.ocPend > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {totales.ocPend}
          </p>
        </div>
      </div>

      {/* 2x2 — una tarjeta por empresa */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {stats.map((s) => {
          const color = empresaCodigoColor[s.empresa.codigo] ?? "var(--c-pse)";
          const margenOk = s.margen >= 12;
          const margenWarn = s.margen >= 5 && s.margen < 12;
          return (
            <article
              key={s.empresa.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-xs"
            >
              {/* Banda superior con color de empresa */}
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: color }}
              />

              <div className="p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                        {s.empresa.codigo}
                      </p>
                    </div>
                    <h3 className="mt-1 text-[16px] font-semibold leading-tight">
                      {s.empresa.nombre_comercial ?? s.empresa.razon_social}
                    </h3>
                  </div>
                  <Link
                    href={`/dashboard?empresa=${s.empresa.id}`}
                    className="flex items-center gap-1 text-[11.5px] text-brand hover:text-brand-deep"
                  >
                    Detalle
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* KPIs grid 4 */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      Ingresos mes
                    </p>
                    <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums">
                      {fmtMxnK(s.ingresosMes)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      Margen
                    </p>
                    <p
                      className={`mt-0.5 font-mono text-[15px] font-semibold tabular-nums ${
                        margenOk
                          ? "text-emerald-700"
                          : margenWarn
                            ? "text-amber-700"
                            : s.margen <= 0
                              ? "text-red-700"
                              : ""
                      }`}
                    >
                      {s.ingresosMes > 0 ? `${s.margen.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      Por cobrar
                    </p>
                    <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums">
                      {fmtMxnK(s.cxc)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                      Proyectos
                    </p>
                    <p className="mt-0.5 font-mono text-[15px] font-semibold tabular-nums">
                      {s.proyectosActivos}
                    </p>
                  </div>
                </div>

                {/* Barra de salud */}
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-[10.5px] text-ink-3">
                    <span>Salud operativa</span>
                    <span className="font-mono">
                      {s.enRiesgo === 0 ? "100%" : `${100 - Math.min(100, s.enRiesgo * 15)}%`}
                    </span>
                  </div>
                  <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-bg-3">
                    <div
                      className="h-full"
                      style={{
                        width: `${100 - Math.min(100, s.enRiesgo * 15)}%`,
                        backgroundColor:
                          s.enRiesgo === 0
                            ? "rgb(16 185 129)"
                            : s.enRiesgo <= 2
                              ? "rgb(245 158 11)"
                              : "rgb(220 38 38)",
                      }}
                    />
                  </div>
                </div>

                {/* Alertas */}
                {(s.enRiesgo > 0 || s.ocPendientes > 0 || s.repseAlertas > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.enRiesgo > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-medium text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {s.enRiesgo} proyectos en riesgo
                      </span>
                    )}
                    {s.ocPendientes > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10.5px] font-medium text-orange-700">
                        {s.ocPendientes} OC pendiente · {fmtMxnK(s.ocPendientesMonto)}
                      </span>
                    )}
                    {s.repseAlertas > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-medium text-red-700">
                        {s.repseAlertas} REPSE
                      </span>
                    )}
                  </div>
                )}

                {s.enRiesgo === 0 && s.ocPendientes === 0 && s.repseAlertas === 0 && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    Sin alertas
                  </div>
                )}

                {/* Acciones */}
                <div className="mt-4 flex gap-2 border-t border-divider pt-3">
                  <Link
                    href={`/proyectos?empresa=${s.empresa.id}`}
                    className="flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-center text-[11.5px] font-medium hover:bg-bg-2"
                  >
                    Proyectos
                  </Link>
                  <Link
                    href={`/finanzas/cfdi?empresa=${s.empresa.id}`}
                    className="flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-center text-[11.5px] font-medium hover:bg-bg-2"
                  >
                    CFDI
                  </Link>
                  <Link
                    href={`/finanzas/oc?empresa=${s.empresa.id}`}
                    className="flex-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-center text-[11.5px] font-medium hover:bg-bg-2"
                  >
                    Compras
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Decisiones que requieren tu firma */}
      {ocsGrandes && ocsGrandes.length > 0 && (
        <section className="rounded-lg border border-border bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-divider px-5 py-3">
            <div>
              <h2 className="text-[14px] font-semibold">
                Decisiones que requieren tu firma
              </h2>
              <p className="mt-0.5 text-[11.5px] text-ink-3">
                OCs ≥ $100,000 pendientes de aprobación
              </p>
            </div>
            <Link
              href="/finanzas/oc?estado=pendiente_aprobacion"
              className="flex items-center gap-1 text-[12px] text-brand hover:text-brand-deep"
            >
              Ver todas
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-divider">
            {ocsGrandes.map((oc) => {
              const empresa = oc.empresas as { codigo: string } | null;
              const prov = oc.proveedores as { razon_social: string } | null;
              const color =
                empresaCodigoColor[empresa?.codigo ?? ""] ?? "var(--c-pse)";
              return (
                <li
                  key={oc.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-bg-2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/finanzas/oc/${oc.id}`}
                      className="text-[13px] font-medium hover:text-brand"
                    >
                      <span className="font-mono">{oc.numero}</span>
                      <span className="ml-2 text-ink-3">
                        {prov?.razon_social ?? "—"}
                      </span>
                    </Link>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {empresa?.codigo} ·{" "}
                      {oc.fecha_emision
                        ? new Date(oc.fecha_emision).toLocaleDateString(
                            "es-MX",
                            {
                              day: "2-digit",
                              month: "short",
                            },
                          )
                        : "—"}
                    </p>
                  </div>
                  <span className="font-mono text-[14px] font-semibold tabular-nums">
                    {fmtMxnK(Number(oc.total ?? 0))}
                  </span>
                  <Link href={`/finanzas/oc/${oc.id}`}>
                    <Button size="sm" variant="outline">
                      Revisar
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {totales.enRiesgo === 0 &&
        totales.ocPend === 0 &&
        (!ocsGrandes || ocsGrandes.length === 0) && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-[14px] font-medium text-emerald-900">
              Todo en orden — ninguna decisión crítica pendiente del grupo.
            </p>
          </section>
        )}

      <p className="mt-6 inline-flex items-center gap-1 text-[11px] text-ink-4">
        <Briefcase className="h-3 w-3" />
        Vista pájaro · {stats.length} empresa{stats.length === 1 ? "" : "s"} ·
        actualizado en cada carga
      </p>
    </div>
  );
}
