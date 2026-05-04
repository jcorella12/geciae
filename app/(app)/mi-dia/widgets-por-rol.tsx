import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  HardHat,
  Package,
  Receipt,
  Repeat,
  Smartphone,
  TrendingDown,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import type { RolMiDia } from "@/lib/auth/rol-mi-dia";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});


/**
 * Widgets que se renderizan según el rol Mi Día.
 * Server component para que cada widget haga su propio fetch.
 */
export async function WidgetsPorRol({
  rol,
  empresasIds,
}: {
  rol: RolMiDia;
  empresasIds: string[];
}) {
  if (rol === "residente") return <ResidenteWidgets empresasIds={empresasIds} />;
  if (rol === "admin") return <AdminWidgets empresasIds={empresasIds} />;
  if (rol === "almacenista")
    return <AlmacenistaWidgets empresasIds={empresasIds} />;
  if (rol === "rrhh") return <RrhhWidgets empresasIds={empresasIds} />;
  if (rol === "empleado") return <EmpleadoWidgets />;
  // ceo y pm → no se muestran widgets adicionales (la vista por defecto ya cubre)
  return null;
}

// ============================================================================
// Residente de obra
// ============================================================================
async function ResidenteWidgets({ empresasIds }: { empresasIds: string[] }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;

  // Vehículos asignados al user (a través de la flota disponible)
  const { data: vehiculos } = await supa
    .from("v_vehiculos_lista")
    .select("id, placa, marca, modelo, estatus, empresa_id")
    .in("empresa_id", empresasIds)
    .eq("estatus", "activo")
    .limit(4);

  // Stock bajo en inventario (riesgo en obra)
  const { data: stockBajo } = await supa
    .from("v_inventario_stock")
    .select("producto_id, sku, nombre, stock_actual, unidad_medida, estado_stock")
    .in("empresa_id", empresasIds)
    .in("estado_stock", ["agotado", "bajo"])
    .limit(5);

  return (
    <section className="mb-5 rounded-md border border-amber-300 bg-amber-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <HardHat className="h-4 w-4 text-amber-700" />
        <h2 className="text-[13.5px] font-semibold">
          Tu día en obra · accesos rápidos
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/campo"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-amber-500"
        >
          <Smartphone className="h-5 w-5 text-amber-700" />
          <span className="text-[11.5px] font-medium">Captura desde campo</span>
        </Link>
        <Link
          href="/proyectos"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-amber-500"
        >
          <Wrench className="h-5 w-5 text-amber-700" />
          <span className="text-[11.5px] font-medium">Bitácora obra</span>
        </Link>
        <Link
          href="/inventario"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-amber-500"
        >
          <Package className="h-5 w-5 text-amber-700" />
          <span className="text-[11.5px] font-medium">Pedir material</span>
        </Link>
        <Link
          href="/soporte/tickets/nuevo"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-amber-500"
        >
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <span className="text-[11.5px] font-medium">Reportar incidente</span>
        </Link>
      </div>

      {(vehiculos?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-amber-200 pt-3">
          <h3 className="mb-2 text-[11.5px] font-semibold text-ink-2">
            Vehículos disponibles
          </h3>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
            {vehiculos?.map(
              (v: {
                id: string;
                placa: string | null;
                marca: string;
                modelo: string;
              }) => (
                <Link
                  key={v.id}
                  href={`/activos/vehiculos/${v.id}`}
                  className="rounded-md border border-divider bg-card px-3 py-1.5 text-left hover:bg-bg-2"
                >
                  <p className="font-mono text-[11.5px] font-medium">
                    {v.placa ?? "—"}
                  </p>
                  <p className="text-[10.5px] text-ink-3">
                    {v.marca} {v.modelo}
                  </p>
                </Link>
              ),
            )}
          </div>
        </div>
      )}

      {(stockBajo?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-red-800">
            <AlertTriangle className="h-3 w-3" />
            Stock crítico
          </h3>
          <ul className="space-y-0.5 text-[11px]">
            {stockBajo?.map(
              (s: {
                producto_id: string;
                sku: string;
                nombre: string;
                stock_actual: number;
                unidad_medida: string;
              }) => (
                <li key={s.producto_id}>
                  <Link
                    href={`/inventario/${s.producto_id}`}
                    className="text-red-700 hover:underline"
                  >
                    {s.nombre}
                  </Link>{" "}
                  <span className="text-ink-3">
                    · {s.stock_actual} {s.unidad_medida}
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Administración
// ============================================================================
async function AdminWidgets({ empresasIds }: { empresasIds: string[] }) {
  const supabase = createClient();

  // Conciliación bancaria pendiente (CFDIs sin conciliar últimos 30d)
  const hace30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [{ data: porCobrar }, { data: porPagar }] = await Promise.all([
    supabase
      .from("cfdi")
      .select("id, total, saldo_pendiente, fecha_emision")
      .in("empresa_id", empresasIds)
      .eq("es_emitido", true)
      .eq("estado", "timbrado")
      .gt("saldo_pendiente", 0),
    supabase
      .from("cfdi")
      .select("id, total, saldo_pendiente, fecha_emision")
      .in("empresa_id", empresasIds)
      .eq("es_emitido", false)
      .eq("estado", "timbrado")
      .gt("saldo_pendiente", 0)
      .gte("fecha_emision", hace30d),
  ]);

  const totalCxC = (porCobrar ?? []).reduce(
    (a, c) => a + Number(c.saldo_pendiente ?? 0),
    0,
  );
  const totalCxP = (porPagar ?? []).reduce(
    (a, c) => a + Number(c.saldo_pendiente ?? 0),
    0,
  );

  return (
    <section className="mb-5 rounded-md border border-violet-200 bg-violet-50/30 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4 text-violet-700" />
        <h2 className="text-[13.5px] font-semibold">
          Tu día en administración
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            Por cobrar
          </p>
          <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums">
            {fmtMxn.format(totalCxC)}
          </p>
          <p className="text-[10.5px] text-ink-3">
            {(porCobrar ?? []).length} facturas
          </p>
          <Link
            href="/finanzas/cfdi?direccion=emitidos"
            className="mt-2 block text-[11px] text-brand hover:underline"
          >
            Ver detalle →
          </Link>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            Por pagar (30d)
          </p>
          <p className="mt-1 font-mono text-[18px] font-semibold tabular-nums">
            {fmtMxn.format(totalCxP)}
          </p>
          <p className="text-[10.5px] text-ink-3">
            {(porPagar ?? []).length} facturas
          </p>
          <Link
            href="/finanzas/cfdi?direccion=recibidos"
            className="mt-2 block text-[11px] text-brand hover:underline"
          >
            Ver detalle →
          </Link>
        </div>
        <div className="rounded-md border border-border bg-card p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-3">
            Conciliación bancaria
          </p>
          <p className="mt-1 text-[12.5px]">
            Sube tus estados de cuenta y deja que la IA haga el match.
          </p>
          <Link
            href="/finanzas/tesoreria"
            className="mt-2 block text-[11px] text-brand hover:underline"
          >
            Ir a tesorería →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// Almacenista (placeholder con Inventario quick links)
// ============================================================================
async function AlmacenistaWidgets({ empresasIds }: { empresasIds: string[] }) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;

  const { data: stockBajo } = await supa
    .from("v_inventario_stock")
    .select(
      "producto_id, sku, nombre, stock_actual, unidad_medida, stock_minimo, estado_stock, valor_costo",
    )
    .in("empresa_id", empresasIds)
    .in("estado_stock", ["agotado", "bajo"])
    .limit(8);

  const valorCritico = (stockBajo ?? []).reduce(
    (a: number, s: { valor_costo?: number }) => a + Number(s.valor_costo ?? 0),
    0,
  );

  return (
    <section className="mb-5 rounded-md border border-orange-300 bg-orange-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Package className="h-4 w-4 text-orange-700" />
        <h2 className="text-[13.5px] font-semibold">Tu día en almacén</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/inventario/movimientos/nuevo?tipo=entrada_compra"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-orange-500"
        >
          <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
          <span className="text-[11.5px] font-medium">Registrar entrada</span>
        </Link>
        <Link
          href="/inventario/movimientos/nuevo?tipo=salida_proyecto"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-orange-500"
        >
          <TrendingDown className="h-5 w-5 text-orange-700" />
          <span className="text-[11.5px] font-medium">Salida a obra</span>
        </Link>
        <Link
          href="/inventario"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-orange-500"
        >
          <Package className="h-5 w-5 text-orange-700" />
          <span className="text-[11.5px] font-medium">Ver inventario</span>
        </Link>
        <Link
          href="/inventario/movimientos/nuevo?tipo=traspaso_salida"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-orange-500"
        >
          <Repeat className="h-5 w-5 text-orange-700" />
          <span className="text-[11.5px] font-medium">Traspaso almacén</span>
        </Link>
      </div>

      {(stockBajo?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-orange-200 pt-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            Stock crítico (valor a costo: {fmtMxn.format(valorCritico)})
          </h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {stockBajo?.map(
              (s: {
                producto_id: string;
                sku: string;
                nombre: string;
                stock_actual: number;
                stock_minimo: number;
                unidad_medida: string;
                estado_stock: string;
              }) => (
                <li
                  key={s.producto_id}
                  className="flex items-center justify-between gap-2 rounded-md border border-divider bg-card px-2.5 py-1 text-[11px]"
                >
                  <Link
                    href={`/inventario/${s.producto_id}`}
                    className="min-w-0 flex-1 truncate hover:text-brand"
                  >
                    <span className="font-mono text-[10.5px] text-ink-3">
                      {s.sku}
                    </span>{" "}
                    {s.nombre}
                  </Link>
                  <span
                    className={`font-mono ${s.estado_stock === "agotado" ? "text-red-700" : "text-amber-700"}`}
                  >
                    {s.stock_actual}/{s.stock_minimo} {s.unidad_medida}
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// RRHH / Calidad
// ============================================================================
async function RrhhWidgets({ empresasIds }: { empresasIds: string[] }) {
  const supabase = createClient();

  // REPSE alertas
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;
  const { data: repseAlertas } = await supa
    .from("v_repse_alertas")
    .select("id, nombre_completo, dias_para_vencer, estado_repse, empresa_id")
    .in("empresa_id", empresasIds)
    .in("estado_repse", ["vencida", "urgente", "sin_constancia"])
    .order("dias_para_vencer", { ascending: true })
    .limit(8);

  return (
    <section className="mb-5 rounded-md border border-emerald-300 bg-emerald-50/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
        <h2 className="text-[13.5px] font-semibold">
          Tu día en RRHH / Calidad
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link
          href="/personas"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-emerald-500"
        >
          <span className="text-2xl">👥</span>
          <span className="text-[11.5px] font-medium">Personas</span>
        </Link>
        <Link
          href="/personas?categoria=repse"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-emerald-500"
        >
          <span className="text-2xl">📜</span>
          <span className="text-[11.5px] font-medium">REPSE</span>
        </Link>
        <Link
          href="/calidad"
          className="flex flex-col items-center gap-1.5 rounded-md border border-border bg-card p-3 hover:border-emerald-500"
        >
          <span className="text-2xl">✅</span>
          <span className="text-[11.5px] font-medium">Calidad</span>
        </Link>
      </div>

      {(repseAlertas?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-emerald-200 pt-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-red-800">
            <AlertTriangle className="h-3 w-3" />
            Constancias REPSE críticas
          </h3>
          <ul className="space-y-1 text-[11.5px]">
            {repseAlertas?.map(
              (r: {
                id: string;
                nombre_completo: string;
                dias_para_vencer: number | null;
                estado_repse: string;
              }) => (
                <li key={r.id} className="flex items-center justify-between">
                  <Link
                    href={`/personas/${r.id}`}
                    className="font-medium hover:text-brand"
                  >
                    {r.nombre_completo}
                  </Link>
                  <span className="text-red-700">
                    {r.estado_repse === "vencida"
                      ? `Vencida ${Math.abs(Number(r.dias_para_vencer ?? 0))}d`
                      : r.estado_repse === "sin_constancia"
                        ? "Sin constancia"
                        : `${r.dias_para_vencer}d`}
                  </span>
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Empleado simple
// ============================================================================
function EmpleadoWidgets() {
  return (
    <section className="mb-5 rounded-md border border-border bg-card p-5">
      <h2 className="mb-3 text-[13.5px] font-semibold">Accesos rápidos</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link
          href="/personas"
          className="flex flex-col items-center gap-1.5 rounded-md border border-divider p-3 hover:bg-bg-2"
        >
          <span className="text-2xl">👤</span>
          <span className="text-[11.5px] font-medium">Mi perfil</span>
        </Link>
        <Link
          href="/calendario"
          className="flex flex-col items-center gap-1.5 rounded-md border border-divider p-3 hover:bg-bg-2"
        >
          <span className="text-2xl">📅</span>
          <span className="text-[11.5px] font-medium">Mi calendario</span>
        </Link>
        <Link
          href="/notificaciones"
          className="flex flex-col items-center gap-1.5 rounded-md border border-divider p-3 hover:bg-bg-2"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-[11.5px] font-medium">Notificaciones</span>
        </Link>
        <Link
          href="/ayuda"
          className="flex flex-col items-center gap-1.5 rounded-md border border-divider p-3 hover:bg-bg-2"
        >
          <span className="text-2xl">❓</span>
          <span className="text-[11.5px] font-medium">Ayuda</span>
        </Link>
      </div>
    </section>
  );
}
