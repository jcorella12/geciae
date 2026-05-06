export type CategoriaCostoProyecto =
  | "materiales"
  | "mano_obra_ingenieria"
  | "mano_obra_campo"
  | "subcontratos"
  | "activos_compartidos"
  | "levantamientos"
  | "logistica"
  | "garantia_provision"
  | "indirectos_centros"
  | "otros";

export type TipoCostoImputado =
  | "provision_garantia"
  | "ajuste_manual"
  | "subcontrato_externo"
  | "viaticos_no_facturados"
  | "capacitacion_proyecto"
  | "mejora_cliente"
  | "penalizacion"
  | "otro";

export type TipoHoraTrabajada = "ingenieria_propia" | "campo_estimado";

export const ETIQUETA_CATEGORIA_COSTO: Record<CategoriaCostoProyecto, string> = {
  materiales: "Materiales",
  mano_obra_ingenieria: "Mano de obra ingeniería",
  mano_obra_campo: "Mano de obra campo",
  subcontratos: "Subcontratos (OTs)",
  activos_compartidos: "Activos compartidos",
  levantamientos: "Levantamientos",
  logistica: "Logística",
  garantia_provision: "Provisión garantía",
  indirectos_centros: "Indirectos (centros)",
  otros: "Otros",
};

export const ETIQUETA_TIPO_COSTO_IMPUTADO: Record<TipoCostoImputado, string> = {
  provision_garantia: "Provisión de garantía",
  ajuste_manual: "Ajuste manual",
  subcontrato_externo: "Subcontrato externo",
  viaticos_no_facturados: "Viáticos no facturados",
  capacitacion_proyecto: "Capacitación del proyecto",
  mejora_cliente: "Mejora a cliente",
  penalizacion: "Penalización",
  otro: "Otro",
};

export type PnLResumen = {
  proyecto_id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
  estado: string;
  cliente_id: string | null;
  ingreso_presupuestado: number | null;
  presupuesto_materiales: number;
  presupuesto_ing: number;
  presupuesto_campo: number;
  presupuesto_subcontratos: number;
  presupuesto_indirectos: number;
  margen_objetivo_pct: number;
  ingreso_facturado: number;
  ingreso_por_facturar: number;
  costo_materiales_oc: number;
  costo_subcontratos: number;
  costo_horas_ingenieria: number;
  costo_horas_campo: number;
  costo_levantamientos: number;
  costos_directos_total: number;
  costos_indirectos_centros: number;
  provision_garantia: number;
  otros_imputados: number;
  costos_indirectos_total: number;
  costos_totales: number;
  margen_contribucion: number;
  margen_neto: number;
};

export type PresupuestoState = {
  ok: boolean;
  error: string | null;
};

export const initialPresupuestoState: PresupuestoState = { ok: false, error: null };
