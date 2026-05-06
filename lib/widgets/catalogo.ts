/**
 * Catálogo de widgets disponibles para Mi día y Dashboard.
 * Cada widget está identificado por un id único, tiene metadata para el
 * picker (nombre, descripción, tamaño, roles sugeridos) y un slug usado
 * por el WidgetGrid para renderizar el componente correspondiente.
 */

export type WidgetTamaño = "small" | "medium" | "large";
export type WidgetPagina = "mi-dia" | "dashboard" | "ambas";

export type WidgetMetadata = {
  id: string;
  nombre: string;
  descripcion: string;
  pagina: WidgetPagina;
  tamañoDefault: WidgetTamaño;
  rolesSugeridos: Array<"ceo" | "director" | "operativo" | "consulta">;
  atributosSugeridos?: string[];
};

export const CATALOGO_WIDGETS: WidgetMetadata[] = [
  // Mi día
  {
    id: "mis_tareas_hoy",
    nombre: "Mis tareas de hoy",
    descripcion: "Tareas de proyecto asignadas a ti que vencen hoy o están atrasadas.",
    pagina: "mi-dia",
    tamañoDefault: "medium",
    rolesSugeridos: ["operativo", "director"],
  },
  {
    id: "oportunidades_pendientes",
    nombre: "Oportunidades pendientes",
    descripcion: "Tus oportunidades en pipeline que requieren acción.",
    pagina: "mi-dia",
    tamañoDefault: "medium",
    rolesSugeridos: ["operativo"],
    atributosSugeridos: ["vendedor"],
  },
  {
    id: "ocs_por_aprobar",
    nombre: "OCs por aprobar",
    descripcion: "Órdenes de compra esperando tu aprobación.",
    pagina: "mi-dia",
    tamañoDefault: "small",
    rolesSugeridos: ["director", "ceo"],
    atributosSugeridos: ["aprobador_financiero"],
  },
  {
    id: "ots_por_aprobar",
    nombre: "OTs por aprobar",
    descripcion: "Órdenes de trabajo inter-co esperando tu confirmación.",
    pagina: "mi-dia",
    tamañoDefault: "small",
    rolesSugeridos: ["director", "ceo"],
  },
  {
    id: "solicitudes_pendientes",
    nombre: "Solicitudes pendientes",
    descripcion: "Solicitudes de proyecto y préstamos para aprobar.",
    pagina: "mi-dia",
    tamañoDefault: "medium",
    rolesSugeridos: ["director"],
  },
  {
    id: "mi_vehiculo",
    nombre: "Mi vehículo",
    descripcion: "Vehículo asignado y consumo de gasolina del mes.",
    pagina: "mi-dia",
    tamañoDefault: "small",
    rolesSugeridos: ["operativo", "director"],
  },
  {
    id: "mi_compensacion_mes",
    nombre: "Mi compensación",
    descripcion: "Compensación del mes (sueldo + bonos + viáticos).",
    pagina: "mi-dia",
    tamañoDefault: "small",
    rolesSugeridos: ["operativo", "director"],
  },
  {
    id: "ultimas_notificaciones",
    nombre: "Últimas notificaciones",
    descripcion: "Las 5 notificaciones más recientes.",
    pagina: "ambas",
    tamañoDefault: "small",
    rolesSugeridos: ["operativo", "director", "ceo"],
  },
  // Dashboard
  {
    id: "kpi_cumplimiento_sat",
    nombre: "KPI Cumplimiento SAT",
    descripcion: "% de obligaciones SAT presentadas en tiempo.",
    pagina: "dashboard",
    tamañoDefault: "small",
    rolesSugeridos: ["ceo", "director"],
    atributosSugeridos: ["tesorero_corporativo", "contralor"],
  },
  {
    id: "kpi_margen_consolidado",
    nombre: "Margen consolidado",
    descripcion: "Margen del periodo (ingresos - costos).",
    pagina: "dashboard",
    tamañoDefault: "small",
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "top_proyectos_riesgo",
    nombre: "Proyectos en riesgo",
    descripcion: "Top 5 proyectos con alertas (atraso, sobrecosto, riesgo).",
    pagina: "dashboard",
    tamañoDefault: "medium",
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "alertas_calibracion",
    nombre: "Calibraciones por vencer",
    descripcion: "Activos con calibración vencida o próxima.",
    pagina: "dashboard",
    tamañoDefault: "small",
    rolesSugeridos: ["director"],
    atributosSugeridos: ["contralor"],
  },
  {
    id: "prestamos_activos_actuales",
    nombre: "Préstamos en curso",
    descripcion: "Préstamos de activos del grupo que están en uso.",
    pagina: "dashboard",
    tamañoDefault: "medium",
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "proximas_obligaciones_sat",
    nombre: "Próximas obligaciones SAT",
    descripcion: "Vencimientos SAT en los próximos 30 días.",
    pagina: "dashboard",
    tamañoDefault: "small",
    rolesSugeridos: ["ceo"],
    atributosSugeridos: ["tesorero_corporativo"],
  },
];

export type LayoutEntry = {
  widget_id: string;
  orden: number;
  visible: boolean;
  tamaño: WidgetTamaño;
};

export type WidgetLayout = LayoutEntry[];

export function layoutDefaultPorRol(
  pagina: "mi-dia" | "dashboard",
  roles: string[],
  atributos: string[],
): WidgetLayout {
  const widgetsPagina = CATALOGO_WIDGETS.filter(
    (w) => w.pagina === pagina || w.pagina === "ambas",
  );
  const sugeridos = widgetsPagina.filter(
    (w) =>
      w.rolesSugeridos.some((r) => roles.includes(r)) ||
      (w.atributosSugeridos ?? []).some((a) => atributos.includes(a)),
  );
  // Si nada sugerido, mostrar primeros 4
  const finales = sugeridos.length > 0 ? sugeridos : widgetsPagina.slice(0, 4);
  return finales.map((w, i) => ({
    widget_id: w.id,
    orden: i,
    visible: true,
    tamaño: w.tamañoDefault,
  }));
}

export function widgetPorId(id: string): WidgetMetadata | undefined {
  return CATALOGO_WIDGETS.find((w) => w.id === id);
}
