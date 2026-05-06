/**
 * Sprint Z.1.5.A — Catálogo de widgets del dashboard.
 *
 * Define cada widget disponible para personalizar la página de dashboard.
 * Los widgets se renderizan via WidgetGrid según las preferencias del usuario
 * (tabla widget_preferencias_usuario) o la plantilla seleccionada
 * (tabla widget_plantillas).
 *
 * Convención del campo "tamano" (sin ñ para evitar problemas en JSON):
 *   small  → col-span-3  (1/4 width)
 *   medium → col-span-4  (1/3 width)
 *   large  → col-span-6  (1/2 width)
 *   full   → col-span-12 (full width)
 */

import {
  AlertTriangle,
  AlertCircle,
  Banknote,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  Folder,
  GitBranch,
  ListChecks,
  Package,
  ReceiptText,
  TrendingUp,
  Users,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { AtributoUsuario, RolBase } from "@/lib/auth/permisos";

export type CategoriaWidget =
  | "finanzas"
  | "operacion"
  | "comercial"
  | "personal"
  | "sistema"
  | "alertas";

export type TamanoWidget = "small" | "medium" | "large" | "full";

export type WidgetMetadata = {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: CategoriaWidget;
  icon: LucideIcon;
  tamanoDefault: TamanoWidget;
  tamanosPermitidos: TamanoWidget[];
  /** Si true, se considera widget "principal" y se mantiene en modo compacto */
  esHero: boolean;
  rolesSugeridos: RolBase[];
  atributosSugeridos?: AtributoUsuario[];
  /** Si requiere atributo específico para activarlo */
  atributoRequerido?: AtributoUsuario;
};

export const CATALOGO_WIDGETS: WidgetMetadata[] = [
  // ============================================================================
  // HERO — KPIs principales (siempre destacados, persisten en modo compacto)
  // ============================================================================
  {
    id: "hero_margen_consolidado",
    nombre: "Margen consolidado del grupo",
    descripcion: "Margen del periodo sumando las 4 empresas",
    categoria: "finanzas",
    icon: TrendingUp,
    tamanoDefault: "large",
    tamanosPermitidos: ["medium", "large"],
    esHero: true,
    rolesSugeridos: ["ceo"],
    atributoRequerido: "tesorero_corporativo",
  },
  {
    id: "hero_margen_empresa",
    nombre: "Margen de mi empresa",
    descripcion: "Margen del periodo de la empresa donde estás operando",
    categoria: "finanzas",
    icon: TrendingUp,
    tamanoDefault: "large",
    tamanosPermitidos: ["medium", "large"],
    esHero: true,
    rolesSugeridos: ["director"],
  },
  {
    id: "hero_cash_grupo",
    nombre: "Cash del grupo",
    descripcion: "Suma de saldos en bancos de las 4 empresas",
    categoria: "finanzas",
    icon: Banknote,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: ["ceo"],
  },
  {
    id: "hero_cash_empresa",
    nombre: "Cash de mi empresa",
    descripcion: "Saldo en bancos de tu empresa",
    categoria: "finanzas",
    icon: Banknote,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: ["director"],
  },
  {
    id: "hero_proyectos_riesgo",
    nombre: "Proyectos en riesgo",
    descripcion: "Top proyectos con margen rojo o atraso",
    categoria: "operacion",
    icon: AlertTriangle,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: true,
    rolesSugeridos: ["ceo", "director", "operativo"],
  },
  {
    id: "hero_cumplimiento_sat",
    nombre: "Cumplimiento SAT",
    descripcion: "% obligaciones presentadas a tiempo",
    categoria: "finanzas",
    icon: FileCheck,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: ["ceo", "director"],
    atributosSugeridos: ["contralor"],
  },
  {
    id: "hero_alertas_criticas",
    nombre: "Alertas críticas",
    descripcion: "Cosas que requieren atención URGENTE",
    categoria: "alertas",
    icon: AlertTriangle,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: true,
    rolesSugeridos: ["ceo", "director", "operativo"],
  },
  {
    id: "hero_ocs_pendientes",
    nombre: "OCs pendientes de aprobación",
    descripcion: "Cola de OCs esperando tu autorización",
    categoria: "finanzas",
    icon: ClipboardCheck,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: ["director"],
    atributosSugeridos: ["aprobador_financiero"],
  },
  {
    id: "hero_cfdis_sin_centro",
    nombre: "CFDIs sin centro asignado",
    descripcion: "Comprobantes que requieren clasificación",
    categoria: "finanzas",
    icon: AlertCircle,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: [],
    atributoRequerido: "contralor",
  },
  {
    id: "hero_conciliacion_pendiente",
    nombre: "Conciliación bancaria pendiente",
    descripcion: "Movimientos sin emparejar",
    categoria: "finanzas",
    icon: AlertCircle,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: [],
    atributoRequerido: "contralor",
  },
  {
    id: "hero_cierre_mensual",
    nombre: "Cierre mensual",
    descripcion: "Estado del cierre del periodo actual",
    categoria: "finanzas",
    icon: CheckCircle2,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: [],
    atributoRequerido: "contralor",
  },
  {
    id: "hero_mis_proyectos",
    nombre: "Mis proyectos activos",
    descripcion: "Proyectos donde eres PM o estás asignado",
    categoria: "operacion",
    icon: Folder,
    tamanoDefault: "large",
    tamanosPermitidos: ["medium", "large"],
    esHero: true,
    rolesSugeridos: ["operativo"],
  },
  {
    id: "hero_mis_tareas",
    nombre: "Mis tareas pendientes",
    descripcion: "Tareas asignadas a ti, vencen pronto",
    categoria: "operacion",
    icon: ListChecks,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: ["operativo", "empleado"],
  },
  {
    id: "hero_mis_aprobaciones",
    nombre: "Esperando mi aprobación",
    descripcion: "OCs, OTs, solicitudes que esperan tu visto bueno",
    categoria: "operacion",
    icon: ClipboardCheck,
    tamanoDefault: "medium",
    tamanosPermitidos: ["small", "medium"],
    esHero: true,
    rolesSugeridos: ["director"],
    atributosSugeridos: ["aprobador_financiero"],
  },

  // ============================================================================
  // SECUNDARIOS — visibles en plantillas, configurables
  // ============================================================================
  {
    id: "posicion_consolidada",
    nombre: "Posición consolidada (cash, créditos, CxC, CxP)",
    descripcion: "Vista financiera completa con 6 tiles",
    categoria: "finanzas",
    icon: Wallet,
    tamanoDefault: "large",
    tamanosPermitidos: ["large", "full"],
    esHero: false,
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "cashflow_30d",
    nombre: "Cashflow próximos 30 días",
    descripcion: "Timeline de entradas vs salidas esperadas",
    categoria: "finanzas",
    icon: TrendingUp,
    tamanoDefault: "large",
    tamanosPermitidos: ["large", "full"],
    esHero: false,
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "top_proyectos_margen",
    nombre: "Top proyectos por margen",
    descripcion: "5 proyectos más rentables del periodo",
    categoria: "operacion",
    icon: TrendingUp,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "top_clientes_ingreso",
    nombre: "Top clientes por ingreso",
    descripcion: "5 clientes con mayor facturación del periodo",
    categoria: "comercial",
    icon: Briefcase,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "matriz_inter_co",
    nombre: "Matriz inter-co",
    descripcion: "Posición acumulada entre empresas del grupo",
    categoria: "finanzas",
    icon: GitBranch,
    tamanoDefault: "large",
    tamanosPermitidos: ["large", "full"],
    esHero: false,
    rolesSugeridos: [],
    atributoRequerido: "tesorero_corporativo",
  },
  {
    id: "tesoreria_resumen",
    nombre: "Resumen tesorería",
    descripcion: "Cuentas, créditos, intereses devengados",
    categoria: "finanzas",
    icon: Banknote,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: [],
    atributoRequerido: "tesorero_corporativo",
  },
  {
    id: "top_proveedores_pago",
    nombre: "Top proveedores por pagar",
    descripcion: "5 proveedores con mayor saldo pendiente",
    categoria: "finanzas",
    icon: ReceiptText,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: [],
    atributoRequerido: "contralor",
  },
  {
    id: "obligaciones_proximas",
    nombre: "Obligaciones SAT próximas",
    descripcion: "Vencimientos en próximos 15 días",
    categoria: "finanzas",
    icon: AlertCircle,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["director"],
    atributosSugeridos: ["contralor"],
  },
  {
    id: "mi_equipo_resumen",
    nombre: "Resumen de mi equipo",
    descripcion: "Personas, vehículos, próximas capacitaciones",
    categoria: "personal",
    icon: Users,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["director"],
  },

  // ============================================================================
  // OPCIONALES — fuera del default, disponibles en el picker
  // ============================================================================
  {
    id: "inventario_consolidado",
    nombre: "Inventario consolidado",
    descripcion: "Valor de inventario por almacén y empresa",
    categoria: "operacion",
    icon: Package,
    tamanoDefault: "large",
    tamanosPermitidos: ["medium", "large", "full"],
    esHero: false,
    rolesSugeridos: ["director"],
  },
  {
    id: "arrendamientos_vehiculos",
    nombre: "Arrendamientos de vehículos",
    descripcion: "Vehículos arrendados con próximos vencimientos",
    categoria: "operacion",
    icon: Truck,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["director"],
  },
  {
    id: "top_indirectos",
    nombre: "Top indirectos del periodo",
    descripcion: "Categorías con mayor reparto recibido",
    categoria: "finanzas",
    icon: TrendingUp,
    tamanoDefault: "medium",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["director"],
    atributosSugeridos: ["contralor"],
  },
  {
    id: "panel_liquidez",
    nombre: "Panel de liquidez",
    descripcion: "Días de operación con cash actual",
    categoria: "finanzas",
    icon: Banknote,
    tamanoDefault: "small",
    tamanosPermitidos: ["small", "medium"],
    esHero: false,
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "panel_salud_proyectos",
    nombre: "Salud de proyectos",
    descripcion: "% proyectos verde / amarillo / rojo",
    categoria: "operacion",
    icon: TrendingUp,
    tamanoDefault: "small",
    tamanosPermitidos: ["small", "medium"],
    esHero: false,
    rolesSugeridos: ["ceo", "director"],
  },
  {
    id: "panel_pendientes",
    nombre: "Pendientes operativos",
    descripcion: "Tareas, OCs, solicitudes pendientes",
    categoria: "operacion",
    icon: ListChecks,
    tamanoDefault: "small",
    tamanosPermitidos: ["small", "medium"],
    esHero: false,
    rolesSugeridos: [],
  },
  {
    id: "panel_ingresos_empresa",
    nombre: "Ingresos por empresa",
    descripcion: "Distribución de ingresos entre las 4 empresas",
    categoria: "finanzas",
    icon: TrendingUp,
    tamanoDefault: "small",
    tamanosPermitidos: ["small", "medium"],
    esHero: false,
    rolesSugeridos: ["ceo"],
  },
  {
    id: "mis_proyectos_riesgo",
    nombre: "Mis proyectos en riesgo",
    descripcion: "Proyectos donde eres PM con margen rojo",
    categoria: "operacion",
    icon: AlertTriangle,
    tamanoDefault: "large",
    tamanosPermitidos: ["medium", "large"],
    esHero: false,
    rolesSugeridos: ["operativo"],
  },
];

export type LayoutEntry = {
  widget_id: string;
  orden: number;
  visible: boolean;
  tamano: TamanoWidget;
};

export type WidgetLayout = LayoutEntry[];

export type VistaPlantilla =
  | "personalizada"
  | "ceo"
  | "director"
  | "contralor"
  | "operativo";

export const VISTAS_LABEL: Record<VistaPlantilla, string> = {
  personalizada: "Personalizada",
  ceo: "Vista CEO",
  director: "Vista Director",
  contralor: "Vista Contralor",
  operativo: "Vista Operativo",
};

export const CATEGORIAS_LABEL: Record<CategoriaWidget, string> = {
  finanzas: "Finanzas",
  operacion: "Operación",
  comercial: "Comercial",
  personal: "Personal",
  sistema: "Sistema",
  alertas: "Alertas",
};

/** Lookup helper. */
export function obtenerWidget(id: string): WidgetMetadata | undefined {
  return CATALOGO_WIDGETS.find((w) => w.id === id);
}

/** Filtra los widgets accesibles para un usuario según rol/atributos. */
export function widgetsAccesibles(
  rol: RolBase,
  atributos: AtributoUsuario[],
): WidgetMetadata[] {
  return CATALOGO_WIDGETS.filter((w) => {
    if (w.atributoRequerido && !atributos.includes(w.atributoRequerido)) {
      return false;
    }
    // El rol no es excluyente: cualquiera puede activar widgets de otros roles
    // (las plantillas son punto de partida, no jaula). El check se queda solo
    // en atributoRequerido.
    void rol;
    return true;
  });
}

/**
 * Detecta la plantilla automática que mejor encaja con el rol/atributos del
 * usuario. Útil para asignar layout inicial cuando el usuario aún no tiene
 * preferencias guardadas.
 */
export function plantillaAutomatica(
  rol: RolBase,
  atributos: AtributoUsuario[],
): Exclude<VistaPlantilla, "personalizada"> {
  if (rol === "ceo") return "ceo";
  if (atributos.includes("contralor")) return "contralor";
  if (rol === "director") return "director";
  return "operativo";
}
