import { XMLParser } from "fast-xml-parser";

import type {
  PeriodicidadNomina,
  TipoConceptoNomina,
  TipoReciboNomina,
} from "./state";

/**
 * Parser de CFDI 4.0 nómina (complemento Nomina 1.2).
 *
 * Extrae datos de cabecera del comprobante, nodos del receptor de nómina,
 * percepciones, deducciones y otros pagos. Devuelve estructura tipada lista
 * para insertar en nomina_recibos + nomina_conceptos.
 */

export type ConceptoParsed = {
  tipo: TipoConceptoNomina;
  clave_sat: string;
  tipo_clave: string | null;
  concepto: string;
  importe_gravado: number;
  importe_exento: number;
  importe_total: number;
};

export type NominaParsed = {
  uuid_cfdi: string;
  serie: string | null;
  folio: string | null;
  fecha_emision: string; // ISO
  fecha_pago: string; // YYYY-MM-DD
  fecha_inicial_pago: string;
  fecha_final_pago: string;
  num_dias_pagados: number | null;
  periodicidad: PeriodicidadNomina | null;
  tipo: TipoReciboNomina;
  rfc_emisor: string;
  nombre_emisor: string | null;
  rfc_receptor: string;
  nombre_receptor: string | null;
  curp: string;
  nss: string | null;
  numero_empleado: string | null;
  departamento: string | null;
  puesto: string | null;
  fecha_inicio_rel_laboral: string | null;
  antiguedad: string | null;
  tipo_contrato: string | null;
  tipo_jornada: string | null;
  tipo_regimen: string | null;
  riesgo_puesto: string | null;
  banco: string | null;
  cuenta_bancaria: string | null;
  sueldo_base_cotizacion: number | null;
  salario_diario_integrado: number | null;
  total_percepciones: number;
  total_deducciones: number;
  total_otros_pagos: number;
  total_neto: number;
  conceptos: ConceptoParsed[];
};

const PERIODICIDAD_MAP: Record<string, PeriodicidadNomina> = {
  "01": "diaria",
  "02": "semanal",
  "03": "catorcenal",
  "04": "quincenal",
  "05": "mensual",
  "10": "unica",
};

const TIPO_NOMINA_MAP: Record<string, TipoReciboNomina> = {
  O: "ordinario",
  E: "extraordinario",
};

/**
 * Helper para acceder a atributos en cualquier nodo del parser.
 * fast-xml-parser con `attributeNamePrefix: "@_"` los pone con prefix.
 */
function attr(node: unknown, name: string): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const v = obj[`@_${name}`];
  return v === undefined || v === null ? null : String(v);
}

function num(node: unknown, name: string, defaultValue = 0): number {
  const s = attr(node, name);
  if (!s) return defaultValue;
  const n = Number(s);
  return Number.isFinite(n) ? n : defaultValue;
}

