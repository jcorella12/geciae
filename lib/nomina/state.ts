/**
 * Sprint X.1 — Tipos compartidos para nómina.
 */

export type TipoReciboNomina =
  | "ordinario"
  | "extraordinario"
  | "finiquito"
  | "liquidacion"
  | "otro";

export type PeriodicidadNomina =
  | "diaria"
  | "semanal"
  | "catorcenal"
  | "quincenal"
  | "mensual"
  | "unica";

export type TipoConceptoNomina = "percepcion" | "deduccion" | "otro_pago";

export type EstadoUploadNomina =
  | "procesando"
  | "completado"
  | "completado_con_errores"
  | "fallido";

export const ETIQUETA_TIPO_RECIBO: Record<TipoReciboNomina, string> = {
  ordinario: "Ordinario",
  extraordinario: "Extraordinario",
  finiquito: "Finiquito",
  liquidacion: "Liquidación",
  otro: "Otro",
};

export const ETIQUETA_PERIODICIDAD: Record<PeriodicidadNomina, string> = {
  diaria: "Diaria",
  semanal: "Semanal",
  catorcenal: "Catorcenal",
  quincenal: "Quincenal",
  mensual: "Mensual",
  unica: "Única",
};

export const COLOR_ESTADO_UPLOAD: Record<EstadoUploadNomina, string> = {
  procesando: "bg-amber-100 text-amber-700",
  completado: "bg-emerald-100 text-emerald-700",
  completado_con_errores: "bg-orange-100 text-orange-700",
  fallido: "bg-rose-100 text-rose-700",
};

/**
 * Catálogo SAT de claves de Percepciones (TipoPercepcion + Clave).
 * Ver: https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1461173410703
 * Solo las más comunes para mostrar nombre amigable.
 */
export const CLAVES_SAT_PERCEPCIONES: Record<string, string> = {
  "001": "Sueldos, salarios, rayas y jornales",
  "002": "Gratificación anual (aguinaldo)",
  "003": "Participación de los trabajadores en las utilidades (PTU)",
  "004": "Reembolso de descuentos",
  "005": "Reembolso por adeudos del trabajador",
  "006": "Reembolso de gastos médicos mayores y menores",
  "007": "Cuotas sindicales pagadas por el patrón",
  "008": "Subsidios por incapacidad",
  "009": "Becas para trabajadores y/o hijos",
  "010": "Fondo de ahorro",
  "011": "Caja de ahorro",
  "013": "Aportaciones a fondos de pensiones",
  "014": "Contribuciones a cargo del trabajador pagadas por el patrón",
  "016": "Premios por puntualidad",
  "017": "Prima de seguro de vida",
  "018": "Seguro de gastos médicos mayores",
  "019": "Cuotas sindicales pagadas por el patrón",
  "021": "Gastos de representación",
  "022": "Vales de despensa",
  "023": "Vales de restaurante",
  "024": "Vales de gasolina",
  "025": "Vales de ropa",
  "026": "Ayuda para renta",
  "027": "Ayuda para artículos escolares",
  "028": "Ayuda para anteojos",
  "029": "Ayuda para transporte",
  "030": "Ayuda para gastos de funeral",
  "031": "Reembolso por funeral",
  "032": "Cuotas de seguridad social pagadas por el patrón",
  "033": "Comisiones",
  "034": "Vales",
  "035": "Ayudas",
  "036": "Premios por asistencia",
  "037": "Indemnizaciones",
  "038": "Reembolso por adeudo de salarios",
  "039": "Nivelación salarial",
  "044": "Jubilaciones, pensiones o haberes de retiro",
  "045": "Contribuciones a cargo del trabajador pagadas por el patrón (subsidio empleo)",
  "046": "Ajuste en jubilaciones, pensiones o haberes de retiro",
  "049": "Ingresos en acciones o títulos valor",
  "050": "Ingresos asimilados a salarios",
};

/**
 * Catálogo SAT de claves de Deducciones (TipoDeduccion + Clave).
 */
export const CLAVES_SAT_DEDUCCIONES: Record<string, string> = {
  "001": "Seguridad social",
  "002": "ISR",
  "003": "Aportaciones a retiro, cesantía y vejez",
  "004": "Otros (pensión alimenticia, etc.)",
  "005": "Aportaciones a fondo de vivienda (INFONAVIT)",
  "006": "Descuento por incapacidad",
  "007": "Pensión alimenticia",
  "008": "Renta",
  "009": "Préstamos provenientes del FONACOT",
  "010": "Adelanto de salarios",
  "011": "Pagos hechos con exceso al trabajador",
  "012": "Errores",
  "013": "Pérdidas",
  "014": "Averías",
  "015": "Adquisición de artículos producidos por la empresa",
  "016": "Cuotas para constitución y fomento de sociedades cooperativas",
  "017": "Cuotas para fondo de ahorro",
  "018": "Cuotas sindicales",
  "019": "Ausencia (faltas)",
  "020": "Cuotas obrero-patronales",
  "021": "Impuestos locales",
  "022": "Aportaciones voluntarias",
  "023": "Ajuste en gratificación anual exenta",
  "024": "Ajuste en gratificación anual gravada",
  "025": "Ajuste en horas extra exentas",
  "026": "Ajuste en horas extra gravadas",
  "031": "Ajuste en aguinaldo gravado",
  "081": "Ajuste en ingresos asimilados a salarios gravados",
  "082": "Ajuste en ingresos por sueldos, salarios rayas y jornales",
};

/**
 * Devuelve el nombre amigable de una clave SAT (percepción o deducción).
 */
export function nombreClaveSAT(
  tipo: TipoConceptoNomina,
  clave: string,
): string {
  if (tipo === "percepcion") return CLAVES_SAT_PERCEPCIONES[clave] ?? clave;
  if (tipo === "deduccion") return CLAVES_SAT_DEDUCCIONES[clave] ?? clave;
  return clave;
}

// State para Server Actions
export type SubirNominaState = {
  ok: boolean;
  error: string | null;
  uploadId?: string;
};

export const initialSubirNominaState: SubirNominaState = {
  ok: false,
  error: null,
};
