export type TerminoGlosario = {
  definicion: string;
  ejemplo?: string;
  verMas?: string;
};

export const GLOSARIO: Record<string, TerminoGlosario> = {
  CFDI: {
    definicion:
      "Comprobante Fiscal Digital por Internet. Es la factura electrónica oficial emitida vía PAC y avalada por el SAT.",
    verMas:
      "https://www.sat.gob.mx/consultas/89074/comprobante-fiscal-digital-por-internet-(cfdi)",
  },
  ISR: {
    definicion:
      "Impuesto Sobre la Renta. Se retiene en cada nómina según tabla del SAT y se acumula como pago provisional mensual.",
    ejemplo: "En un sueldo bruto de $20,000 se retienen aprox. $2,500 de ISR.",
  },
  IVA: {
    definicion:
      "Impuesto al Valor Agregado. Tasa general del 16% en México (frontera norte 8%).",
  },
  RFC: {
    definicion:
      "Registro Federal de Contribuyentes. Identificador fiscal único de personas físicas y morales en México.",
  },
  CURP: {
    definicion:
      "Clave Única de Registro de Población. Identificador único de cada persona física en México (18 caracteres).",
  },
  REPSE: {
    definicion:
      "Registro de Prestadoras de Servicios Especializados. Obligatorio desde la reforma de subcontratación de 2021.",
  },
  CSF: {
    definicion:
      "Constancia de Situación Fiscal. PDF emitido por el SAT con datos fiscales del contribuyente.",
  },
  TIIE: {
    definicion:
      "Tasa de Interés Interbancaria de Equilibrio. Publicada por Banxico, sirve como base para los préstamos inter-co del grupo.",
  },
  PAC: {
    definicion:
      "Proveedor Autorizado de Certificación. Empresa que timbra los CFDI ante el SAT.",
    ejemplo: "SW Sapien, Diverza, Facturama, Edicom.",
  },
  OC: {
    definicion:
      "Orden de Compra. Documento que autoriza la compra de bienes/servicios a un proveedor antes de recibir el CFDI.",
  },
  OT: {
    definicion:
      "Orden de Trabajo inter-compañías. Documento que formaliza un servicio prestado entre empresas del mismo grupo.",
  },
  DC3: {
    definicion:
      "Constancia de Capacitación. Documento STPS que comprueba capacitación laboral del trabajador.",
  },
  RLS: {
    definicion:
      "Row Level Security. Reglas de Postgres que restringen filas visibles según el usuario que consulta.",
  },
  EFM: {
    definicion: "Estado Financiero Mensual. Cierre contable mensual por empresa.",
  },
  "69-B": {
    definicion:
      "Lista del SAT (Art. 69-B del CFF) de contribuyentes con operaciones presuntamente inexistentes (EFOS).",
  },
  DIOT: {
    definicion:
      "Declaración Informativa de Operaciones con Terceros. Mensual al SAT con detalle de proveedores con IVA.",
  },
  CFE: {
    definicion: "Comisión Federal de Electricidad — empresa eléctrica nacional.",
  },
  CC: {
    definicion: "Centro de Costo. Agrupador de gastos para análisis financiero.",
  },
  CU: {
    definicion: "Centro de Utilidad. Agrupador de ingresos para análisis financiero.",
  },
  IMSS: {
    definicion:
      "Instituto Mexicano del Seguro Social. Cuotas patronales y obreras de seguridad social.",
  },
  INFONAVIT: {
    definicion:
      "Instituto del Fondo Nacional de la Vivienda para los Trabajadores. Aportación patronal del 5%.",
  },
  ICSOE: {
    definicion:
      "Informe Cuatrimestral de Subcontratación de Operaciones Especializadas (REPSE).",
  },
  SISUB: {
    definicion:
      "Sistema de Información de Subcontratación (REPSE). Reporte cuatrimestral.",
  },
  FONACOT: {
    definicion:
      "Instituto del Fondo Nacional para el Consumo de los Trabajadores.",
  },
  FIEL: {
    definicion:
      "Firma Electrónica avanzada. Conjunto de archivos .cer y .key que identifica fiscalmente a la empresa.",
  },
  PUE: {
    definicion: "Pago en Una sola Exhibición (CFDI). Se cobra al momento.",
  },
  PPD: {
    definicion:
      "Pago en Parcialidades o Diferido (CFDI). Requiere complemento de pago al cobrar.",
  },
  EFOS: {
    definicion:
      "Empresas que Facturan Operaciones Simuladas. Aparecen en la lista 69-B del SAT.",
  },
};

export function obtenerTermino(t: string): TerminoGlosario | undefined {
  return GLOSARIO[t.toUpperCase()];
}
