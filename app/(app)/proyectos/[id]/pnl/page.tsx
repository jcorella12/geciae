/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";

import { KpiCard } from "@/components/ui/kpi-card";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  ETIQUETA_CATEGORIA_COSTO,
  type PnLResumen,
} from "@/lib/proyecto-pnl/state";
import { createClient } from "@/lib/supabase/server";

import { CostoImputadoForm } from "./costo-imputado-form";
import { PresupuestoForm } from "./presupuesto-form";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function calcVariacion(real: number, presup: number): {
  pct: number;
  color: "ok" | "warn" | "danger";
  emoji: string;
} {
  if (presup === 0) {
    return { pct: 0, color: real > 0 ? "warn" : "ok", emoji: real > 0 ? "—" : "" };
  }
  const pct = ((real - presup) / presup) * 100;
  let color: "ok" | "warn" | "danger" = "ok";
  let emoji = "✓";
  if (Math.abs(pct) > 15) {
    color = "danger";
    emoji = "🔴";
  } else if (Math.abs(pct) > 5) {
    color = "warn";
    emoji = "⚠";
  }
  return { pct, color, emoji };
}

export default async function ProyectoPnlPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: proy } = (await (supabase as any)
    .from("proyectos")
    .select("id, codigo, nombre, empresa_id, estado, monto_contratado")
    .eq("id", params.id)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      codigo: string;
      nombre: string;
      empresa_id: string;
      estado: string;
      monto_contratado: number | null;
    } | null;
  };
  if (!proy) notFound();

  const puedeEditar =
    esCEO(v) ||
    esRolEn(v, proy.empresa_id, ["director"]) ||
    tieneAtributo(v, "contralor");

  const { data: pnl } = (await (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select("*")
    .eq("proyecto_id", params.id)
    .maybeSingle()) as unknown as { data: PnLResumen | null };

  const { data: presupuesto } = (await (supabase as any)
    .from("proyecto_presupuesto")
    .select("*")
    .eq("proyecto_id", params.id)
    .maybeSingle()) as unknown as {
    data: Record<string, unknown> | null;
  };

  const { data: costosImputados } = (await (supabase as any)
    .from("proyecto_costos_imputados")
    .select("id, fecha, tipo, categoria, concepto, monto, justificacion")
    .eq("proyecto_id", params.id)
    .eq("activo", true)
    .order("fecha", { ascending: false })
    .limit(50)) as unknown as {
    data: Array<{
      id: string;
      fecha: string;
      tipo: string;
      categoria: string;
      concepto: string;
      monto: number;
      justificacion: string;
    }> | null;
  };

  // KPIs
  const ingresoP = Number(pnl?.ingreso_presupuestado ?? 0);
  const margenN = Number(pnl?.margen_neto ?? 0);
  const margenC = Number(pnl?.margen_contribucion ?? 0);
  const ingFact = Number(pnl?.ingreso_facturado ?? 0);
  const margenObj = Number(pnl?.margen_objetivo_pct ?? 0);
  const margenPct = ingresoP > 0 ? (margenN / ingresoP) * 100 : 0;
  const avancePct = ingresoP > 0 ? (ingFact / ingresoP) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/proyectos/${params.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Proyecto
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Rentabilidad: <span className="font-mono">{proy.codigo}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{proy.nombre}</p>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Margen neto"
          value={fmtMxn.format(margenN)}
          sub={`${margenPct.toFixed(1)}% · obj ${margenObj}%`}
          accent={
            margenObj > 0 && margenPct >= margenObj
              ? "ok"
              : margenPct > 0
                ? "warn"
                : "danger"
          }
        />
        <KpiCard
          label="Margen contribución"
          value={fmtMxn.format(margenC)}
          sub={`${ingresoP > 0 ? ((margenC / ingresoP) * 100).toFixed(1) : 0}%`}
        />
        <KpiCard
          label="Avance facturación"
          value={`${avancePct.toFixed(0)}%`}
          sub={fmtMxn.format(ingFact)}
        />
        <KpiCard
          label="Costos totales"
          value={fmtMxn.format(Number(pnl?.costos_totales ?? 0))}
          sub={`${pnl?.costos_directos_total != null ? fmtMxn.format(Number(pnl.costos_directos_total)) : "—"} directos`}
        />
      </div>

      {/* P&L Table */}
      {!presupuesto ? (
        <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-5">
          <p className="font-medium text-amber-900">
            Sin presupuesto inicial. Captúralo abajo para ver comparativo
            presupuestado vs real.
          </p>
        </section>
      ) : (
        <section className="mb-6 overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-[12.5px]">
            <thead className="border-b bg-bg-2/50 text-left">
              <tr>
                <th className="px-3 py-2">Concepto</th>
                <th className="px-3 py-2 text-right">Presupuestado</th>
                <th className="px-3 py-2 text-right">Real</th>
                <th className="px-3 py-2 text-right">Var.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <RowSeccion label="INGRESOS" />
              <RowConcepto
                label="Contrato presupuestado"
                presup={ingresoP}
                real={null}
              />
              <RowConcepto
                label="Avance facturado"
                presup={null}
                real={ingFact}
              />
              <RowConcepto
                label="Por facturar"
                presup={null}
                real={Number(pnl?.ingreso_por_facturar ?? 0)}
              />

              <RowSeccion label="COSTOS DIRECTOS" />
              <RowConcepto
                label="Materiales (OCs)"
                presup={Number(pnl?.presupuesto_materiales ?? 0)}
                real={Number(pnl?.costo_materiales_oc ?? 0)}
              />
              <RowConcepto
                label="Mano de obra ingeniería"
                presup={Number(pnl?.presupuesto_ing ?? 0)}
                real={Number(pnl?.costo_horas_ingenieria ?? 0)}
              />
              <RowConcepto
                label="Mano de obra campo"
                presup={Number(pnl?.presupuesto_campo ?? 0)}
                real={Number(pnl?.costo_horas_campo ?? 0)}
              />
              <RowConcepto
                label="Subcontratos (OTs inter-co)"
                presup={Number(pnl?.presupuesto_subcontratos ?? 0)}
                real={Number(pnl?.costo_subcontratos ?? 0)}
              />
              <RowConcepto
                label="Levantamientos pre-venta"
                presup={null}
                real={Number(pnl?.costo_levantamientos ?? 0)}
              />
              <RowConcepto
                label="Total directos"
                presup={
                  Number(pnl?.presupuesto_materiales ?? 0) +
                  Number(pnl?.presupuesto_ing ?? 0) +
                  Number(pnl?.presupuesto_campo ?? 0) +
                  Number(pnl?.presupuesto_subcontratos ?? 0)
                }
                real={Number(pnl?.costos_directos_total ?? 0)}
                bold
              />

              <RowSeccion label="MARGEN DE CONTRIBUCIÓN" />
              <RowConcepto
                label="(Ingresos - Directos)"
                presup={
                  ingresoP -
                  (Number(pnl?.presupuesto_materiales ?? 0) +
                    Number(pnl?.presupuesto_ing ?? 0) +
                    Number(pnl?.presupuesto_campo ?? 0) +
                    Number(pnl?.presupuesto_subcontratos ?? 0))
                }
                real={margenC}
                bold
              />

              <RowSeccion label="COSTOS INDIRECTOS" />
              <RowConcepto
                label="Reparto de centros"
                presup={Number(pnl?.presupuesto_indirectos ?? 0)}
                real={Number(pnl?.costos_indirectos_centros ?? 0)}
              />
              <RowConcepto
                label="Provisión garantía"
                presup={null}
                real={Number(pnl?.provision_garantia ?? 0)}
              />
              <RowConcepto
                label="Otros imputados"
                presup={null}
                real={Number(pnl?.otros_imputados ?? 0)}
              />
              <RowConcepto
                label="Total indirectos"
                presup={Number(pnl?.presupuesto_indirectos ?? 0)}
                real={Number(pnl?.costos_indirectos_total ?? 0)}
                bold
              />

              <RowSeccion label="MARGEN NETO" />
              <RowConcepto
                label="(Ingresos - Costos totales)"
                presup={
                  ingresoP -
                  (Number(pnl?.presupuesto_materiales ?? 0) +
                    Number(pnl?.presupuesto_ing ?? 0) +
                    Number(pnl?.presupuesto_campo ?? 0) +
                    Number(pnl?.presupuesto_subcontratos ?? 0) +
                    Number(pnl?.presupuesto_indirectos ?? 0))
                }
                real={margenN}
                bold
                highlight
              />
            </tbody>
          </table>
        </section>
      )}

      {/* Presupuesto */}
      {puedeEditar && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">
            {presupuesto ? "Editar presupuesto" : "Capturar presupuesto inicial"}
          </h2>
          <PresupuestoForm
            proyectoId={params.id}
            initial={
              presupuesto as never as {
                ingreso_total?: number;
                presupuesto_materiales?: number;
                presupuesto_mano_obra_ingenieria?: number;
                presupuesto_mano_obra_campo?: number;
                presupuesto_subcontratos?: number;
                presupuesto_indirectos?: number;
                margen_objetivo_pct?: number;
                porcentaje_provision_garantia?: number;
              } | null
            }
            cerrado={Boolean(presupuesto?.cerrado)}
          />
        </section>
      )}

      {/* Costos imputados */}
      {puedeEditar && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">Costos imputados</h2>
          <CostoImputadoForm
            proyectoId={params.id}
            empresaId={proy.empresa_id}
          />
          {(costosImputados ?? []).length > 0 && (
            <table className="mt-4 w-full text-[12px]">
              <thead className="border-b text-left">
                <tr>
                  <th className="px-2 py-1">Fecha</th>
                  <th className="px-2 py-1">Categoría</th>
                  <th className="px-2 py-1">Concepto</th>
                  <th className="px-2 py-1 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(costosImputados ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-2 py-1 font-mono">{c.fecha}</td>
                    <td className="px-2 py-1">
                      {ETIQUETA_CATEGORIA_COSTO[
                        c.categoria as keyof typeof ETIQUETA_CATEGORIA_COSTO
                      ] ?? c.categoria}
                    </td>
                    <td className="px-2 py-1">{c.concepto}</td>
                    <td className="px-2 py-1 text-right font-mono">
                      {fmtMxn.format(Number(c.monto))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}

function RowSeccion({ label }: { label: string }) {
  return (
    <tr className="bg-bg-2/30">
      <td colSpan={4} className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </td>
    </tr>
  );
}

function RowConcepto({
  label,
  presup,
  real,
  bold,
  highlight,
}: {
  label: string;
  presup: number | null;
  real: number | null;
  bold?: boolean;
  highlight?: boolean;
}) {
  const fmtMxnRow = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
  const presupNum = presup ?? 0;
  const realNum = real ?? 0;
  const variacion =
    presup != null && real != null && presup !== 0
      ? calcVariacion(realNum, presupNum)
      : null;

  return (
    <tr className={highlight ? "bg-emerald-50/50" : ""}>
      <td className={`px-3 py-1.5 ${bold ? "font-semibold" : ""}`}>{label}</td>
      <td className={`px-3 py-1.5 text-right font-mono ${bold ? "font-semibold" : ""}`}>
        {presup != null ? fmtMxnRow.format(presup) : "—"}
      </td>
      <td className={`px-3 py-1.5 text-right font-mono ${bold ? "font-semibold" : ""}`}>
        {real != null ? fmtMxnRow.format(real) : "—"}
      </td>
      <td className="px-3 py-1.5 text-right font-mono text-[11px]">
        {variacion ? (
          <span
            className={
              variacion.color === "danger"
                ? "text-red-700"
                : variacion.color === "warn"
                  ? "text-amber-700"
                  : "text-emerald-700"
            }
          >
            {variacion.pct > 0 ? "+" : ""}
            {variacion.pct.toFixed(1)}% {variacion.emoji}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
