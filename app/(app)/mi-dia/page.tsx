import {
  AlertCircle,
  Calendar,
  Car,
  CheckSquare,
  ClipboardList,
  FileText,
  PackageSearch,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Target,
  Users2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
import {
  empresasDondeGestionaEmpleados,
  esCEO,
  obtenerVinculosConEmpresa,
  puedeAprobarOC,
  puedeGestionarClientes,
  puedeGestionarProveedores,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import {
  detectarRolMiDia,
  ETIQUETA_ROL_MI_DIA,
} from "@/lib/auth/rol-mi-dia";
import { cookies } from "next/headers";

import { WidgetsPorRol } from "./widgets-por-rol";
import {
  COLOR_ESTADO_OPORTUNIDAD,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  type EstadoOportunidad,
} from "@/lib/oportunidades/state";
import {
  COLOR_ESTADO_TAREA,
  ETIQUETA_ESTADO_TAREA,
  type EstadoTareaProyecto,
} from "@/lib/proyecto-tareas/state";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Mi día" };

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

type AccesoRapido = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "brand" | "accent" | "ciae" | "ied";
};

export default async function MiDiaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const vinculos = await obtenerVinculosConEmpresa();
  const sinAcceso = vinculos.length === 0;
  const vinculosSinEmp = vinculos.map(({ empresa: _e, ...rest }) => rest);

  const ceo = esCEO(vinculosSinEmp);
  const tesorero = tieneAtributo(vinculosSinEmp, "tesorero_corporativo");
  const aprobadorFinanciero = tieneAtributo(
    vinculosSinEmp,
    "aprobador_financiero",
  );
  const puedeAlta = {
    cliente: puedeGestionarClientes(vinculosSinEmp),
    proveedor: puedeGestionarProveedores(vinculosSinEmp),
    empleado: empresasDondeGestionaEmpleados(vinculosSinEmp).length > 0,
  };

  const empresasUserAll = vinculosSinEmp.map((vi) => vi.empresa_id);
  const rolMiDia = detectarRolMiDia(vinculosSinEmp);
  // Aplicar filtro del switcher para que el saludo y datos sean coherentes
  const filtro = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: empresasUserAll,
    puedeConsolidado: puedeVerConsolidado(vinculosSinEmp),
  });
  const empresasUser = filtro.empresasIds;

  // Para queries que necesitan supabase cast (tablas/views nuevas)
  // Datos para KPIs y secciones
  const [
    { data: ocsPendientes },
    { data: misProyectos },
    { data: cfdiPorCobrar },
    { data: repseAlertasRaw },
    { data: misTareasRaw },
    { data: misOportunidadesRaw },
    { data: obligacionesRaw },
    { data: vehiculosAlertasRaw },
  ] = await Promise.all([
    supabase
      .from("ordenes_compra")
      .select(
        "id, numero, total, empresa_id, fecha_emision, proveedores(razon_social), empresas(codigo, nombre_comercial)",
      )
      .eq("estado", "pendiente_aprobacion")
      .order("created_at", { ascending: true }),
    supabase
      .from("proyectos")
      .select(
        `id, codigo, nombre, monto_contratado, monto_facturado, fecha_fin_planeado, semaforo, estado,
         clientes(razon_social, nombre_comercial),
         empresas(codigo)`,
      )
      .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
      .or(
        ceo
          ? `empresa_id.in.(${empresasUser.length > 0 ? empresasUser.join(",") : "00000000-0000-0000-0000-000000000000"})`
          : `pm_id.eq.${user?.id ?? "00000000-0000-0000-0000-000000000000"},vendedor_id.eq.${user?.id ?? "00000000-0000-0000-0000-000000000000"}`,
      )
      .order("fecha_fin_planeado", { ascending: true })
      .limit(8),
    supabase
      .from("cfdi")
      .select("id, total, saldo_pendiente, fecha_emision")
      .eq("es_emitido", true)
      .eq("estado", "timbrado")
      .gt("saldo_pendiente", 0),
    // REPSE alertas (solo si el user gestiona empleados)
    empresasDondeGestionaEmpleados(vinculosSinEmp).length > 0
      ? supabase
          .from("v_repse_alertas")
          .select("id, nombre_completo, vigencia_repse_hasta, estado_repse, dias_para_vencer")
          .in("empresa_id", empresasDondeGestionaEmpleados(vinculosSinEmp))
          .in("estado_repse", ["vencida", "urgente", "sin_constancia"])
          .order("vigencia_repse_hasta", { ascending: true })
          .limit(10)
      : Promise.resolve({ data: [] as never[] }),
    // Tareas asignadas a mí (no completadas/canceladas)
    user
      ? supabase
          .from("proyecto_tareas")
          .select(
            "id, titulo, estado, prioridad, fecha_fin_planeada, porcentaje_avance, es_hito, proyecto_id, proyectos(codigo, nombre, empresas(codigo))",
          )
          .eq("asignado_a", user.id)
          .not("estado", "in", "(completada,cancelada)")
          .order("fecha_fin_planeada", { ascending: true, nullsFirst: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    // Oportunidades con próxima acción esta semana o vencida
    user
      ? supabase
          .from("oportunidades")
          .select(
            "id, nombre, estado, monto_estimado, probabilidad, fecha_proxima_accion, proxima_accion, empresa_id, clientes(razon_social, nombre_comercial), empresas(codigo)",
          )
          .or(`vendedor_id.eq.${user.id}${ceo ? `,empresa_id.in.(${empresasUser.length > 0 ? empresasUser.join(",") : "00000000-0000-0000-0000-000000000000"})` : ""}`)
          .not("estado", "in", "(ganado,perdido)")
          .lte("fecha_proxima_accion", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
          .order("fecha_proxima_accion", { ascending: true, nullsFirst: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    // Obligaciones SAT que vencen en 30 días
    empresasUser.length > 0
      ? supabase
          .from("obligaciones_sat")
          .select("id, periodo_label, fecha_vencimiento, tipo, monto_calculado, empresas(codigo)")
          .in("empresa_id", empresasUser)
          .in("estado", ["pendiente", "en_proceso"])
          .lte(
            "fecha_vencimiento",
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
          )
          .order("fecha_vencimiento", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] }),
    // Vehículos con seguros venciendo (solo si gestiona vehículos)
    empresasUser.length > 0
      ? supabase
          .from("v_vehiculos_lista")
          .select(
            "id, placa, marca, modelo, fecha_vencimiento_seguro, estatus, empresa_id",
          )
          .in("empresa_id", empresasUser)
          .not("fecha_vencimiento_seguro", "is", null)
          .lte(
            "fecha_vencimiento_seguro",
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10),
          )
          .order("fecha_vencimiento_seguro", { ascending: true })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  // Documentos vehiculares por vencer (todos los tipos: tarjeta, verificación, tenencia, seguro doc)
  let documentosVehVencen: Array<{
    id: string;
    placa: string | null;
    marca: string;
    modelo: string;
    categoria: string;
    nombre: string;
    fecha_vencimiento: string | null;
    dias_para_vencer: number | null;
    estado_vencimiento: string;
    empresa_id: string;
    vehiculo_id: string;
  }> = [];
  if (empresasUser.length > 0) {
    const { data } = await supabase
      .from("v_vehiculos_documentos_alertas")
      .select(
        "id, vehiculo_id, placa, marca, modelo, categoria, nombre, fecha_vencimiento, dias_para_vencer, estado_vencimiento, empresa_id",
      )
      .in("empresa_id", empresasUser)
      .in("estado_vencimiento", ["vencido", "urgente", "proximo"])
      .order("fecha_vencimiento", { ascending: true })
      .limit(8);
    documentosVehVencen = (data ?? [])
      .filter(
        (d): d is typeof d & {
          id: string;
          marca: string;
          modelo: string;
          categoria: string;
          nombre: string;
          estado_vencimiento: string;
          empresa_id: string;
          vehiculo_id: string;
        } =>
          d.id !== null &&
          d.marca !== null &&
          d.modelo !== null &&
          d.categoria !== null &&
          d.nombre !== null &&
          d.estado_vencimiento !== null &&
          d.empresa_id !== null &&
          d.vehiculo_id !== null,
      )
      .map((d) => ({
        id: d.id,
        placa: d.placa,
        marca: d.marca,
        modelo: d.modelo,
        categoria: d.categoria,
        nombre: d.nombre,
        fecha_vencimiento: d.fecha_vencimiento,
        dias_para_vencer: d.dias_para_vencer,
        estado_vencimiento: d.estado_vencimiento,
        empresa_id: d.empresa_id,
        vehiculo_id: d.vehiculo_id,
      }));
  }
  const repseAlertas = (repseAlertasRaw as Array<{
    id: string;
    nombre_completo: string;
    vigencia_repse_hasta: string | null;
    estado_repse: string;
    dias_para_vencer: number | null;
  }> | null) ?? [];

  type TareaAsignada = {
    id: string;
    titulo: string;
    estado: string;
    prioridad: string | null;
    fecha_fin_planeada: string | null;
    porcentaje_avance: number | null;
    es_hito: boolean | null;
    proyecto_id: string;
    proyectos: {
      codigo: string;
      nombre: string;
      empresas: { codigo: string } | null;
    } | null;
  };
  const misTareas = (misTareasRaw ?? []) as TareaAsignada[];

  type OportunidadProxima = {
    id: string;
    nombre: string;
    estado: string;
    monto_estimado: number | null;
    probabilidad: number | null;
    fecha_proxima_accion: string | null;
    proxima_accion: string | null;
    empresa_id: string;
    clientes: { razon_social: string; nombre_comercial: string | null } | null;
    empresas: { codigo: string } | null;
  };
  const misOportunidades = (misOportunidadesRaw ?? []) as OportunidadProxima[];

  type ObligacionSat = {
    id: string;
    periodo: string;
    fecha_limite: string;
    tipo: string;
    monto_calculado: number | null;
    empresas: { codigo: string } | null;
  };
  const obligaciones: ObligacionSat[] = (
    (obligacionesRaw as Array<{
      id: string;
      periodo_label: string | null;
      fecha_vencimiento: string;
      tipo: string;
      monto_calculado: number | null;
      empresas: { codigo: string } | null;
    }> | null) ?? []
  ).map((o) => ({
    id: o.id,
    periodo: o.periodo_label ?? "",
    fecha_limite: o.fecha_vencimiento,
    tipo: o.tipo,
    monto_calculado: o.monto_calculado,
    empresas: o.empresas,
  }));

  type VehiculoAlerta = {
    id: string;
    placa: string | null;
    marca: string;
    modelo: string;
    fecha_vencimiento_seguro: string | null;
    estatus: string;
    empresa_id: string;
  };
  const vehiculosAlertas = (vehiculosAlertasRaw ?? []) as VehiculoAlerta[];

  const ocsAprobables = (ocsPendientes ?? []).filter((oc) =>
    puedeAprobarOC(vinculosSinEmp, oc.empresa_id, Number(oc.total)),
  );
  const totalOcAprobables = ocsAprobables.reduce(
    (acc, oc) => acc + Number(oc.total ?? 0),
    0,
  );

  const cxc = (cfdiPorCobrar ?? []).reduce(
    (acc, c) => acc + Number(c.saldo_pendiente ?? 0),
    0,
  );

  const totalProyectos = (misProyectos ?? []).length;
  const proyectosRiesgo = (misProyectos ?? []).filter(
    (p) => p.semaforo === "rojo",
  ).length;

  const nombreUsuario = user?.email?.split("@")[0] ?? "";
  const nombreSaludo = nombreUsuario
    ? nombreUsuario.charAt(0).toUpperCase() +
      nombreUsuario.slice(1).split(/[._-]/)[0]
    : "";
  const ahora = new Date();
  const horaActual = ahora.getHours();
  const saludo =
    horaActual < 12
      ? "Buenos días"
      : horaActual < 19
        ? "Buenas tardes"
        : "Buenas noches";

  const fechaCompleta = ahora.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const semana = (() => {
    const start = new Date(ahora.getFullYear(), 0, 1);
    const days = Math.floor(
      (ahora.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.ceil((days + start.getDay() + 1) / 7);
  })();

  const accesosRapidos: AccesoRapido[] = [
    {
      href: "/finanzas/oc/nueva",
      label: "Crear OC",
      icon: ShoppingCart,
      color: "brand" as const,
    },
    {
      href: "/finanzas/cfdi/nuevo",
      label: "Subir CFDI",
      icon: FileText,
      color: "accent" as const,
    },
    {
      href: "/finanzas/ot/nueva",
      label: "Crear OT inter-co",
      icon: ClipboardList,
      color: "ciae" as const,
    },
    {
      href: "/proyectos/nuevo",
      label: "Nuevo proyecto",
      icon: PackageSearch,
      color: "ied" as const,
    },
    ...(puedeAlta.cliente
      ? [
          {
            href: "/clientes/nuevo",
            label: "Nuevo cliente",
            icon: Users2,
            color: "brand" as const,
          },
        ]
      : []),
    ...(puedeAlta.proveedor
      ? [
          {
            href: "/finanzas/proveedores/nuevo",
            label: "Nuevo proveedor",
            icon: Plus,
            color: "accent" as const,
          },
        ]
      : []),
  ].slice(0, 6);

  const colorBg: Record<AccesoRapido["color"], string> = {
    brand: "bg-brand-soft text-brand-deep",
    accent: "bg-accent-pse-soft text-accent-pse-deep",
    ciae: "bg-[color-mix(in_oklch,var(--c-ciae)_14%,transparent)] text-[var(--c-ciae)]",
    ied: "bg-[color-mix(in_oklch,var(--c-ied)_14%,transparent)] text-[var(--c-ied)]",
  };

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      {/* Header personal */}
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini capitalize">
            {fechaCompleta} · semana {semana}
            {!sinAcceso && (
              <>
                {" · "}
                <span className="rounded-full bg-brand-soft px-2 py-0.5 normal-case text-brand-deep">
                  {ETIQUETA_ROL_MI_DIA[rolMiDia]}
                </span>
              </>
            )}
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            {saludo}
            {nombreSaludo ? `, ${nombreSaludo}` : ""}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {sinAcceso
              ? "No tienes empresas asignadas todavía."
              : ocsAprobables.length > 0
                ? `Tienes ${ocsAprobables.length} OC esperando tu aprobación.`
                : `${vinculos.length} empresa${vinculos.length === 1 ? "" : "s"} bajo tu visibilidad.`}
          </p>
        </div>
      </div>

      {sinAcceso ? (
        <div className="rounded-md border border-warn/40 bg-warn-soft p-5 text-sm">
          <p className="font-medium text-warn-deep">
            No tienes empresas asignadas.
          </p>
          <p className="mt-1 text-ink-3">
            Contacta a un administrador para que te vincule a una empresa.
          </p>
        </div>
      ) : (
        <>
          {/* Widgets adaptados al rol del usuario */}
          <WidgetsPorRol rol={rolMiDia} empresasIds={empresasUserAll} />

          {/* KPIs personales */}
          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Mis proyectos"
              value={totalProyectos}
              sub={
                proyectosRiesgo > 0
                  ? `${proyectosRiesgo} en riesgo`
                  : "Sin riesgos"
              }
              accent={proyectosRiesgo > 0 ? "danger" : "ok"}
            />
            <KpiCard
              label="OC pendientes (yo)"
              value={ocsAprobables.length}
              sub={fmtMxn.format(totalOcAprobables)}
              accent={ocsAprobables.length > 0 ? "warn" : "brand"}
            />
            <KpiCard
              label="Por cobrar (grupo)"
              value={fmtMxn.format(cxc)}
              sub={`${(cfdiPorCobrar ?? []).length} facturas`}
            />
            <KpiCard
              label="Empresas activas"
              value={vinculos.length}
              sub={ceo ? "CEO · ves todo" : "Tu acceso"}
            />
          </div>

          {/* Layout 2 cols: izquierda 8/12, derecha 4/12 */}
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Columna izquierda */}
            <div className="space-y-5 lg:col-span-8">
              {/* Alertas REPSE */}
              {repseAlertas.length > 0 && (
                <section className="rounded-md border border-danger/40 bg-danger-soft/40 p-5 shadow-xs">
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-danger-deep" />
                    <h2 className="text-[13.5px] font-semibold">
                      Constancias REPSE ({repseAlertas.length})
                    </h2>
                    <span className="ml-auto rounded-full bg-danger px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      VENCEN
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {repseAlertas.slice(0, 4).map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/personas/${r.id}`}
                            className="text-[13px] font-medium hover:text-brand"
                          >
                            {r.nombre_completo}
                          </Link>
                          <p className="text-[11.5px] text-ink-3">
                            {r.estado_repse === "sin_constancia"
                              ? "Sin constancia"
                              : r.estado_repse === "vencida"
                                ? `Vencida hace ${Math.abs(Number(r.dias_para_vencer ?? 0))} días`
                                : `Vence en ${r.dias_para_vencer} días`}
                          </p>
                        </div>
                        <Link href={`/personas/${r.id}`}>
                          <Button size="sm" variant="outline">
                            Renovar
                          </Button>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {repseAlertas.length > 4 && (
                    <p className="mt-2 text-[11.5px] text-ink-3">
                      + {repseAlertas.length - 4} más en{" "}
                      <Link
                        href="/personas?categoria=repse"
                        className="text-brand hover:underline"
                      >
                        Personas
                      </Link>
                    </p>
                  )}
                </section>
              )}

              {/* Acción requerida — OC esperando */}
              {ocsAprobables.length > 0 && (
                <section className="rounded-md border border-warn/40 bg-warn-soft/50 p-5 shadow-xs">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-warn-deep" />
                    <h2 className="text-[13.5px] font-semibold">
                      Acción requerida ({ocsAprobables.length})
                    </h2>
                    <span className="ml-auto rounded-full bg-warn px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                      HOY
                    </span>
                  </div>
                  <p className="mb-3 text-[12px] text-ink-3">
                    OC esperando tu visto bueno. Tu umbral cubre estas.
                  </p>
                  <ul className="divide-y divide-divider rounded-md border border-border bg-card">
                    {ocsAprobables.slice(0, 5).map((oc) => {
                      const empresa = oc.empresas as { codigo: string } | null;
                      const proveedor = oc.proveedores as { razon_social: string } | null;
                      return (
                        <li
                          key={oc.id}
                          className="flex items-center gap-3 px-4 py-3 transition hover:bg-bg-2"
                        >
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                              codigoColor[empresa?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/finanzas/oc/${oc.id}`}
                              className="text-[13px] font-medium hover:text-brand"
                            >
                              <span className="font-mono">{oc.numero}</span>
                              <span className="ml-2 text-ink-3">
                                {proveedor?.razon_social ?? "—"}
                              </span>
                            </Link>
                          </div>
                          <span className="font-mono tnum text-[13px] font-medium">
                            {fmtMxn.format(Number(oc.total ?? 0))}
                          </span>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/finanzas/oc/${oc.id}`}>Revisar</Link>
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                  {ocsAprobables.length > 5 && (
                    <p className="mt-3 text-[11.5px] text-ink-3">
                      +{ocsAprobables.length - 5} más en{" "}
                      <Link
                        href="/finanzas/oc?estado=pendiente_aprobacion"
                        className="text-brand hover:underline"
                      >
                        Compras
                      </Link>
                    </p>
                  )}
                </section>
              )}

              {/* Mis tareas asignadas */}
              {misTareas.length > 0 && (
                <section className="rounded-md border border-border bg-card shadow-xs">
                  <header className="flex items-center justify-between border-b border-divider px-5 py-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-brand" />
                      <h2 className="text-[13.5px] font-semibold">
                        Mis tareas pendientes ({misTareas.length})
                      </h2>
                    </div>
                  </header>
                  <ul className="divide-y divide-divider">
                    {misTareas.map((t) => {
                      const proyecto = t.proyectos;
                      const empresa = proyecto?.empresas;
                      const estado = t.estado as EstadoTareaProyecto;
                      const fin = t.fecha_fin_planeada
                        ? new Date(t.fecha_fin_planeada)
                        : null;
                      const dias = fin
                        ? Math.round(
                            (fin.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                          )
                        : null;
                      const vencida = dias != null && dias < 0;
                      const proxima = dias != null && dias >= 0 && dias <= 3;
                      return (
                        <li key={t.id} className="px-5 py-2.5 hover:bg-bg-2">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                codigoColor[empresa?.codigo ?? ""] ??
                                "bg-muted-foreground"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/proyectos/${t.proyecto_id}`}
                                className="text-[13px] font-medium leading-tight hover:text-brand"
                              >
                                {t.es_hito && "◆ "}
                                {t.titulo}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-ink-3">
                                {proyecto?.codigo} · {proyecto?.nombre}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ESTADO_TAREA[estado]}`}
                            >
                              {ETIQUETA_ESTADO_TAREA[estado]}
                            </span>
                            {fin && (
                              <span
                                className={`min-w-[80px] text-right text-[11px] tnum ${
                                  vencida
                                    ? "text-danger font-medium"
                                    : proxima
                                      ? "text-warn-deep font-medium"
                                      : "text-ink-3"
                                }`}
                              >
                                {vencida
                                  ? `Vencida ${Math.abs(dias!)}d`
                                  : dias === 0
                                    ? "Hoy"
                                    : dias === 1
                                      ? "Mañana"
                                      : `En ${dias}d`}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Próximas acciones comerciales */}
              {misOportunidades.length > 0 && (
                <section className="rounded-md border border-border bg-card shadow-xs">
                  <header className="flex items-center justify-between border-b border-divider px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-accent-pse" />
                      <h2 className="text-[13.5px] font-semibold">
                        Próximas acciones comerciales ({misOportunidades.length})
                      </h2>
                    </div>
                    <Link
                      href="/comercial/oportunidades"
                      className="text-[12px] text-ink-3 hover:text-ink-1"
                    >
                      Pipeline →
                    </Link>
                  </header>
                  <ul className="divide-y divide-divider">
                    {misOportunidades.map((o) => {
                      const cliente = o.clientes;
                      const empresa = o.empresas;
                      const estado = o.estado as EstadoOportunidad;
                      const fecha = o.fecha_proxima_accion
                        ? new Date(o.fecha_proxima_accion)
                        : null;
                      const dias = fecha
                        ? Math.round(
                            (fecha.getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          )
                        : null;
                      const vencida = dias != null && dias < 0;
                      return (
                        <li key={o.id} className="px-5 py-2.5 hover:bg-bg-2">
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                                codigoColor[empresa?.codigo ?? ""] ??
                                "bg-muted-foreground"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/comercial/oportunidades/${o.id}`}
                                className="text-[13px] font-medium leading-tight hover:text-brand line-clamp-1"
                              >
                                {o.nombre}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-ink-3">
                                {cliente?.nombre_comercial ??
                                  cliente?.razon_social ??
                                  "—"}
                                {o.proxima_accion && ` · ${o.proxima_accion}`}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ESTADO_OPORTUNIDAD[estado]}`}
                            >
                              {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}
                            </span>
                            {o.monto_estimado != null && (
                              <span className="min-w-[100px] text-right font-mono tnum text-[12px] font-medium">
                                {fmtMxn.format(Number(o.monto_estimado))}
                              </span>
                            )}
                            {fecha && (
                              <span
                                className={`min-w-[70px] text-right text-[11px] tnum ${
                                  vencida
                                    ? "text-danger font-medium"
                                    : "text-ink-3"
                                }`}
                              >
                                {vencida
                                  ? `Vencida`
                                  : dias === 0
                                    ? "Hoy"
                                    : `${dias}d`}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Mis proyectos */}
              <section className="rounded-md border border-border bg-card shadow-xs">
                <header className="flex items-center justify-between border-b border-divider px-5 py-3">
                  <div>
                    <h2 className="text-[13.5px] font-semibold">
                      Mis proyectos · estado
                    </h2>
                    <p className="mt-0.5 text-[11.5px] text-ink-3">
                      {totalProyectos} en curso
                    </p>
                  </div>
                  <Link
                    href="/proyectos"
                    className="text-[12px] text-ink-3 hover:text-ink-1"
                  >
                    Ver todos →
                  </Link>
                </header>
                {(misProyectos?.length ?? 0) === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-ink-3">
                    No tienes proyectos asignados.
                  </div>
                ) : (
                  <table className="w-full text-[13px]">
                    <thead className="bg-bg-2 text-left">
                      <tr>
                        <th className="border-b border-border-strong px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                          Proyecto
                        </th>
                        <th className="border-b border-border-strong px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                          Cliente
                        </th>
                        <th className="border-b border-border-strong px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                          Avance
                        </th>
                        <th className="border-b border-border-strong px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                          Fin plan.
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider">
                      {(misProyectos ?? []).map((p) => {
                        const cliente = p.clientes as { nombre_comercial: string | null; razon_social: string } | null;
                        const empresa = p.empresas as { codigo: string } | null;
                        const c = Number(p.monto_contratado ?? 0);
                        const f = Number(p.monto_facturado ?? 0);
                        const avance = c > 0 ? Math.round((f / c) * 100) : 0;
                        const status =
                          p.semaforo === "rojo"
                            ? "danger"
                            : p.semaforo === "amarillo"
                              ? "warning"
                              : p.semaforo === "verde"
                                ? "ok"
                                : "idle";
                        return (
                          <tr key={p.id} className="hover:bg-bg-2">
                            <td className="px-5 py-3">
                              <Link
                                href={`/proyectos/${p.id}`}
                                className="flex items-center gap-2.5"
                              >
                                <StatusDot status={status} />
                                <div>
                                  <div className="font-medium">{p.nombre}</div>
                                  <div className="font-mono text-[11px] text-ink-3">
                                    {empresa?.codigo} · {p.codigo}
                                  </div>
                                </div>
                              </Link>
                            </td>
                            <td className="px-3 py-3 text-ink-3">
                              {cliente?.nombre_comercial ?? cliente?.razon_social ?? "—"}
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span className="font-mono tnum font-medium">
                                {avance}%
                              </span>
                            </td>
                            <td className="px-5 py-3 text-ink-3">
                              {p.fecha_fin_planeado
                                ? new Date(p.fecha_fin_planeado).toLocaleDateString("es-MX", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </section>

              {/* Accesos rápidos */}
              <section className="rounded-md border border-border bg-card shadow-xs">
                <header className="border-b border-divider px-5 py-3">
                  <h2 className="text-[13.5px] font-semibold">
                    Accesos rápidos
                  </h2>
                </header>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                  {accesosRapidos.map((a) => {
                    const Icon = a.icon;
                    return (
                      <Link
                        key={a.href}
                        href={a.href}
                        className="flex flex-col gap-2 rounded-md border border-border bg-bg-1 p-4 transition hover:border-brand hover:bg-bg-2"
                      >
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-md ${colorBg[a.color]}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-[12.5px] font-medium">
                          {a.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Columna derecha */}
            <div className="space-y-5 lg:col-span-4">
              {/* Tus empresas */}
              <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                <h2 className="mb-3 text-[13.5px] font-semibold">
                  Tus empresas
                </h2>
                <ul className="space-y-3">
                  {vinculos.map((v) => {
                    const e = v.empresa;
                    if (!e) return null;
                    return (
                      <li
                        key={v.empresa_id}
                        className="flex items-start gap-2.5"
                      >
                        <span
                          className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                            codigoColor[e.codigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium">
                            {e.nombre_comercial ?? e.razon_social}
                          </p>
                          <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-3">
                            {e.codigo} · {v.rol}
                          </p>
                          {v.atributos.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {v.atributos.map((a) => (
                                <span
                                  key={a}
                                  className="rounded bg-bg-3 px-1.5 py-0.5 text-[10px] text-ink-2"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* Atributos sensibles */}
              {(aprobadorFinanciero || tesorero) && (
                <section className="rounded-md border border-info/30 bg-info-soft/40 p-5">
                  <h2 className="mb-2 text-[13.5px] font-semibold">
                    Atributos sensibles activos
                  </h2>
                  <ul className="space-y-2 text-[12.5px] text-ink-2">
                    {aprobadorFinanciero && (
                      <li>
                        Eres <strong>aprobador financiero</strong> — verás OC y
                        OT pendientes en tu día.
                      </li>
                    )}
                    {tesorero && (
                      <li>
                        Eres <strong>tesorero corporativo</strong> — vista
                        consolidada de tesorería disponible.
                      </li>
                    )}
                  </ul>
                </section>
              )}

              {/* Obligaciones SAT por vencer */}
              {obligaciones.length > 0 && (
                <section className="rounded-md border border-warn/30 bg-warn-soft/40 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warn-deep" />
                    <h2 className="text-[13.5px] font-semibold">
                      Obligaciones SAT · 30d
                    </h2>
                    <Link
                      href="/finanzas/obligaciones"
                      className="ml-auto text-[11px] text-ink-3 hover:text-ink-1"
                    >
                      Ver todas →
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {obligaciones.map((o) => {
                      const fecha = new Date(o.fecha_limite);
                      const dias = Math.round(
                        (fecha.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
                      );
                      const empresa = o.empresas;
                      return (
                        <li
                          key={o.id}
                          className="flex items-start gap-2.5 rounded-md border border-border bg-card px-3 py-2"
                        >
                          <span
                            className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                              codigoColor[empresa?.codigo ?? ""] ??
                              "bg-muted-foreground"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium leading-tight">
                              {o.tipo.replace(/_/g, " ").toUpperCase()} ·{" "}
                              {o.periodo}
                            </p>
                            <p className="mt-0.5 text-[10.5px] text-ink-3">
                              {empresa?.codigo} ·{" "}
                              {dias === 0
                                ? "Vence HOY"
                                : dias < 0
                                  ? `Vencida ${Math.abs(dias)}d`
                                  : `En ${dias} días`}
                            </p>
                          </div>
                          {o.monto_calculado != null && (
                            <span className="text-[11.5px] tnum font-mono">
                              {fmtMxn.format(Number(o.monto_calculado))}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Vehículos: alertas de seguro */}
              {vehiculosAlertas.length > 0 && (
                <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                  <div className="mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4 text-ink-3" />
                    <h2 className="text-[13.5px] font-semibold">
                      Seguros vehiculares
                    </h2>
                    <Link
                      href="/activos/vehiculos"
                      className="ml-auto text-[11px] text-ink-3 hover:text-ink-1"
                    >
                      Ver →
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {vehiculosAlertas.map((v) => {
                      const fecha = v.fecha_vencimiento_seguro
                        ? new Date(v.fecha_vencimiento_seguro)
                        : null;
                      const dias = fecha
                        ? Math.round(
                            (fecha.getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          )
                        : null;
                      const vencido = dias != null && dias < 0;
                      return (
                        <li
                          key={v.id}
                          className="flex items-start gap-2 text-[12px]"
                        >
                          <Link
                            href={`/activos/vehiculos/${v.id}`}
                            className="min-w-0 flex-1 hover:text-brand"
                          >
                            <p className="font-mono text-[11.5px] font-medium">
                              {v.placa ?? "—"}
                            </p>
                            <p className="text-[10.5px] text-ink-3">
                              {v.marca} {v.modelo}
                            </p>
                          </Link>
                          <span
                            className={`text-[11px] tnum ${
                              vencido ? "text-danger font-medium" : "text-warn-deep"
                            }`}
                          >
                            {vencido
                              ? `Vencido ${Math.abs(dias!)}d`
                              : `${dias}d`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* Docs vehiculares por vencer (tarjeta, verificación, tenencia, etc.) */}
              {documentosVehVencen.length > 0 && (
                <section className="rounded-md border border-warn/30 bg-warn-soft/30 p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-warn-deep" />
                    <h2 className="text-[13.5px] font-semibold">
                      Documentos vehiculares · 60d
                    </h2>
                  </div>
                  <ul className="space-y-1.5">
                    {documentosVehVencen.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-start gap-2 text-[11.5px]"
                      >
                        <Link
                          href={`/activos/vehiculos/${d.vehiculo_id}`}
                          className="min-w-0 flex-1 hover:text-brand"
                        >
                          <p className="font-medium leading-tight">
                            {d.categoria.replace(/_/g, " ")} ·{" "}
                            <span className="font-mono">{d.placa}</span>
                          </p>
                          <p className="text-[10.5px] text-ink-3">
                            {d.marca} {d.modelo}
                          </p>
                        </Link>
                        <span
                          className={`text-[11px] tnum font-medium ${
                            d.estado_vencimiento === "vencido"
                              ? "text-danger"
                              : d.estado_vencimiento === "urgente"
                                ? "text-orange-700"
                                : "text-warn-deep"
                          }`}
                        >
                          {d.estado_vencimiento === "vencido"
                            ? `Vencido ${Math.abs(d.dias_para_vencer ?? 0)}d`
                            : `${d.dias_para_vencer}d`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* CapEx / agenda */}
              <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-ink-3" />
                  <h2 className="text-[13.5px] font-semibold">Resumen rápido</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="OC pend." value={ocsAprobables.length} />
                  <Stat label="Por cobrar" value={fmtMxn.format(cxc)} />
                  <Stat label="Tareas" value={misTareas.length} />
                  <Stat label="Comercial" value={misOportunidades.length} />
                </div>
              </section>

              {/* Asistente IA placeholder */}
              <section className="rounded-md border border-dashed border-border bg-card p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent-pse" />
                  <h2 className="text-[13.5px] font-semibold">
                    Asistente IA
                  </h2>
                </div>
                <p className="text-[12.5px] text-ink-3">
                  Lectura de XML/INE/CSF activa. Drawer flotante con sugerencias
                  contextuales — siguiente fase.
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
