import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DualBar } from "@/components/ui/dual-bar";
import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import { StatusDot, type StatusLevel } from "@/components/ui/status-dot";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  empresasDondeCreaOC,
  esCEO,
  esRolEn,
  obtenerVinculos,
  puedeGestionarProyectosEn,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { ESTADOS_OC } from "@/lib/oc/state";
import {
  ESTADOS_PROYECTO,
  TIPOS_PROYECTO,
} from "@/lib/proyectos/state";
import { createClient } from "@/lib/supabase/server";

import { BitacoraPanel } from "./bitacora/bitacora-panel";
import { DocumentosPanel } from "./documentos/documentos-panel";
import { EquipoPanel } from "./equipo/equipo-panel";
import { ProyectoTabs, type TabConfig } from "./proyecto-tabs";
import { ReportesPanel, type ReporteRow } from "./reportes/reportes-panel";
import {
  SolicitudesPanel,
  type SolicitudListItem,
} from "./solicitudes/solicitudes-panel";
import { TareasPanel, type TareaRow } from "./tareas/tareas-panel";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtMxnFull = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

function tipoLabel(c: string | null) {
  if (!c) return "—";
  return TIPOS_PROYECTO.find((x) => x.value === c)?.label ?? c;
}

function semaforoStatus(s: string | null): StatusLevel {
  if (s === "rojo") return "danger";
  if (s === "amarillo") return "warning";
  if (s === "verde") return "ok";
  return "idle";
}

function avanceFinanciero(c: number | null, f: number | null): number {
  const cn = Number(c ?? 0);
  const fn = Number(f ?? 0);
  if (cn <= 0) return 0;
  return Math.round((fn / cn) * 100);
}

function avancePlan(ini: string | null, fin: string | null): number {
  if (!ini || !fin) return 0;
  const t0 = new Date(ini).getTime();
  const t1 = new Date(fin).getTime();
  const t = Date.now();
  if (t1 <= t0) return 0;
  if (t <= t0) return 0;
  if (t >= t1) return 100;
  return Math.round(((t - t0) / (t1 - t0)) * 100);
}

