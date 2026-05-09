/**
 * Sprint EF — Estados Gerenciales (Balance, Resultados, Flujo).
 * Tipos compartidos entre server actions y UI.
 *
 * NO oficiales fiscalmente — son aproximaciones generadas desde datos del ERP
 * para complementar los PDFs del despacho.
 */

// ---------------------------------------------------------------------------
// Balance General
// ---------------------------------------------------------------------------
export type BalanceGeneral = {
  fecha_corte: string;
  empresa_id: string | null;
  activos: {
    circulantes: {
      bancos: number;
      cxc_total: number;
      cxc_vencida: number;
      inventario: number;
      total: number;
    };
    fijos: {
      vehiculos: number;
      activos_grupo: number;
      total: number;
    };
    total: number;
  };
  pasivos: {
    corto_plazo: { cxp: number; total: number };
    largo_plazo: { creditos_inter_co: number; total: number };
    total: number;
  };
  capital: { calculado: number };
};

export type CategoriaDrillBalance =
  | "bancos"
  | "cxc"
  | "cxp"
  | "vehiculos"
  | "activos_grupo"
  | "inventario";

// ---------------------------------------------------------------------------
// Estado de Resultados
// ---------------------------------------------------------------------------
export type EstadoResultados = {
  periodo: { inicio: string; fin: string };
  empresa_id: string | null;
  ingresos: {
    subtotal: number;
    total: number;
    num_cfdis: number;
  };
  costo_ventas: {
    materiales: number;
    inventario_consumido: number;
    subcontratos: number;
    total: number;
  };
  utilidad_bruta: { monto: number; pct: number };
  gastos_operativos: {
    admin: number;
    recurrentes: number;
    indirectos: number;
    total: number;
  };
  utilidad_operativa: { monto: number; pct: number };
};

export type ComparativoResultados = {
  actual: EstadoResultados;
  anterior: EstadoResultados;
  variaciones: {
    ingresos_pct: number;
    costos_pct: number;
    utilidad_neta_pct: number;
  };
};

export type CategoriaDrillResultados = "ingresos" | "costo_ventas" | "gastos";

// ---------------------------------------------------------------------------
// Flujo de Efectivo
// ---------------------------------------------------------------------------
export type FlujoEfectivo = {
  periodo: { inicio: string; fin: string };
  empresa_id: string | null;
  saldo_inicial: number;
  entradas: {
    cobros_clientes: number;
    transferencias: number;
    otras: number;
    total: number;
  };
  salidas: {
    pagos_proveedores: number;
    nomina: number;
    impuestos: number;
    servicios: number;
    transferencias: number;
    comisiones_banco: number;
    otras: number;
    total: number;
  };
  flujo_neto: number;
  saldo_final: number;
};

export type CategoriaFlujo =
  | "cobro_cliente"
  | "transferencia_recibida"
  | "entrada_otra"
  | "pago_proveedor"
  | "nomina"
  | "impuestos"
  | "servicios"
  | "transferencia_emitida"
  | "comisiones_banco"
  | "salida_otra";

export type ProyeccionFlujo = {
  saldo_actual: number;
  cxc_total: number;
  cxp_total: number;
  horizonte_semanas: number;
  proyeccion: Array<{
    semana_n: number;
    inicio: string;
    fin: string;
    cobros_esperados: number;
    pagos_planeados: number;
    flujo_neto: number;
    saldo_proyectado: number;
    riesgo: boolean;
  }>;
};

// ---------------------------------------------------------------------------
// Períodos (helpers)
// ---------------------------------------------------------------------------
export type Periodo = { inicio: string; fin: string };

export function periodoMensual(anio: number, mes: number): Periodo {
  // mes: 1-12
  const ini = new Date(Date.UTC(anio, mes - 1, 1));
  const fin = new Date(Date.UTC(anio, mes, 0));
  return {
    inicio: ini.toISOString().slice(0, 10),
    fin: fin.toISOString().slice(0, 10),
  };
}

export function periodoMesAnterior(anio: number, mes: number): Periodo {
  if (mes === 1) return periodoMensual(anio - 1, 12);
  return periodoMensual(anio, mes - 1);
}

export function periodoTrimestre(
  anio: number,
  trimestre: 1 | 2 | 3 | 4,
): Periodo {
  const mesInicio = (trimestre - 1) * 3 + 1;
  const ini = new Date(Date.UTC(anio, mesInicio - 1, 1));
  const fin = new Date(Date.UTC(anio, mesInicio + 2, 0));
  return {
    inicio: ini.toISOString().slice(0, 10),
    fin: fin.toISOString().slice(0, 10),
  };
}

export function periodoAnual(anio: number): Periodo {
  return { inicio: `${anio}-01-01`, fin: `${anio}-12-31` };
}

export const ETIQUETA_CATEGORIA_FLUJO: Record<CategoriaFlujo, string> = {
  cobro_cliente: "Cobros de clientes",
  transferencia_recibida: "Transferencias recibidas",
  entrada_otra: "Otras entradas",
  pago_proveedor: "Pagos a proveedores",
  nomina: "Nómina",
  impuestos: "Impuestos",
  servicios: "Servicios",
  transferencia_emitida: "Transferencias enviadas",
  comisiones_banco: "Comisiones bancarias",
  salida_otra: "Otras salidas",
};
