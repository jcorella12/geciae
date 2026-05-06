/**
 * Implementaciones individuales de cada widget. Server Components que
 * consultan Supabase y renderizan contenido compacto. Cada widget asume
 * que ya está envuelto en un WidgetCard (que provee título/borde).
 *
 * Nota: usamos `as any` cuando los types regenerados aún no incluyen alguna
 * tabla nueva o vista. Esto es intencional para mantener velocidad de
 * iteración en el sprint Z.1.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

import { listarFavoritos } from "@/lib/favoritos/actions";
import { createClient } from "@/lib/supabase/server";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtFechaCorta = (d: string) =>
  new Date(d).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

type Row = Record<string, unknown>;

function sb() {
  return createClient() as any;
}

// ============================================================================
// MI DÍA
// ============================================================================

export async function MisTareasHoy() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Empty texto="Sin sesión" />;

  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await sb()
    .from("proyecto_tareas")
    .select("id, titulo, fecha_fin_planeada, estado, proyecto_id, proyectos(codigo)")
    .eq("asignado_a", user.id)
    .in("estado", ["pendiente", "en_curso"])
    .lte("fecha_fin_planeada", hoy)
    .order("fecha_fin_planeada", { ascending: true })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin tareas pendientes hoy" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((t) => (
        <li key={t.id as string} className="flex items-start gap-2 text-[12px]">
          <Clock className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
          <Link
            href={`/proyectos/${t.proyecto_id}`}
            className="flex-1 truncate hover:underline"
          >
            {t.titulo as string}
          </Link>
          <span className="font-mono text-[10.5px] text-ink-3">
            {(t.proyectos as { codigo: string } | null)?.codigo ?? ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function OportunidadesPendientes() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Empty texto="Sin sesión" />;

  const { data } = await sb()
    .from("oportunidades")
    .select("id, nombre, monto_estimado, estado")
    .eq("vendedor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin oportunidades activas" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((o) => (
        <li
          key={o.id as string}
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <Link
            href={`/comercial/oportunidades/${o.id}`}
            className="truncate hover:underline"
          >
            {o.nombre as string}
          </Link>
          <span className="font-mono text-[11px] text-ink-3">
            {fmtMxn.format(Number(o.monto_estimado ?? 0))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function OcsPorAprobar() {
  const { data } = await sb()
    .from("ordenes_compra")
    .select("id, numero, total, proveedor_id, proveedores(razon_social)")
    .in("estado", ["pendiente_aprobacion", "borrador"])
    .order("created_at", { ascending: true })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Nada por aprobar" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((oc) => (
        <li
          key={oc.id as string}
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <Link href={`/finanzas/oc/${oc.id}`} className="truncate hover:underline">
            <span className="font-mono">{oc.numero as string}</span>{" "}
            <span className="text-ink-3">
              {(oc.proveedores as { razon_social: string } | null)?.razon_social ?? ""}
            </span>
          </Link>
          <span className="font-mono text-[11px]">
            {fmtMxn.format(Number(oc.total ?? 0))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function OtsPorAprobar() {
  const { data } = await sb()
    .from("ordenes_trabajo_inter_co")
    .select("id, numero, total")
    .eq("estado", "solicitada")
    .order("created_at", { ascending: true })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin OT por aprobar" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((ot) => (
        <li
          key={ot.id as string}
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <Link href={`/finanzas/ot/${ot.id}`} className="truncate hover:underline">
            <span className="font-mono">{ot.numero as string}</span>
          </Link>
          <span className="font-mono text-[11px]">
            {fmtMxn.format(Number(ot.total ?? 0))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function SolicitudesPendientes() {
  const { data } = await sb()
    .from("proyecto_solicitudes")
    .select("id, titulo, proyecto_id, proyectos(codigo)")
    .eq("estado", "solicitada")
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin solicitudes pendientes" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((s) => (
        <li key={s.id as string} className="flex items-center gap-2 text-[12px]">
          <Link href={`/solicitudes/${s.id}`} className="flex-1 truncate hover:underline">
            {s.titulo as string}
          </Link>
          <span className="font-mono text-[10px] text-ink-3">
            {(s.proyectos as { codigo: string } | null)?.codigo ?? ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function MiVehiculo() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Empty texto="Sin sesión" />;

  const { data: emp } = await sb()
    .from("empleados")
    .select("id")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!emp) return <Empty texto="No estás vinculado a un empleado" />;

  const { data: vehiculo } = await sb()
    .from("vehiculos")
    .select("id, placa, marca, modelo, km_actual")
    .eq("empleado_id", emp.id)
    .eq("estatus", "activo")
    .maybeSingle();
  if (!vehiculo) return <Empty texto="Sin vehículo asignado" />;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const { data: cargas } = await sb()
    .from("vehiculos_bitacora")
    .select("monto, litros")
    .eq("vehiculo_id", vehiculo.id)
    .eq("tipo", "carga_combustible")
    .gte("fecha", inicioMes.toISOString().slice(0, 10));

  const c = (cargas ?? []) as Row[];
  const monto = c.reduce((acc: number, r) => acc + Number(r.monto ?? 0), 0);
  const litros = c.reduce((acc: number, r) => acc + Number(r.litros ?? 0), 0);

  return (
    <Link
      href={`/activos/vehiculos/${vehiculo.id}`}
      className="block hover:bg-bg-2 rounded-md p-1"
    >
      <p className="font-mono text-[14px] font-semibold">
        {(vehiculo.placa as string) ?? "—"}
      </p>
      <p className="text-[11px] text-ink-3">
        {vehiculo.marca as string} {vehiculo.modelo as string}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
        <div>
          <p className="text-ink-3">Gasolina mes</p>
          <p className="font-mono font-medium">{fmtMxn.format(monto)}</p>
        </div>
        <div>
          <p className="text-ink-3">Litros</p>
          <p className="font-mono font-medium">{litros.toFixed(0)}</p>
        </div>
      </div>
    </Link>
  );
}

export async function MiCompensacionMes() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <Empty texto="Sin sesión" />;

  const { data: emp } = await sb()
    .from("empleados")
    .select("id, salario_mensual_bruto")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!emp) return <Empty texto="Sin info compensación" />;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const { data: recibos } = await sb()
    .from("nomina_recibos")
    .select("total_neto")
    .eq("empleado_id", emp.id)
    .gte("fecha_pago", inicioMes.toISOString().slice(0, 10));

  const neto = ((recibos ?? []) as Row[]).reduce(
    (acc: number, r) => acc + Number(r.total_neto ?? 0),
    0,
  );
  const sueldo = Number(emp.salario_mensual_bruto ?? 0);

  return (
    <Link href="/perfil" className="block">
      <p className="text-[11px] text-ink-3">Sueldo bruto mensual</p>
      <p className="font-mono text-[18px] font-semibold">{fmtMxn.format(sueldo)}</p>
      {neto > 0 && (
        <p className="mt-1 text-[11px] text-ink-3">
          Neto pagado: <span className="font-mono">{fmtMxn.format(neto)}</span>
        </p>
      )}
    </Link>
  );
}

export async function UltimasNotificaciones() {
  const { data } = await sb()
    .from("notificaciones")
    .select("id, titulo, leida, url, created_at, severidad")
    .order("created_at", { ascending: false })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin notificaciones" />;
  return (
    <ul className="space-y-1.5">
      {rows.map((n) => (
        <li key={n.id as string} className="text-[12px]">
          <Link href={(n.url as string) ?? "#"} className="hover:underline">
            <p
              className={`truncate font-medium ${!n.leida ? "text-ink-1" : "text-ink-3"}`}
            >
              {n.titulo as string}
            </p>
            <p className="text-[10.5px] text-ink-3">
              {fmtFechaCorta(n.created_at as string)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// DASHBOARD
// ============================================================================

export async function KpiCumplimientoSat() {
  const anio = new Date().getFullYear();
  const { data } = await sb()
    .from("obligaciones_sat")
    .select("estado")
    .eq("periodo_anio", anio);
  const rows = (data ?? []) as Row[];
  const total = rows.length;
  const cumplidas = rows.filter((o) =>
    ["pagada", "presentada"].includes(o.estado as string),
  ).length;
  const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;

  return (
    <Link href="/finanzas/cumplimiento" className="block">
      <p className="font-mono text-3xl font-semibold">{pct}%</p>
      <p className="mt-1 text-[11px] text-ink-3">
        {cumplidas}/{total} obligaciones {anio}
      </p>
    </Link>
  );
}

export async function KpiMargenConsolidado() {
  const anio = new Date().getFullYear();
  const { data } = await sb()
    .from("estados_financieros_mensuales")
    .select("ingresos_totales, egresos_totales")
    .eq("anio", anio);

  const rows = (data ?? []) as Row[];
  const ingresos = rows.reduce(
    (acc: number, e) => acc + Number(e.ingresos_totales ?? 0),
    0,
  );
  const egresos = rows.reduce(
    (acc: number, e) => acc + Number(e.egresos_totales ?? 0),
    0,
  );
  const margen = ingresos - egresos;
  const pct = ingresos > 0 ? Math.round((margen / ingresos) * 100) : 0;

  return (
    <Link href="/finanzas/cumplimiento" className="block">
      <p className="font-mono text-2xl font-semibold">{fmtMxn.format(margen)}</p>
      <p
        className={`mt-1 text-[11px] ${pct >= 0 ? "text-emerald-700" : "text-red-700"}`}
      >
        {pct}% margen · {anio}
      </p>
    </Link>
  );
}

export async function TopProyectosRiesgo() {
  const { data } = await sb()
    .from("proyectos")
    .select("id, codigo, nombre, semaforo")
    .eq("semaforo", "rojo")
    .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin proyectos en rojo" />;
  return (
    <ul className="space-y-1">
      {rows.map((p) => (
        <li key={p.id as string} className="text-[12px]">
          <Link href={`/proyectos/${p.id}`} className="flex items-center gap-2 hover:underline">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            <span className="font-mono text-[10.5px]">{p.codigo as string}</span>
            <span className="truncate">{p.nombre as string}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function AlertasCalibracion() {
  const { data } = await sb()
    .from("v_activos_grupo_enriquecido")
    .select("id, codigo, nombre, alerta")
    .in("alerta", [
      "calibracion_vencida",
      "calibracion_proxima",
      "mantenimiento_vencido",
    ])
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Todo OK" />;
  return (
    <ul className="space-y-1">
      {rows.map((a) => (
        <li key={a.id as string} className="text-[11.5px]">
          <Link
            href={`/activos/compartidos/${a.id}`}
            className="flex items-center gap-2 hover:underline"
          >
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span className="font-mono text-[10.5px]">{a.codigo as string}</span>
            <span className="truncate">{a.nombre as string}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function PrestamosActivosActuales() {
  const { data } = await sb()
    .from("v_prestamos_activos_enriquecido")
    .select(
      "id, numero, activo_codigo, activo_nombre, empresa_solicitante_codigo, dias_retraso",
    )
    .eq("estado", "recogido")
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Sin préstamos activos" />;
  return (
    <ul className="space-y-1">
      {rows.map((p) => (
        <li
          key={p.id as string}
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <Link href={`/activos/prestamos/${p.id}`} className="flex-1 truncate hover:underline">
            <span className="font-mono text-[10.5px]">{p.activo_codigo as string}</span>{" "}
            {p.activo_nombre as string}
          </Link>
          <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] text-violet-800">
            {p.empresa_solicitante_codigo as string}
          </span>
          {Number(p.dias_retraso ?? 0) > 0 && (
            <span className="font-mono text-[10px] text-red-700">
              +{p.dias_retraso as number}d
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export async function ProximasObligacionesSat() {
  const hoy = new Date();
  const en30 = new Date();
  en30.setDate(en30.getDate() + 30);
  const { data } = await sb()
    .from("v_obligaciones_lista")
    .select("id, empresa_codigo, tipo, fecha_vencimiento")
    .gte("fecha_vencimiento", hoy.toISOString().slice(0, 10))
    .lte("fecha_vencimiento", en30.toISOString().slice(0, 10))
    .in("estado_efectivo", ["pendiente", "en_proceso"])
    .order("fecha_vencimiento", { ascending: true })
    .limit(5);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return <Empty texto="Nada próximo a vencer" />;
  return (
    <ul className="space-y-1">
      {rows.map((o) => (
        <li
          key={o.id as string}
          className="flex items-center justify-between gap-2 text-[12px]"
        >
          <Link
            href={`/finanzas/obligaciones/${o.id}`}
            className="flex-1 truncate hover:underline"
          >
            <span className="font-mono text-[10.5px]">{o.empresa_codigo as string}</span>{" "}
            {o.tipo as string}
          </Link>
          <span className="text-[10.5px] text-ink-3">
            {fmtFechaCorta(o.fecha_vencimiento as string)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export async function MisFavoritos() {
  const favs = await listarFavoritos();
  if (favs.length === 0) {
    return (
      <p className="text-[11.5px] text-ink-3">
        Marca cualquier proyecto, cliente, CFDI o empleado con ⭐ y aparecerá aquí.
      </p>
    );
  }

  const porTipo = new Map<string, typeof favs>();
  for (const f of favs) {
    const arr = porTipo.get(f.entidad_tipo) ?? [];
    arr.push(f);
    porTipo.set(f.entidad_tipo, arr);
  }

  const TIPO_LABEL: Record<string, string> = {
    proyecto: "Proyectos",
    cliente: "Clientes",
    cfdi: "CFDIs",
    empleado: "Empleados",
    oportunidad: "Oportunidades",
    activo_grupo: "Activos",
  };

  const TIPO_HREF: Record<string, string> = {
    proyecto: "/proyectos",
    cliente: "/clientes",
    cfdi: "/finanzas/cfdi",
    empleado: "/personas",
    oportunidad: "/comercial/oportunidades",
    activo_grupo: "/activos/compartidos",
  };

  return (
    <div className="space-y-2">
      {Array.from(porTipo.entries()).map(([tipo, items]) => (
        <div key={tipo}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
            {TIPO_LABEL[tipo] ?? tipo}
          </p>
          <ul className="mt-0.5 space-y-0.5">
            {items.slice(0, 3).map((f) => (
              <li
                key={`${f.entidad_tipo}-${f.entidad_id}`}
                className="text-[12px]"
              >
                <Link
                  href={`${TIPO_HREF[tipo] ?? "#"}/${f.entidad_id}`}
                  className="truncate hover:underline"
                >
                  {f.etiqueta ?? f.entidad_id.slice(0, 8)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function Empty({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
      {texto}
    </p>
  );
}
