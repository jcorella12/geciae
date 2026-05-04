import {
  AlertCircle,
  Calendar as CalIcon,
  Car,
  CheckSquare,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EventoCalendario = {
  fecha: string; // YYYY-MM-DD
  tipo:
    | "tarea"
    | "obligacion_sat"
    | "oportunidad"
    | "vehiculo_doc"
    | "vehiculo_seguro";
  titulo: string;
  subtitulo: string | null;
  url: string;
  color: string;
  icono: "tarea" | "sat" | "comercial" | "vehiculo";
};

const COLORES: Record<EventoCalendario["icono"], string> = {
  tarea: "bg-sky-100 text-sky-700 border-sky-300",
  sat: "bg-amber-100 text-amber-700 border-amber-300",
  comercial: "bg-violet-100 text-violet-700 border-violet-300",
  vehiculo: "bg-orange-100 text-orange-700 border-orange-300",
};

const ICONOS = {
  tarea: CheckSquare,
  sat: AlertCircle,
  comercial: Target,
  vehiculo: Car,
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}
function endOfMonth(y: number, m: number) {
  return new Date(y, m + 1, 0);
}
function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: { y?: string; m?: string; tipo?: string };
}) {
  const hoy = new Date();
  const year = parseInt(searchParams.y ?? "") || hoy.getFullYear();
  const month = parseInt(searchParams.m ?? "") || hoy.getMonth() + 1; // 1-based
  const tipoFiltro = searchParams.tipo ?? "todos";

  const m0 = month - 1; // 0-based JS
  const inicio = startOfMonth(year, m0);
  const fin = endOfMonth(year, m0);

  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const { data: { user } } = await supabase.auth.getUser();
  // Tareas
  let tareas: Array<{
    id: string;
    titulo: string;
    fecha_fin_planeada: string | null;
    proyecto_id: string;
    es_hito: boolean | null;
  }> = [];
  if (user) {
    const { data } = await supabase
      .from("proyecto_tareas")
      .select("id, titulo, fecha_fin_planeada, proyecto_id, es_hito")
      .eq("asignado_a", user.id)
      .gte("fecha_fin_planeada", fmt(inicio))
      .lte("fecha_fin_planeada", fmt(fin))
      .not("estado", "in", "(completada,cancelada)");
    tareas = data ?? [];
  }

  // Obligaciones SAT
  let obligaciones: Array<{
    id: string;
    tipo: string;
    periodo: string;
    fecha_limite: string;
  }> = [];
  if (empresasIds.length > 0) {
    const { data } = await supabase
      .from("obligaciones_sat")
      .select("id, tipo, periodo_label, fecha_vencimiento")
      .in("empresa_id", empresasIds)
      .gte("fecha_vencimiento", fmt(inicio))
      .lte("fecha_vencimiento", fmt(fin));
    obligaciones = (data ?? []).map((o) => ({
      id: o.id,
      tipo: o.tipo,
      periodo: o.periodo_label ?? "",
      fecha_limite: o.fecha_vencimiento,
    }));
  }

  // Oportunidades con próxima_acción
  let oportunidades: Array<{
    id: string;
    nombre: string;
    fecha_proxima_accion: string | null;
    proxima_accion: string | null;
  }> = [];
  if (user) {
    const { data } = await supabase
      .from("oportunidades")
      .select("id, nombre, fecha_proxima_accion, proxima_accion, vendedor_id")
      .gte("fecha_proxima_accion", fmt(inicio))
      .lte("fecha_proxima_accion", fmt(fin))
      .not("estado", "in", "(ganado,perdido)");
    oportunidades = data ?? [];
  }

  // Vencimientos vehiculares
  let vehDocs: Array<{
    id: string;
    placa: string | null;
    categoria: string;
    vehiculo_id: string;
    fecha_vencimiento: string | null;
  }> = [];
  if (empresasIds.length > 0) {
    const { data } = await supabase
      .from("v_vehiculos_documentos_alertas")
      .select("id, placa, categoria, vehiculo_id, fecha_vencimiento, empresa_id")
      .in("empresa_id", empresasIds)
      .gte("fecha_vencimiento", fmt(inicio))
      .lte("fecha_vencimiento", fmt(fin));
    vehDocs = (data ?? [])
      .filter((d): d is typeof d & { id: string; vehiculo_id: string; categoria: string } =>
        d.id !== null && d.vehiculo_id !== null && d.categoria !== null,
      )
      .map((d) => ({
        id: d.id,
        placa: d.placa,
        categoria: d.categoria,
        vehiculo_id: d.vehiculo_id,
        fecha_vencimiento: d.fecha_vencimiento,
      }));
  }

  // Construir mapa de eventos por día
  const eventos: EventoCalendario[] = [];

  for (const t of tareas) {
    if (!t.fecha_fin_planeada) continue;
    eventos.push({
      fecha: t.fecha_fin_planeada,
      tipo: "tarea",
      titulo: (t.es_hito ? "◆ " : "") + t.titulo,
      subtitulo: null,
      url: `/proyectos/${t.proyecto_id}`,
      color: COLORES.tarea,
      icono: "tarea",
    });
  }
  for (const o of obligaciones) {
    eventos.push({
      fecha: o.fecha_limite,
      tipo: "obligacion_sat",
      titulo: `${o.tipo.replace(/_/g, " ").toUpperCase()} ${o.periodo}`,
      subtitulo: "Vence",
      url: `/finanzas/obligaciones`,
      color: COLORES.sat,
      icono: "sat",
    });
  }
  for (const op of oportunidades) {
    if (!op.fecha_proxima_accion) continue;
    eventos.push({
      fecha: op.fecha_proxima_accion,
      tipo: "oportunidad",
      titulo: op.proxima_accion ?? op.nombre,
      subtitulo: op.nombre,
      url: `/comercial/oportunidades/${op.id}`,
      color: COLORES.comercial,
      icono: "comercial",
    });
  }
  for (const d of vehDocs) {
    if (!d.fecha_vencimiento) continue;
    eventos.push({
      fecha: d.fecha_vencimiento,
      tipo: "vehiculo_doc",
      titulo: `${d.categoria.replace(/_/g, " ")} · ${d.placa ?? "vehículo"}`,
      subtitulo: "Vence",
      url: `/activos/vehiculos/${d.vehiculo_id}`,
      color: COLORES.vehiculo,
      icono: "vehiculo",
    });
  }

  // Filtrar
  const eventosFiltrados =
    tipoFiltro === "todos"
      ? eventos
      : eventos.filter((e) => e.icono === tipoFiltro);

  const eventosPorDia = new Map<string, EventoCalendario[]>();
  for (const e of eventosFiltrados) {
    if (!eventosPorDia.has(e.fecha)) eventosPorDia.set(e.fecha, []);
    eventosPorDia.get(e.fecha)!.push(e);
  }

  // Construir grid del mes (semanas Lun-Dom)
  const primerDiaSemana = (inicio.getDay() + 6) % 7; // Lun=0
  const totalDias = fin.getDate();
  const totalCeldas = Math.ceil((primerDiaSemana + totalDias) / 7) * 7;
  const celdas: { fecha: Date | null; key: string }[] = [];
  for (let i = 0; i < totalCeldas; i++) {
    const dayNum = i - primerDiaSemana + 1;
    if (dayNum < 1 || dayNum > totalDias) {
      celdas.push({ fecha: null, key: `empty-${i}` });
    } else {
      celdas.push({
        fecha: new Date(year, m0, dayNum),
        key: `${year}-${m0}-${dayNum}`,
      });
    }
  }

  // Nav prev/next mes
  const prevMonth = m0 === 0 ? 12 : month - 1;
  const prevYear = m0 === 0 ? year - 1 : year;
  const nextMonth = m0 === 11 ? 1 : month + 1;
  const nextYear = m0 === 11 ? year + 1 : year;

  const hoyStr = fmt(hoy);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalIcon className="h-5 w-5 text-ink-3" />
            <h1 className="text-[24px] font-semibold leading-tight">
              Calendario
            </h1>
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Tareas asignadas, vencimientos SAT, próximas acciones comerciales y
            documentos vehiculares.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendario?y=${prevYear}&m=${prevMonth}${tipoFiltro !== "todos" ? `&tipo=${tipoFiltro}` : ""}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-bg-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="px-3 text-[14.5px] font-semibold capitalize">
            {MESES[m0]} {year}
          </span>
          <Link
            href={`/calendario?y=${nextYear}&m=${nextMonth}${tipoFiltro !== "todos" ? `&tipo=${tipoFiltro}` : ""}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-bg-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href="/calendario"
            className="ml-2 rounded-md border border-border bg-card px-3 py-1 text-[12px] hover:bg-bg-2"
          >
            Hoy
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Link
          href={`/calendario?y=${year}&m=${month}`}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tipoFiltro === "todos" ? "bg-ink-1 text-bg-1" : "bg-bg-2 text-ink-2"}`}
        >
          Todos ({eventos.length})
        </Link>
        {(["tarea", "sat", "comercial", "vehiculo"] as const).map((t) => {
          const n = eventos.filter((e) => e.icono === t).length;
          if (n === 0) return null;
          const Icon = ICONOS[t];
          return (
            <Link
              key={t}
              href={`/calendario?y=${year}&m=${month}&tipo=${t}`}
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tipoFiltro === t ? "bg-ink-1 text-bg-1" : COLORES[t]}`}
            >
              <Icon className="h-3 w-3" />
              {t === "tarea"
                ? "Tareas"
                : t === "sat"
                  ? "SAT"
                  : t === "comercial"
                    ? "Comercial"
                    : "Vehículos"}{" "}
              ({n})
            </Link>
          );
        })}
      </div>

      {/* Grid del mes */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-divider bg-bg-2">
          {DIAS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-ink-3"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {celdas.map(({ fecha, key }) => {
            if (!fecha) {
              return (
                <div
                  key={key}
                  className="min-h-[110px] border-b border-r border-divider bg-bg-2/30"
                />
              );
            }
            const fStr = fmt(fecha);
            const evs = eventosPorDia.get(fStr) ?? [];
            const esHoy = fStr === hoyStr;
            return (
              <div
                key={key}
                className={`min-h-[110px] border-b border-r border-divider p-1.5 ${
                  esHoy ? "bg-brand-soft/30" : ""
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`text-[11.5px] font-semibold ${
                      esHoy ? "text-brand" : "text-ink-2"
                    }`}
                  >
                    {fecha.getDate()}
                  </span>
                  {evs.length > 3 && (
                    <span className="text-[9.5px] text-ink-3">
                      +{evs.length - 3}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((e, i) => (
                    <Link
                      key={i}
                      href={e.url}
                      className={`block truncate rounded px-1.5 py-0.5 text-[10px] font-medium hover:opacity-80 ${e.color} border`}
                      title={`${e.titulo}${e.subtitulo ? ` · ${e.subtitulo}` : ""}`}
                    >
                      {e.titulo}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista lateral del mes */}
      {eventosFiltrados.length > 0 && (
        <details className="mt-5" open>
          <summary className="cursor-pointer text-[13px] font-medium text-ink-2 hover:text-ink-1">
            Lista del mes ({eventosFiltrados.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {eventosFiltrados
              .sort((a, b) => a.fecha.localeCompare(b.fecha))
              .map((e, i) => {
                const Icon = ICONOS[e.icono];
                return (
                  <li key={i}>
                    <Link
                      href={e.url}
                      className="flex items-center gap-2 rounded-md border border-divider bg-card px-3 py-1.5 hover:border-brand"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded ${e.color}`}
                      >
                        <Icon className="h-3 w-3" />
                      </span>
                      <span className="font-mono text-[10.5px] text-ink-3">
                        {new Date(e.fecha).toLocaleDateString("es-MX", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                      <span className="flex-1 truncate text-[12.5px]">
                        {e.titulo}
                      </span>
                      {e.subtitulo && (
                        <span className="text-[10.5px] text-ink-3">
                          {e.subtitulo}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </details>
      )}
    </div>
  );
}

