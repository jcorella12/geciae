/**
 * Registry de widget_id → ServerComponent. Todos son async server components
 * que renderizan el contenido del widget consultando Supabase.
 */

import {
  AlertasCalibracion,
  KpiCumplimientoSat,
  KpiMargenConsolidado,
  MiCompensacionMes,
  MisFavoritos,
  MisTareasHoy,
  MiVehiculo,
  OcsPorAprobar,
  OportunidadesPendientes,
  OtsPorAprobar,
  PrestamosActivosActuales,
  ProximasObligacionesSat,
  SolicitudesPendientes,
  TopProyectosRiesgo,
  UltimasNotificaciones,
} from "./widgets-impl";

export const WIDGET_COMPONENTS: Record<
  string,
  () => Promise<JSX.Element> | JSX.Element
> = {
  mis_tareas_hoy: MisTareasHoy,
  oportunidades_pendientes: OportunidadesPendientes,
  ocs_por_aprobar: OcsPorAprobar,
  ots_por_aprobar: OtsPorAprobar,
  solicitudes_pendientes: SolicitudesPendientes,
  mi_vehiculo: MiVehiculo,
  mi_compensacion_mes: MiCompensacionMes,
  ultimas_notificaciones: UltimasNotificaciones,
  kpi_cumplimiento_sat: KpiCumplimientoSat,
  kpi_margen_consolidado: KpiMargenConsolidado,
  top_proyectos_riesgo: TopProyectosRiesgo,
  alertas_calibracion: AlertasCalibracion,
  prestamos_activos_actuales: PrestamosActivosActuales,
  proximas_obligaciones_sat: ProximasObligacionesSat,
  mis_favoritos: MisFavoritos,
};

export async function renderizarWidget(widgetId: string): Promise<JSX.Element> {
  const Comp = WIDGET_COMPONENTS[widgetId];
  if (!Comp) {
    return <p className="text-[11px] text-ink-3">Widget no implementado: {widgetId}</p>;
  }
  return await Comp();
}