/** Convierte siempre a array (XML puede tener 1 nodo o array). */
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export function parseXmlNomina(xml: string): NominaParsed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    parseAttributeValue: false,
    parseTagValue: false,
    trimValues: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;

  const cmp =
    (doc.Comprobante as Record<string, unknown>) ??
    (doc["cfdi:Comprobante"] as Record<string, unknown>);
  if (!cmp) throw new Error("XML no es un CFDI válido (sin <Comprobante>).");

  const tipoComp = attr(cmp, "TipoDeComprobante");
  if (tipoComp !== "N")
    throw new Error(
      `XML es un CFDI tipo '${tipoComp ?? "?"}' — no es nómina (tipo 'N').`,
    );

  const emisor = (cmp.Emisor as Record<string, unknown>) ?? null;
  const receptor = (cmp.Receptor as Record<string, unknown>) ?? null;

  // Complementos
  const complementos = (cmp.Complemento as Record<string, unknown>) ?? {};
  // TimbreFiscalDigital
  const timbres = toArray(complementos.TimbreFiscalDigital);
  const timbre = timbres[0] as Record<string, unknown> | undefined;
  const uuidCfdi = timbre ? attr(timbre, "UUID") : null;
  if (!uuidCfdi) throw new Error("XML sin UUID (TimbreFiscalDigital).");

  // Nomina 1.2
  const nominas = toArray(complementos.Nomina);
  const nomina = nominas[0] as Record<string, unknown> | undefined;
  if (!nomina)
    throw new Error("XML sin complemento <Nomina> — no es CFDI de nómina.");

  const tipoNomina = attr(nomina, "TipoNomina");
  const fechaPago = attr(nomina, "FechaPago");
  const fechaInicial = attr(nomina, "FechaInicialPago");
  const fechaFinal = attr(nomina, "FechaFinalPago");
  const numDias = num(nomina, "NumDiasPagados", NaN);

  if (!fechaPago || !fechaInicial || !fechaFinal)
    throw new Error("XML sin fechas de pago.");

  const receptorNomina = (nomina.Receptor as Record<string, unknown>) ?? {};
  const curp = attr(receptorNomina, "Curp");
  if (!curp) throw new Error("XML sin CURP del empleado.");

  const periodicidadCode = attr(receptorNomina, "PeriodicidadPago");

  const percepciones =
    (nomina.Percepciones as Record<string, unknown>) ?? null;
  const deducciones =
    (nomina.Deducciones as Record<string, unknown>) ?? null;
  const otrosPagos =
    (nomina.OtrosPagos as Record<string, unknown>) ?? null;

  const conceptos: ConceptoParsed[] = [];

  // Percepciones
  if (percepciones) {
    const list = toArray(percepciones.Percepcion);
    for (const p of list) {
      const tipoPerc = attr(p, "TipoPercepcion");
      const clave = attr(p, "Clave");
      const concepto = attr(p, "Concepto");
      if (!tipoPerc || !clave || !concepto) continue;
      conceptos.push({
        tipo: "percepcion",
        clave_sat: tipoPerc,
        tipo_clave: clave,
        concepto,
        importe_gravado: num(p, "ImporteGravado"),
        importe_exento: num(p, "ImporteExento"),
        importe_total: num(p, "ImporteGravado") + num(p, "ImporteExento"),
      });
    }
  }

  // Deducciones
  if (deducciones) {
    const list = toArray(deducciones.Deduccion);
    for (const d of list) {
      const tipoDed = attr(d, "TipoDeduccion");
      const clave = attr(d, "Clave");
      const concepto = attr(d, "Concepto");
      if (!tipoDed || !clave || !concepto) continue;
      conceptos.push({
        tipo: "deduccion",
        clave_sat: tipoDed,
        tipo_clave: clave,
        concepto,
        importe_gravado: 0,
        importe_exento: 0,
        importe_total: num(d, "Importe"),
      });
    }
  }

  // OtrosPagos
  if (otrosPagos) {
    const list = toArray(otrosPagos.OtroPago);
    for (const o of list) {
      const tipo = attr(o, "TipoOtroPago");
      const clave = attr(o, "Clave");
      const concepto = attr(o, "Concepto");
      if (!tipo || !clave || !concepto) continue;
      conceptos.push({
        tipo: "otro_pago",
        clave_sat: tipo,
        tipo_clave: clave,
        concepto,
        importe_gravado: 0,
        importe_exento: 0,
        importe_total: num(o, "Importe"),
      });
    }
  }

  const totalPerc = percepciones
    ? num(percepciones, "TotalGravado") + num(percepciones, "TotalExento")
    : 0;
  const totalDed = deducciones
    ? num(deducciones, "TotalImpuestosRetenidos") +
      num(deducciones, "TotalOtrasDeducciones")
    : 0;
  const totalOtros = otrosPagos ? num(otrosPagos, "TotalOtrosPagos", 0) : 0;
  const totalNeto = totalPerc + totalOtros - totalDed;

  return {
    uuid_cfdi: uuidCfdi,
    serie: attr(cmp, "Serie"),
    folio: attr(cmp, "Folio"),
    fecha_emision: attr(cmp, "Fecha") ?? new Date().toISOString(),
    fecha_pago: fechaPago,
    fecha_inicial_pago: fechaInicial,
    fecha_final_pago: fechaFinal,
    num_dias_pagados: Number.isFinite(numDias) ? numDias : null,
    periodicidad: periodicidadCode
      ? (PERIODICIDAD_MAP[periodicidadCode] ?? null)
      : null,
    tipo: tipoNomina ? (TIPO_NOMINA_MAP[tipoNomina] ?? "otro") : "otro",
    rfc_emisor: attr(emisor, "Rfc") ?? "",
    nombre_emisor: attr(emisor, "Nombre"),
    rfc_receptor: attr(receptor, "Rfc") ?? "",
    nombre_receptor: attr(receptor, "Nombre"),
    curp,
    nss: attr(receptorNomina, "NumSeguridadSocial"),
    numero_empleado: attr(receptorNomina, "NumEmpleado"),
    departamento: attr(receptorNomina, "Departamento"),
    puesto: attr(receptorNomina, "Puesto"),
    fecha_inicio_rel_laboral: attr(receptorNomina, "FechaInicioRelLaboral"),
    antiguedad: attr(receptorNomina, "Antigüedad") ?? attr(receptorNomina, "Antiguedad"),
    tipo_contrato: attr(receptorNomina, "TipoContrato"),
    tipo_jornada: attr(receptorNomina, "TipoJornada"),
    tipo_regimen: attr(receptorNomina, "TipoRegimen"),
    riesgo_puesto: attr(receptorNomina, "RiesgoPuesto"),
    banco: attr(receptorNomina, "Banco"),
    cuenta_bancaria: attr(receptorNomina, "CuentaBancaria"),
    sueldo_base_cotizacion: num(receptorNomina, "SalarioBaseCotApor", NaN) || null,
    salario_diario_integrado: num(receptorNomina, "SalarioDiarioIntegrado", NaN) || null,
    total_percepciones: totalPerc,
    total_deducciones: totalDed,
    total_otros_pagos: totalOtros,
    total_neto: totalNeto,
    conceptos,
  };
}
