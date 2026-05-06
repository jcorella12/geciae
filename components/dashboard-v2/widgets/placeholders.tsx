/**
 * Placeholders funcionales para widgets opcionales del catálogo. Cada uno
 * tiene una versión mínima que enseña el dato más relevante. Se pueden
 * iterar individualmente cuando un usuario los active y dé feedback.
 */

import {
  AlertCircle,
  Banknote,
  Briefcase,
  ListChecks,
  Package,
  TrendingUp,
  Truck,
} from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

function WidgetHeader({ icon: Icon, titulo }: { icon: typeof Banknote; titulo: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 text-ink-3" />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {titulo}
      </span>
    </div>
  );
}

// ============================================================================
// Inventario consolidado
// ============================================================================
export async function InventarioConsolidado() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("inventario_movimientos")
    .select("monto_total")
    .in("empresa_id", empresasFiltro)
    .then(
      (r: unknown) => r,
      () => ({ data: [] }),
    )) as unknown as { data: { monto_total: number | null }[] | null };

  const total = (data ?? []).reduce(
    (acc, m) => acc + Number(m.monto_total ?? 0),
    0,
  );

  return (
    <Link href="/inventario" className="block">
      <WidgetHeader icon={Package} titulo="Inventario consolidado" />
      <div className="mt-3 font-mono text-[22px] font-semibold tnum">
        {fmtMxnCompact.format(total)}
      </div>
      <p className="mt-1 text-[11px] text-ink-3">Movimientos acumulados</p>
    </Link>
  );
}

// ============================================================================
// Arrendamientos vehículos
// ============================================================================
export async function ArrendamientosVehiculos() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("vehiculos")
    .select("id, placa, fecha_termino_contrato, marca, modelo")
    .eq("tipo_propiedad", "arrendado")
    .eq("estatus", "activo")
    .in("empresa_id", empresasFiltro)
    .order("fecha_termino_contrato", { ascending: true })
    .limit(5)) as unknown as {
    data:
      | {
          id: string;
          placa: string | null;
          fecha_termino_contrato: string | null;
          marca: string;
          modelo: string;
        }[]
      | null;
  };

  const vehiculos = data ?? [];

  return (
    <Link href="/activos" className="block">
      <WidgetHeader icon={Truck} titulo="Arrendamientos vehículos" />
      {vehiculos.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">Sin arrendamientos activos.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {vehiculos.map((v_) => (
            <li
              key={v_.id}
              className="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-bg-2"
            >
              <span className="truncate text-[11.5px] font-medium">
                {v_.marca} {v_.modelo}
                {v_.placa && (
                  <span className="ml-1 font-mono text-[10px] text-ink-3">
                    {v_.placa}
                  </span>
                )}
              </span>
              <span className="font-mono text-[10.5px] text-ink-3 tnum">
                {v_.fecha_termino_contrato ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

// ============================================================================
// Top indirectos del periodo
// ============================================================================
export async function TopIndirectos() {
  return (
    <div>
      <WidgetHeader icon={TrendingUp} titulo="Top indirectos del periodo" />
      <p className="mt-3 text-[12.5px] text-ink-3">
        Próxima iteración: ranking de categorías de gasto indirecto del mes en curso
        con comparación vs el anterior.
      </p>
    </div>
  );
}

// ============================================================================
// Mini paneles
// ============================================================================
export async function PanelLiquidez() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cuentas } = (await (supabase as any)
    .from("bancos_cuentas")
    .select("saldo_actual")
    .eq("activa", true)
    .in("empresa_id", empresasFiltro)) as unknown as {
    data: { saldo_actual: number | null }[] | null;
  };

  const cash = (cuentas ?? []).reduce((acc, c) => acc + Number(c.saldo_actual ?? 0), 0);

  return (
    <Link href="/finanzas/tesoreria" className="block">
      <WidgetHeader icon={Banknote} titulo="Liquidez" />
      <div className="mt-3 font-mono text-[22px] font-semibold tnum">
        {fmtMxnCompact.format(cash)}
      </div>
      <p className="mt-1 text-[11px] text-ink-3">Cash disponible</p>
    </Link>
  );
}

export async function PanelSaludProyectos() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select("ingreso_presupuestado, margen_neto, margen_objetivo_pct")
    .in("empresa_id", empresasFiltro)
    .gt("ingreso_presupuestado", 0)) as unknown as {
    data:
      | {
          ingreso_presupuestado: number | null;
          margen_neto: number | null;
          margen_objetivo_pct: number | null;
        }[]
      | null;
  };

  const filas = data ?? [];
  let ok = 0;
  let warn = 0;
  let danger = 0;
  for (const r of filas) {
    const ing = Number(r.ingreso_presupuestado ?? 0);
    const m = Number(r.margen_neto ?? 0);
    const obj = Number(r.margen_objetivo_pct ?? 0);
    if (ing <= 0) continue;
    const pct = (m / ing) * 100;
    if (obj > 0 && pct >= obj) ok++;
    else if (pct >= obj * 0.8) warn++;
    else danger++;
  }

  return (
    <div>
      <WidgetHeader icon={TrendingUp} titulo="Salud de proyectos" />
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-ok/10 py-2">
          <div className="font-mono text-[16px] font-semibold text-ok-deep tnum">{ok}</div>
          <div className="text-[10px] uppercase tracking-wide text-ok-deep">OK</div>
        </div>
        <div className="rounded-md bg-warn/10 py-2">
          <div className="font-mono text-[16px] font-semibold text-warn-deep tnum">{warn}</div>
          <div className="text-[10px] uppercase tracking-wide text-warn-deep">Cerca</div>
        </div>
        <div className="rounded-md bg-danger/10 py-2">
          <div className="font-mono text-[16px] font-semibold text-danger-deep tnum">{danger}</div>
          <div className="text-[10px] uppercase tracking-wide text-danger-deep">Bajo</div>
        </div>
      </div>
    </div>
  );
}