export default async function ProyectoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: p } = await supabase
    .from("proyectos")
    .select(
      "*, empresas(codigo, razon_social, nombre_comercial), clientes(id, razon_social, rfc)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!p) notFound();

  const puedeGestionar = puedeGestionarProyectosEn(vinculos, p.empresa_id);
  const puedeCrearOC = empresasDondeCreaOC(vinculos).includes(p.empresa_id);

  // OC asignadas a este proyecto
  const { data: ocs } = await supabase
    .from("ordenes_compra")
    .select(
      "id, numero, fecha_emision, total, estado, proveedores(razon_social)",
    )
    .eq("proyecto_id", params.id)
    .order("fecha_emision", { ascending: false });

  // CFDI asociados al proyecto (vía oc_id)
  const ocIds = (ocs ?? []).map((o) => o.id);
  let cfdis: Array<{
    id: string;
    serie: string | null;
    folio: string | null;
    fecha_emision: string | null;
    total: number;
    saldo_pendiente: number | null;
    estado: string | null;
    rfc_emisor: string;
    nombre_emisor: string | null;
    es_emitido: boolean;
  }> = [];
  if (ocIds.length > 0) {
    const { data } = await supabase
      .from("cfdi")
      .select(
        "id, serie, folio, fecha_emision, total, saldo_pendiente, estado, rfc_emisor, nombre_emisor, es_emitido",
      )
      .in("oc_id", ocIds)
      .order("fecha_emision", { ascending: false });
    cfdis = (data ?? []).map((c) => ({ ...c, total: Number(c.total) }));
  }

  // OT inter-co donde este proyecto es destino
  const { data: ots } = await supabase
    .from("ordenes_trabajo_inter_co")
    .select(
      "id, numero, descripcion, total, estado, fecha_solicitud, empresa_origen_id, empresa_destino_id, origen:empresas!ordenes_trabajo_inter_co_empresa_origen_id_fkey(codigo), destino:empresas!ordenes_trabajo_inter_co_empresa_destino_id_fkey(codigo)",
    )
    .eq("proyecto_id", params.id)
    .order("fecha_solicitud", { ascending: false });

  // Tareas del proyecto
  const { data: tareasRaw } = await supabase
    .from("proyecto_tareas")
    .select(
      "id, proyecto_id, parent_id, orden, titulo, descripcion, es_hito, estado, prioridad, fecha_inicio_planeada, fecha_fin_planeada, fecha_inicio_real, fecha_fin_real, duracion_dias, porcentaje_avance, asignado_a, horas_estimadas, horas_reales, costo_estimado, costo_real",
    )
    .eq("proyecto_id", params.id)
    .order("orden", { ascending: true })
    .order("fecha_inicio_planeada", { ascending: true, nullsFirst: false });
  const tareas = (tareasRaw ?? []) as TareaRow[];

  // Avance ponderado desde la vista
  const { data: avanceRow } = await supabase
    .from("v_proyecto_avance")
    .select(
      "avance_promedio, avance_ponderado, total_tareas, tareas_completadas, tareas_en_curso, tareas_bloqueadas, hitos_completados, total_hitos, horas_estimadas_total, horas_reales_total, costo_estimado_total, costo_real_total",
    )
    .eq("proyecto_id", params.id)
    .maybeSingle();

  // Bitácora del proyecto (con tarea relacionada)
  const { data: bitacoraRaw } = await supabase
    .from("v_proyecto_bitacora")
    .select(
      "id, fecha, tipo, titulo, descripcion, tarea_id, tarea_titulo, es_critica, visible_cliente, capturado_por_nombre",
    )
    .eq("proyecto_id", params.id)
    .order("fecha", { ascending: false })
    .limit(100);
  const bitacora = (bitacoraRaw ?? []) as Array<{
    id: string;
    fecha: string;
    tipo:
      | "avance"
      | "problema"
      | "decision"
      | "visita"
      | "foto"
      | "hito_alcanzado"
      | "cambio_alcance"
      | "reunion"
      | "nota";
    titulo: string | null;
    descripcion: string;
    tarea_id: string | null;
    tarea_titulo: string | null;
    es_critica: boolean | null;
    visible_cliente: boolean | null;
    capturado_por_nombre: string | null;
  }>;

  // Documentos
  const { data: documentosRaw } = await supabase
    .from("proyecto_documentos")
    .select(
      "id, categoria, nombre, descripcion, storage_path, mime_type, tamano_bytes, visible_cliente, subido_por_nombre, created_at",
    )
    .eq("proyecto_id", params.id)
    .order("created_at", { ascending: false });
  const documentos = (documentosRaw ?? []).filter(
    (d): d is typeof d & { created_at: string } => d.created_at !== null,
  );

  // Salidas de inventario al proyecto
  const { data: salidasInvRaw } = await supabase
    .from("v_inventario_movimientos")
    .select(
      "id, fecha, tipo, cantidad, costo_unitario, monto_total, producto_codigo, producto_nombre, unidad_medida, almacen_codigo, observaciones",
    )
    .eq("proyecto_id", params.id)
    .in("tipo", ["salida_proyecto", "salida_obra"])
    .order("fecha", { ascending: false })
    .limit(50);
  const salidasInv = (salidasInvRaw ?? []) as Array<{
    id: string;
    fecha: string;
    tipo: string;
    cantidad: number;
    costo_unitario: number | null;
    monto_total: number | null;
    producto_codigo: string;
    producto_nombre: string;
    unidad_medida: string;
    almacen_codigo: string;
    observaciones: string | null;
  }>;
  const totalSalidasInv = salidasInv.reduce(
    (a, s) => a + Number(s.monto_total ?? 0),
    0,
  );

  // Reportes formales del proyecto
  const { data: reportesRaw } = await supabase
    .from("v_proyecto_reportes_lista")
    .select(
      "id, numero, tipo, severidad, estado, titulo, resumen, contenido, fecha_evento, fecha_reporte, ubicacion, impacto, accion_correctiva, responsable_nombre, fecha_compromiso, fecha_resolucion, visible_cliente, creado_por_nombre, tarea_titulo, adjuntos, created_at",
    )
    .eq("proyecto_id", params.id)
    .order("fecha_reporte", { ascending: false })
    .order("created_at", { ascending: false });
  const reportes = (reportesRaw ?? []) as ReporteRow[];

  // Equipo (miembros activos + histórico)
  const { data: equipoRaw } = await supabase
    .from("proyecto_equipo")
    .select(
      "id, usuario_id, usuario_nombre, rol, fecha_alta, fecha_baja, observaciones",
    )
    .eq("proyecto_id", params.id)
    .order("fecha_alta", { ascending: false });
  const equipo = equipoRaw ?? [];

  // Candidatos: empleados activos con cuenta de usuario en empresas visibles
  const { data: candidatosRaw } = await supabase
    .from("empleados")
    .select("usuario_id, nombre_completo, puesto, email_personal, empresa_id")
    .not("usuario_id", "is", null)
    .eq("activo", true)
    .order("nombre_completo");
  const candidatos = (candidatosRaw ?? [])
    .filter(
      (c: { empresa_id: string }) =>
        c.empresa_id === p.empresa_id ||
        vinculos.some((v) => v.empresa_id === c.empresa_id),
    )
    .map((c: { usuario_id: string; nombre_completo: string; email_personal: string | null; puesto: string | null }) => ({
      usuario_id: c.usuario_id,
      nombre_completo: c.nombre_completo,
      email: c.email_personal,
      puesto: c.puesto,
    }));

  const totalOC = (ocs ?? []).reduce(
    (acc, oc) => acc + Number(oc.total ?? 0),
    0,
  );
  const totalOCAprobadas = (ocs ?? [])
    .filter((oc) =>
      [
        "aprobada",
        "enviada",
        "parcial_recibida",
        "recibida",
        "pagada",
      ].includes(oc.estado ?? ""),
    )
    .reduce((acc, oc) => acc + Number(oc.total ?? 0), 0);

  const presupuesto = Number(p.presupuesto_costo ?? 0);
  const consumido = totalOCAprobadas;
  const pctConsumido =
    presupuesto > 0 ? Math.min(100, (consumido / presupuesto) * 100) : 0;

  const real = avanceFinanciero(p.monto_contratado, p.monto_facturado);
  const plan = avancePlan(p.fecha_inicio_planeado, p.fecha_fin_planeado);
  const status = semaforoStatus(p.semaforo);

  const estado =
    ESTADOS_PROYECTO.find((s) => s.value === p.estado) ?? ESTADOS_PROYECTO[0];

  // ====================================================================
  // Sprint 4.2 — Solicitudes del proyecto (vista enriquecida)
  // ====================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: solicitudesRaw } = await (supabase as any)
    .from("v_proyecto_solicitudes_lista")
    .select(
      "id, numero, tipo, titulo, descripcion, monto_estimado, urgencia, estado, solicitante_id, asignado_a_id, campos_tipo, entidades_relacionadas, razon_rechazo, resuelta_at, created_at, num_comentarios, num_adjuntos",
    )
    .eq("proyecto_id", params.id)
    .order("created_at", { ascending: false });
  const solicitudes: SolicitudListItem[] = (solicitudesRaw ?? []) as SolicitudListItem[];
  const solicitudesActivas = solicitudes.filter((s) =>
    ["solicitada", "en_revision", "aprobada"].includes(s.estado),
  ).length;

  // Servicios y empresas del grupo para los pickers contextuales
  const { data: empresasGrupoRaw } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");
  const empresasGrupo = (empresasGrupoRaw ?? []).map((e) => ({
    id: e.id,
    codigo: e.codigo,
    nombre: e.nombre_comercial ?? e.razon_social,
  }));
  const { data: serviciosRaw } = await supabase
    .from("catalogo_servicios")
    .select(
      "id, empresa_id, codigo, nombre, unidad, costo_base, margen_inter_co, precio_inter_co",
    )
    .eq("activo", true)
    .order("codigo")
    .limit(500);
  const serviciosGrupo = (serviciosRaw ?? []).map((s) => ({
    id: s.id,
    empresa_id: s.empresa_id,
    codigo: s.codigo,
    nombre: s.nombre,
    unidad: s.unidad,
    costo_base: s.costo_base != null ? Number(s.costo_base) : null,
    margen_inter_co:
      s.margen_inter_co != null ? Number(s.margen_inter_co) : null,
    precio_inter_co:
      s.precio_inter_co != null ? Number(s.precio_inter_co) : null,
  }));
  const { data: proveedoresRaw } = await supabase
    .from("proveedores")
    .select("id, razon_social, nombre_comercial")
    .eq("activo", true)
    .order("razon_social")
    .limit(300);

  // Permisos sobre solicitudes
  const { data: usrSession } = await supabase.auth.getUser();
  const yo = usrSession.user?.id ?? null;
  const puedeAprobar =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "aprobador_financiero") ||
    esRolEn(vinculos, p.empresa_id, ["director", "operativo"]) ||
    p.pm_id === yo;
  const esCEOoDirector =
    esCEO(vinculos) || esRolEn(vinculos, p.empresa_id, "director");

  const margen =
    p.monto_contratado != null && p.presupuesto_costo != null
      ? Number(p.monto_contratado) - Number(p.presupuesto_costo)
      : null;
  const margenPct =
    margen != null && Number(p.monto_contratado) > 0
      ? (margen / Number(p.monto_contratado)) * 100
      : null;

  const tabs: TabConfig[] = [
    { key: "resumen", label: "Resumen" },
    { key: "tareas", label: "Tareas", count: tareas.length },
    {
      key: "solicitudes",
      label: "Solicitudes",
      count: solicitudesActivas,
    },
    { key: "costos", label: "Costos" },
    { key: "oc", label: "Compras", count: ocs?.length ?? 0 },
    {
      key: "bitacora",
      label: "Bitácora",
      count: bitacora.length,
    },
    {
      key: "reportes",
      label: "Reportes",
      count: reportes.length,
    },
    {
      key: "documentos",
      label: "Documentos",
      count: documentos.length,
    },
    {
      key: "equipo",
      label: "Equipo",
      count: equipo.filter((m) => !m.fecha_baja).length,
    },
  ];

  const empresa = p.empresas as
    | { codigo: string; razon_social: string; nombre_comercial: string | null }
    | null;
  const cliente = p.clientes as
    | { id: string; razon_social: string; rfc: string }
    | null;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/proyectos"
          className="text-[12px] text-ink-3 hover:text-ink-1"
        >
          ← Proyectos
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <StatusDot status={status} size={10} />
              <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">
                {p.nombre}
              </h1>
            </div>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-3">
              <code className="font-mono">{p.codigo}</code>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    empresaCodigoColor[empresa?.codigo ?? ""] ??
                    "bg-muted-foreground"
                  }`}
                />
                {empresa?.nombre_comercial ?? empresa?.razon_social}
              </span>
              {cliente?.razon_social && (
                <>
                  <span>·</span>
                  <span>{cliente.razon_social}</span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-medium ${estado.color}`}
            >
              {estado.label}
            </span>
            {puedeGestionar && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/proyectos/${p.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Avance vs plan"
          value={`${real}`}
          unit="%"
          sub={`Plan: ${plan}%`}
          accent={real < plan - 5 ? "danger" : real < plan ? "warn" : "ok"}
        />
        <KpiCard
          label="Contratado"
          value={
            p.monto_contratado != null
              ? fmtMxn.format(Number(p.monto_contratado))
              : "—"
          }
          sub={
            p.monto_facturado != null
              ? `${fmtMxn.format(Number(p.monto_facturado))} facturado`
              : undefined
          }
        />
        <KpiCard
          label="OC aprobadas"
          value={fmtMxn.format(totalOCAprobadas)}
          sub={`${ocs?.length ?? 0} OC asignadas`}
          accent={pctConsumido > 90 ? "warn" : "brand"}
        />
        <KpiCard
          label="Margen"
          value={margen != null ? fmtMxn.format(margen) : "—"}
          sub={
            margenPct != null
              ? `${margenPct.toFixed(1)}% sobre venta`
              : undefined
          }
          accent={
            margenPct != null && margenPct >= 15
              ? "ok"
              : margenPct != null && margenPct >= 5
                ? "warn"
                : "danger"
          }
        />
      </div>

      {/* Tabs */}
      <ProyectoTabs
        tabs={tabs}
        panels={{
          resumen: (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Avance vs plan */}
              <section className="rounded-md border border-border bg-card p-5 shadow-xs lg:col-span-2">
                <h2 className="mb-4 text-[13.5px] font-semibold">
                  Avance vs plan
                </h2>
                <div className="space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-ink-3">Avance financiero</span>
                      <span className="font-mono tnum font-medium">
                        {real}% real / {plan}% plan
                      </span>
                    </div>
                    <DualBar
                      planned={plan}
                      actual={real}
                      max={100}
                      height={20}
                    />
                  </div>
                  {presupuesto > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[12px]">
                        <span className="text-ink-3">
                          Consumo del presupuesto (OC aprobadas)
                        </span>
                        <span className="font-mono tnum font-medium">
                          {pctConsumido.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-3">
                        <div
                          className={`h-full transition-all ${
                            pctConsumido > 100
                              ? "bg-danger"
                              : pctConsumido > 80
                                ? "bg-warn"
                                : "bg-brand"
                          }`}
                          style={{
                            width: `${Math.min(pctConsumido, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t border-divider pt-4 sm:grid-cols-4">
                  <Stat
                    label="Monto cobrado"
                    value={
                      p.monto_cobrado != null
                        ? fmtMxn.format(Number(p.monto_cobrado))
                        : "—"
                    }
                  />
                  <Stat
                    label="Saldo pendiente"
                    value={
                      p.saldo_pendiente != null
                        ? fmtMxn.format(Number(p.saldo_pendiente))
                        : "—"
                    }
                  />
                  <Stat
                    label="Costo real"
                    value={
                      p.costo_real != null
                        ? fmtMxn.format(Number(p.costo_real))
                        : "—"
                    }
                  />
                  <Stat
                    label="OT inter-co"
                    value={ots?.length ?? 0}
                    mono={false}
                  />
                </div>
              </section>

              {/* Datos */}
              <aside className="space-y-4">
                <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                  <h2 className="mb-3 text-[13.5px] font-semibold">
                    Datos del proyecto
                  </h2>
                  <dl className="space-y-2.5 text-[13px]">
                    <Row k="Tipo" v={tipoLabel(p.tipo)} />
                    {p.capacidad_kwp != null && (
                      <Row
                        k="Capacidad"
                        v={`${Number(p.capacidad_kwp).toLocaleString("es-MX")} kWp`}
                      />
                    )}
                    <Row k="Cliente" v={cliente?.razon_social ?? "—"} />
                    {cliente?.rfc && (
                      <Row
                        k="RFC cliente"
                        v={
                          <code className="font-mono text-[11px]">
                            {cliente.rfc}
                          </code>
                        }
                      />
                    )}
                  </dl>
                </section>

                <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                  <h2 className="mb-3 text-[13.5px] font-semibold">Fechas</h2>
                  <dl className="space-y-2.5 text-[13px]">
                    <Row k="Contrato" v={fmtFecha(p.fecha_contrato)} />
                    <Row
                      k="Inicio planeado"
                      v={fmtFecha(p.fecha_inicio_planeado)}
                    />
                    <Row
                      k="Fin planeado"
                      v={fmtFecha(p.fecha_fin_planeado)}
                    />
                    <Row
                      k="Inicio real"
                      v={fmtFecha(p.fecha_inicio_real)}
                    />
                    <Row k="Fin real" v={fmtFecha(p.fecha_fin_real)} />
                  </dl>
                </section>
              </aside>

              {/* Descripción + observaciones */}
              {(p.descripcion || p.observaciones) && (
                <section className="rounded-md border border-border bg-card p-5 shadow-xs lg:col-span-3">
                  {p.descripcion && (
                    <>
                      <h2 className="mb-2 text-[13.5px] font-semibold">
                        Descripción
                      </h2>
                      <p className="whitespace-pre-wrap text-[13px] text-ink-2">
                        {p.descripcion}
                      </p>
                    </>
                  )}
                  {p.observaciones && (
                    <>
                      <h2
                        className={`${p.descripcion ? "mt-4" : ""} mb-2 text-[13.5px] font-semibold`}
                      >
                        Observaciones internas
                      </h2>
                      <p className="whitespace-pre-wrap text-[13px] text-ink-2">
                        {p.observaciones}
                      </p>
                    </>
                  )}
                </section>
              )}

              {/* OT inter-co */}
              {ots && ots.length > 0 && (
                <section className="rounded-md border border-border bg-card shadow-xs lg:col-span-3">
                  <header className="border-b border-divider px-5 py-3">
                    <h2 className="text-[13.5px] font-semibold">
                      OT inter-co relacionadas
                    </h2>
                  </header>
                  <Table>
                    <TableHeader>
                      <TableRow interactive={false}>
                        <TableHead>Número</TableHead>
                        <TableHead>Origen → Destino</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead align="right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ots.map((ot) => {
                        const o = ot.origen as { codigo: string } | null;
                        const d = ot.destino as { codigo: string } | null;
                        return (
                          <TableRow key={ot.id}>
                            <TableCell className="font-mono text-xs">
                              <Link
                                href={`/finanzas/ot/${ot.id}`}
                                className="text-brand hover:underline"
                              >
                                {ot.numero}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs">
                              {o?.codigo} → {d?.codigo}
                            </TableCell>
                            <TableCell className="text-xs">
                              <p className="line-clamp-1 max-w-md">
                                {ot.descripcion}
                              </p>
                            </TableCell>
                            <TableCell align="right" mono>
                              {fmtMxnFull.format(Number(ot.total ?? 0))}
                            </TableCell>
                            <TableCell className="text-xs text-ink-3 capitalize">
                              {ot.estado?.replaceAll("_", " ")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </section>
              )}
            </div>
          ),
          tareas: (
            <TareasPanel
              proyectoId={params.id}
              tareas={tareas}
              puedeEditar={puedeGestionar}
            />
          ),
          solicitudes: (
            <SolicitudesPanel
              proyectoId={params.id}
              empresaId={p.empresa_id}
              proyectoCodigo={p.codigo}
              clienteId={(p.cliente_id as string | null) ?? null}
              clienteRazonSocial={cliente?.razon_social ?? null}
              empresasGrupo={empresasGrupo}
              serviciosGrupo={serviciosGrupo}
              proveedores={(proveedoresRaw ?? []).map((pr) => ({
                id: pr.id,
                razon_social: pr.razon_social,
                rfc: null,
                nombre_comercial: pr.nombre_comercial,
              }))}
              candidatosAsignacion={candidatos.map((c) => ({
                user_id: c.usuario_id,
                nombre: c.nombre_completo,
              }))}
              initialSolicitudes={solicitudes}
              puedeAprobar={puedeAprobar}
              esCEOoDirector={esCEOoDirector}
              yo={yo}
            />
          ),
          bitacora: (
            <BitacoraPanel
              proyectoId={params.id}
              eventos={bitacora}
              puedeEditar={puedeGestionar}
            />
          ),
          reportes: (
            <ReportesPanel
              proyectoId={params.id}
              reportes={reportes}
              candidatos={candidatos}
              puedeEditar={puedeGestionar}
            />
          ),
          documentos: (
            <DocumentosPanel
              proyectoId={params.id}
              documentos={documentos}
              puedeEditar={puedeGestionar}
            />
          ),
          equipo: (
            <EquipoPanel
              proyectoId={params.id}
              miembros={equipo}
              candidatos={candidatos}
              puedeEditar={puedeGestionar}
              pmId={p.pm_id as string | null}
              vendedorId={p.vendedor_id as string | null}
            />
          ),
          costos: (
            <CostosPanel
              presupuesto={presupuesto}
              costoOCAprobadas={totalOCAprobadas}
              costoEstimadoTareas={Number(avanceRow?.costo_estimado_total ?? 0)}
              costoRealTareas={Number(avanceRow?.costo_real_total ?? 0)}
              horasEstimadas={Number(avanceRow?.horas_estimadas_total ?? 0)}
              horasReales={Number(avanceRow?.horas_reales_total ?? 0)}
              avancePonderado={Number(avanceRow?.avance_ponderado ?? 0)}
              totalTareas={Number(avanceRow?.total_tareas ?? 0)}
              tareasCompletadas={Number(avanceRow?.tareas_completadas ?? 0)}
              hitosCompletados={Number(avanceRow?.hitos_completados ?? 0)}
              totalHitos={Number(avanceRow?.total_hitos ?? 0)}
            />
          ),
          oc: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13.5px] font-semibold">
                    Órdenes de compra del proyecto
                  </h2>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {ocs?.length ?? 0} OC ·{" "}
                    <span className="font-mono">
                      {fmtMxnFull.format(totalOC)}
                    </span>{" "}
                    total · {fmtMxnFull.format(totalOCAprobadas)} aprobadas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {puedeCrearOC && (
                    <>
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/inventario/movimientos/nuevo?proyecto=${p.id}&tipo=salida_proyecto`}
                        >
                          <Plus className="h-3.5 w-3.5" /> Salida inventario
                        </Link>
                      </Button>
                      <Button size="sm" asChild>
                        <Link href={`/finanzas/oc/nueva?proyecto=${p.id}`}>
                          <Plus className="h-3.5 w-3.5" /> Nueva OC
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {!ocs || ocs.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-card p-12 text-center">
                  <p className="text-sm font-medium">Sin OC asignadas.</p>
                  <p className="mt-1 text-xs text-ink-3">
                    Crea una OC con este proyecto para verla aquí.
                  </p>
                </div>
              ) : (
                <TableSurface>
                  <Table>
                    <TableHeader>
                      <TableRow interactive={false}>
                        <TableHead>OC</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead align="right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ocs.map((oc) => {
                        const estadoOc =
                          ESTADOS_OC.find((s) => s.value === oc.estado) ??
                          ESTADOS_OC[0];
                        return (
                          <TableRow key={oc.id}>
                            <TableCell className="font-mono">
                              <Link
                                href={`/finanzas/oc/${oc.id}`}
                                className="text-brand hover:underline"
                              >
                                {oc.numero}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs">
                              {(oc.proveedores as { razon_social: string } | null)
                                ?.razon_social ?? "—"}
                            </TableCell>
                            <TableCell className="text-xs text-ink-3">
                              {fmtFecha(oc.fecha_emision)}
                            </TableCell>
                            <TableCell align="right" mono>
                              {fmtMxnFull.format(Number(oc.total))}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${estadoOc.color}`}
                              >
                                {estadoOc.label}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableSurface>
              )}

              {salidasInv.length > 0 && (
                <section className="mt-6">
                  <h3 className="mb-2 text-[12.5px] font-semibold">
                    Salidas de inventario al proyecto · {fmtMxnFull.format(totalSalidasInv)}
                  </h3>
                  <TableSurface>
                    <Table>
                      <TableHeader>
                        <TableRow interactive={false}>
                          <TableHead>Fecha</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead>Almacén</TableHead>
                          <TableHead align="right">Cantidad</TableHead>
                          <TableHead align="right">Costo unit.</TableHead>
                          <TableHead align="right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salidasInv.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs text-ink-3">
                              {fmtFecha(s.fecha)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {s.producto_codigo}
                            </TableCell>
                            <TableCell className="text-xs">
                              {s.producto_nombre}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {s.almacen_codigo}
                            </TableCell>
                            <TableCell align="right" mono className="text-xs">
                              {Number(s.cantidad).toLocaleString("es-MX", {
                                maximumFractionDigits: 2,
                              })}{" "}
                              {s.unidad_medida}
                            </TableCell>
                            <TableCell align="right" mono className="text-xs">
                              {s.costo_unitario
                                ? fmtMxnFull.format(Number(s.costo_unitario))
                                : "—"}
                            </TableCell>
                            <TableCell align="right" mono className="text-xs">
                              {s.monto_total
                                ? fmtMxnFull.format(Number(s.monto_total))
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableSurface>
                </section>
              )}

              {cfdis.length > 0 && (
                <section className="mt-6">
                  <h3 className="mb-2 text-[12.5px] font-semibold">
                    CFDI vinculados
                  </h3>
                  <TableSurface>
                    <Table>
                      <TableHeader>
                        <TableRow interactive={false}>
                          <TableHead>Folio</TableHead>
                          <TableHead>Emisor</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead align="right">Total</TableHead>
                          <TableHead align="right">Saldo</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cfdis.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono text-xs">
                              <Link
                                href={`/finanzas/cfdi/${c.id}`}
                                className="text-brand hover:underline"
                              >
                                {c.serie}
                                {c.folio ?? ""}
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs">
                              {c.nombre_emisor ?? c.rfc_emisor}
                            </TableCell>
                            <TableCell className="text-xs text-ink-3">
                              {fmtFecha(c.fecha_emision)}
                            </TableCell>
                            <TableCell align="right" mono>
                              {fmtMxnFull.format(Number(c.total))}
                            </TableCell>
                            <TableCell align="right" mono>
                              {Number(c.saldo_pendiente ?? 0) > 0.01
                                ? fmtMxnFull.format(Number(c.saldo_pendiente))
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs capitalize">
                              {c.estado?.replaceAll("_", " ") ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableSurface>
                </section>
              )}
            </div>
          ),
        }}
      />

      <p className="mt-8 text-[11px] text-ink-4">
        {p.created_at && (
          <>Creado {new Date(p.created_at).toLocaleString("es-MX")}</>
        )}
      </p>
    </div>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2">
      <dt className="text-ink-3">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function CostosPanel({
  presupuesto,
  costoOCAprobadas,
  costoEstimadoTareas,
  costoRealTareas,
  horasEstimadas,
  horasReales,
  avancePonderado,
  totalTareas,
  tareasCompletadas,
  hitosCompletados,
  totalHitos,
}: {
  presupuesto: number;
  costoOCAprobadas: number;
  costoEstimadoTareas: number;
  costoRealTareas: number;
  horasEstimadas: number;
  horasReales: number;
  avancePonderado: number;
  totalTareas: number;
  tareasCompletadas: number;
  hitosCompletados: number;
  totalHitos: number;
}) {
  const costoComprometido = costoOCAprobadas + costoRealTareas;
  const pctConsumido =
    presupuesto > 0
      ? Math.min(100, (costoComprometido / presupuesto) * 100)
      : 0;
  const sobrecosto = costoComprometido - presupuesto;
  const desviacionTareas = costoRealTareas - costoEstimadoTareas;
  const desviacionHoras = horasReales - horasEstimadas;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Presupuesto"
          value={fmtMxn.format(presupuesto)}
          sub={`${pctConsumido.toFixed(0)}% comprometido`}
          accent={
            pctConsumido > 95 ? "danger" : pctConsumido > 80 ? "warn" : "brand"
          }
        />
        <KpiCard
          label="OC aprobadas"
          value={fmtMxn.format(costoOCAprobadas)}
          sub="Compras del proyecto"
        />
        <KpiCard
          label="Costo real (tareas)"
          value={fmtMxn.format(costoRealTareas)}
          sub={`vs ${fmtMxn.format(costoEstimadoTareas)} est.`}
          accent={
            desviacionTareas > 0
              ? desviacionTareas > costoEstimadoTareas * 0.1
                ? "danger"
                : "warn"
              : "ok"
          }
        />
        <KpiCard
          label="Sobrecosto"
          value={
            sobrecosto > 0 ? `+${fmtMxn.format(sobrecosto)}` : fmtMxn.format(0)
          }
          sub={
            sobrecosto > 0
              ? `${((sobrecosto / Math.max(presupuesto, 1)) * 100).toFixed(1)}% del presupuesto`
              : "Dentro del presupuesto"
          }
          accent={sobrecosto > 0 ? "danger" : "ok"}
        />
      </div>

      <section className="rounded-md border border-border bg-card p-5 shadow-xs">
        <h3 className="mb-3 text-[13.5px] font-semibold">
          Composición del costo comprometido
        </h3>
        {presupuesto > 0 ? (
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-ink-3">Presupuesto consumido</span>
                <span className="font-mono tnum font-medium">
                  {fmtMxn.format(costoComprometido)} /{" "}
                  {fmtMxn.format(presupuesto)} ({pctConsumido.toFixed(1)}%)
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-bg-3">
                <div
                  className="bg-brand"
                  style={{
                    width: `${Math.min((costoOCAprobadas / Math.max(presupuesto, 1)) * 100, 100)}%`,
                  }}
                  title={`OC aprobadas: ${fmtMxn.format(costoOCAprobadas)}`}
                />
                <div
                  className="bg-amber-500"
                  style={{
                    width: `${Math.min((costoRealTareas / Math.max(presupuesto, 1)) * 100, 100)}%`,
                  }}
                  title={`Costo real tareas: ${fmtMxn.format(costoRealTareas)}`}
                />
              </div>
              <div className="mt-1 flex gap-3 text-[10.5px] text-ink-3">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-brand" />
                  OC aprobadas
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
                  Costo real tareas
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-3">
            Define el presupuesto del proyecto para ver el % de consumo.
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h3 className="mb-3 text-[13.5px] font-semibold">Esfuerzo (horas)</h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Estimadas</span>
              <span className="font-mono tnum">
                {horasEstimadas.toLocaleString("es-MX", {
                  maximumFractionDigits: 1,
                })}
                h
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Reales</span>
              <span className="font-mono tnum">
                {horasReales.toLocaleString("es-MX", {
                  maximumFractionDigits: 1,
                })}
                h
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-divider pt-2">
              <span className="text-ink-3">Desviación</span>
              <span
                className={`font-mono tnum font-medium ${
                  desviacionHoras > 0
                    ? "text-amber-700"
                    : desviacionHoras < 0
                      ? "text-emerald-700"
                      : "text-ink-2"
                }`}
              >
                {desviacionHoras > 0 ? "+" : ""}
                {desviacionHoras.toLocaleString("es-MX", {
                  maximumFractionDigits: 1,
                })}
                h
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h3 className="mb-3 text-[13.5px] font-semibold">
            Avance por tareas
          </h3>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between">
              <span className="text-ink-3">Avance ponderado</span>
              <span className="font-mono tnum font-medium">
                {avancePonderado}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-3">
              <div
                className="h-full bg-brand"
                style={{ width: `${avancePonderado}%` }}
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-ink-3">Tareas completadas</span>
              <span className="font-mono tnum">
                {tareasCompletadas} / {totalTareas}
              </span>
            </div>
            {totalHitos > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-ink-3">Hitos alcanzados</span>
                <span className="font-mono tnum">
                  {hitosCompletados} / {totalHitos}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
