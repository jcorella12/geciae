import { Suspense, type ComponentType, type ReactElement } from "react";

import {
  obtenerWidget,
  type LayoutEntry,
  type TamanoWidget,
} from "@/lib/dashboard-widgets/catalogo";

import { WidgetCard, TAMANO_CLASES } from "./widget-card";
import * as Widgets from "./widgets";

type AnyProps = { empresaId?: string | null };

const WIDGET_COMPONENTES: Record<string, ComponentType<AnyProps>> = {
  hero_margen_consolidado: Widgets.HeroMargenConsolidado,
  hero_margen_empresa: Widgets.HeroMargenEmpresa,
  hero_cash_grupo: Widgets.HeroCashGrupo,
  hero_cash_empresa: Widgets.HeroCashEmpresa,
  hero_proyectos_riesgo: Widgets.HeroProyectosRiesgo,
  hero_cumplimiento_sat: Widgets.HeroCumplimientoSat,
  hero_alertas_criticas: Widgets.HeroAlertasCriticas,
  hero_ocs_pendientes: Widgets.HeroOcsPendientes,
  hero_cfdis_sin_centro: Widgets.HeroCfdisSinCentro,
  hero_conciliacion_pendiente: Widgets.HeroConciliacionPendiente,
  hero_cierre_mensual: Widgets.HeroCierreMensual,
  hero_mis_proyectos: Widgets.HeroMisProyectos,
  hero_mis_tareas: Widgets.HeroMisTareas,
  hero_mis_aprobaciones: Widgets.HeroMisAprobaciones,
  posicion_consolidada: Widgets.PosicionConsolidada,
  cashflow_30d: Widgets.Cashflow30d,
  top_proyectos_margen: Widgets.TopProyectosMargen,
  top_clientes_ingreso: Widgets.TopClientesIngreso,
  matriz_inter_co: Widgets.MatrizInterCo,
  tesoreria_resumen: Widgets.TesoreriaResumen,
  top_proveedores_pago: Widgets.TopProveedoresPago,
  obligaciones_proximas: Widgets.ObligacionesProximas,
  mi_equipo_resumen: Widgets.MiEquipoResumen,
  inventario_consolidado: Widgets.InventarioConsolidado,
  arrendamientos_vehiculos: Widgets.ArrendamientosVehiculos,
  top_indirectos: Widgets.TopIndirectos,
  panel_liquidez: Widgets.PanelLiquidez,
  panel_salud_proyectos: Widgets.PanelSaludProyectos,
  panel_pendientes: Widgets.PanelPendientes,
  panel_ingresos_empresa: Widgets.PanelIngresosEmpresa,
  mis_proyectos_riesgo: Widgets.MisProyectosRiesgo,
};

/**
 * Renderiza widgets según el layout del usuario. En modo compacto solo
 * muestra los marcados como `esHero`. Cada widget se envuelve en
 * <WidgetCard> que provee el toolbar (ocultar, tamaño) y respeta
 * el grid (col-span según tamaño).
 */
export function WidgetGrid({
  layout,
  modoCompacto,
  empresaId,
}: {
  layout: LayoutEntry[];
  modoCompacto: boolean;
  empresaId?: string | null;
}): ReactElement {
  const visibles = layout
    .filter((l) => l.visible)
    .filter((l) => {
      if (!modoCompacto) return true;
      const meta = obtenerWidget(l.widget_id);
      return meta?.esHero ?? false;
    })
    .sort((a, b) => a.orden - b.orden);

  if (visibles.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
        Sin widgets activos. Usa &laquo;+ Agregar widget&raquo; o aplica una plantilla.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {visibles.map((item) => {
        const meta = obtenerWidget(item.widget_id);
        if (!meta) return null;

        const Componente = WIDGET_COMPONENTES[item.widget_id];
        if (!Componente) return null;

        return (
          <WidgetCard
            key={item.widget_id}
            widgetId={item.widget_id}
            titulo={meta.nombre}
            tamano={item.tamano as TamanoWidget}
            tamanosPermitidos={meta.tamanosPermitidos}
          >
            <Suspense
              fallback={
                <div className="h-24 animate-pulse rounded bg-bg-2" />
              }
            >
              <Componente empresaId={empresaId} />
            </Suspense>
          </WidgetCard>
        );
      })}
    </div>
  );
}

export { TAMANO_CLASES };