export async function PanelPendientes() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tareas = await (supabase as any)
    .from("proyecto_tareas")
    .select("id", { count: "exact", head: true })
    .eq("asignado_a", user.id)
    .in("estado", ["pendiente", "en_curso"]);

  const numTareas = (tareas as { count: number | null }).count ?? 0;

  return (
    <div>
      <WidgetHeader icon={ListChecks} titulo="Pendientes" />
      <div className="mt-3 font-mono text-[22px] font-semibold tnum">{numTareas}</div>
      <p className="mt-1 text-[11px] text-ink-3">Tareas asignadas a ti</p>
    </div>
  );
}

export async function PanelIngresosEmpresa() {
  const supabase = createClient();

  const [empResp, cfdiResp] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from("empresas").select("id, codigo"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("cfdi")
      .select("empresa_id, total")
      .eq("tipo", "ingreso")
      .eq("es_emitido", true)
      .gte("fecha", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
  ]);

  const empresas: { id: string; codigo: string }[] =
    (empResp as { data: { id: string; codigo: string }[] | null }).data ?? [];
  const cfdis: { empresa_id: string; total: number }[] =
    (cfdiResp as { data: { empresa_id: string; total: number }[] | null }).data ?? [];

  const map = new Map<string, number>();
  for (const c of cfdis) {
    map.set(c.empresa_id, (map.get(c.empresa_id) ?? 0) + Number(c.total ?? 0));
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);

  return (
    <div>
      <WidgetHeader icon={Briefcase} titulo="Ingresos por empresa (90d)" />
      <ul className="mt-3 space-y-1.5">
        {empresas.map((e) => {
          const monto = map.get(e.id) ?? 0;
          const pct = total > 0 ? (monto / total) * 100 : 0;
          return (
            <li key={e.id} className="flex items-center gap-2">
              <span className="w-12 text-[11px] font-medium">{e.codigo}</span>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-bg-2">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="font-mono text-[10.5px] text-ink-3 tnum">
                {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Genérico fallback (por si index.ts referencia algo no existente)
export function WidgetPlaceholder({ titulo }: { titulo: string }) {
  return (
    <div>
      <WidgetHeader icon={AlertCircle} titulo={titulo} />
      <p className="mt-3 text-[12px] text-ink-3">
        Widget en preparación. Activarás contenido real al próximo sprint.
      </p>
    </div>
  );
}
