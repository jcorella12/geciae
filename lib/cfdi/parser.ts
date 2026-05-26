import { XMLParser } from "fast-xml-parser";

/**
 * Parser de CFDI 4.0 (también compatible con 3.3 — los nodos clave
 * son los mismos, los atributos cambian poco).
 *
 * Lee el XML que el SAT timbró y extrae los datos relevantes para
 * registrarlo en nuestra base. NO valida la firma ni el sello — eso
 * lo hizo el PAC al timbrar y el UUID es la prueba.
 */

export type CfdiConceptoParsed = {
  orden: number;
  clave_sat: string | null;
  descripcion: string;
  cantidad: number;
  unidad_sat: string | null;
  precio_unitario: number;
  importe: number;
  iva_tasa: number | null;
  iva_importe: number | null;
};

export type CfdiDoctoRelacionadoParsed = {
  /** UUID del CFDI de Ingreso/Egreso que se está pagando con este complemento. */
  uuid_documento: string;
  serie: string | null;
  folio: string | null;
  moneda: string;
  equivalencia: number; // tipo de cambio entre moneda del docto y la del pago
  num_parcialidad: number;
  imp_saldo_anterior: number;
  imp_pagado: number;
  imp_saldo_insoluto: number;
};

export type CfdiPagoParsed = {
  fecha_pago: string; // ISO con hora
  forma_pago: string | null; // 01, 03, etc.
  moneda: string;
  tipo_cambio: number;
  monto: number; // total del pago (puede cubrir varios documentos)
  num_operacion: string | null;
  docto_relacionados: CfdiDoctoRelacionadoParsed[];
};

export type CfdiParsed = {
  version: string;
  serie: string | null;
  folio: string | null;
  fecha_emision: string; // ISO
  fecha_timbrado: string | null;
  uuid_sat: string | null;
  rfc_emisor: string;
  nombre_emisor: string | null;
  rfc_receptor: string;
  nombre_receptor: string | null;
  tipo_comprobante: string; // I=ingreso, E=egreso, T=traslado, N=nómina, P=pago
  uso_cfdi: string | null;
  metodo_pago: string | null; // PUE / PPD
  forma_pago: string | null;
  moneda: string;
  tipo_cambio: number;
  subtotal: number;
  descuento: number;
  iva_trasladado: number;
  iva_retenido: number;
  isr_retenido: number;
  total: number;
  conceptos: CfdiConceptoParsed[];
  /**
   * Pagos extraídos del complemento Pago20 si `tipo_comprobante === 'P'`.
   * Vacío si no es complemento de pago.
   */
  pagos: CfdiPagoParsed[];
};

const TIPO_COMPROBANTE_MAP: Record<string, "ingreso" | "egreso" | "traslado" | "pago" | "nomina"> = {
  I: "ingreso",
  E: "egreso",
  T: "traslado",
  P: "pago",
  N: "nomina",
};

function num(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function getAttr(node: Record<string, unknown> | undefined, name: string): string | null {
  if (!node) return null;
  const v = node[`@_${name}`];
  return typeof v === "string" ? v : v != null ? String(v) : null;
}

function pickNs(obj: Record<string, unknown>, candidates: string[]): Record<string, unknown> | undefined {
  for (const k of candidates) {
    if (obj[k]) return obj[k] as Record<string, unknown>;
  }
  // Buscar por sufijo (ej. "cfdi:Comprobante" o "Comprobante")
  for (const key of Object.keys(obj)) {
    for (const c of candidates) {
      if (key === c || key.endsWith(`:${c}`)) {
        return obj[key] as Record<string, unknown>;
      }
    }
  }
  return undefined;
}

export function parseCfdiXml(xml: string): CfdiParsed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: false,
    parseAttributeValue: false,
    trimValues: true,
  });
  const json = parser.parse(xml) as Record<string, unknown>;

  const comp = pickNs(json, ["cfdi:Comprobante", "Comprobante"]);
  if (!comp) {
    throw new Error("XML inválido: falta el nodo Comprobante.");
  }

  const emisor = pickNs(comp, ["cfdi:Emisor", "Emisor"]);
  const receptor = pickNs(comp, ["cfdi:Receptor", "Receptor"]);
  const conceptosNode = pickNs(comp, ["cfdi:Conceptos", "Conceptos"]);
  const impuestos = pickNs(comp, ["cfdi:Impuestos", "Impuestos"]);
  const complemento = pickNs(comp, ["cfdi:Complemento", "Complemento"]);
  const tfd = complemento
    ? pickNs(complemento, ["tfd:TimbreFiscalDigital", "TimbreFiscalDigital"])
    : undefined;

  // Conceptos: pueden ser un objeto único (1) o array (varios)
  const rawConceptos =
    conceptosNode &&
    pickNs(conceptosNode, ["cfdi:Concepto", "Concepto"]);
  let listaConceptos: Record<string, unknown>[] = [];
  if (Array.isArray(rawConceptos)) {
    listaConceptos = rawConceptos as Record<string, unknown>[];
  } else if (rawConceptos) {
    listaConceptos = [rawConceptos as Record<string, unknown>];
  }

  const conceptos: CfdiConceptoParsed[] = listaConceptos.map((c, idx) => {
    // El IVA del concepto está en c.Impuestos.Traslados.Traslado
    const impC = pickNs(c, ["cfdi:Impuestos", "Impuestos"]);
    let ivaTasa: number | null = null;
    let ivaImporte: number | null = null;
    if (impC) {
      const trasC = pickNs(impC, ["cfdi:Traslados", "Traslados"]);
      if (trasC) {
        const trasNode = pickNs(trasC, ["cfdi:Traslado", "Traslado"]);
        const tras = Array.isArray(trasNode)
          ? (trasNode[0] as Record<string, unknown>)
          : (trasNode as Record<string, unknown> | undefined);
        if (tras) {
          ivaTasa = num(getAttr(tras, "TasaOCuota"), 0);
          ivaImporte = num(getAttr(tras, "Importe"), 0);
        }
      }
    }
    return {
      orden: idx + 1,
      clave_sat: getAttr(c, "ClaveProdServ"),
      descripcion: getAttr(c, "Descripcion") ?? "",
      cantidad: num(getAttr(c, "Cantidad"), 0),
      unidad_sat: getAttr(c, "ClaveUnidad"),
      precio_unitario: num(getAttr(c, "ValorUnitario"), 0),
      importe: num(getAttr(c, "Importe"), 0),
      iva_tasa: ivaTasa,
      iva_importe: ivaImporte,
    };
  });

  // Totales de impuestos a nivel comprobante
  let ivaTrasladado = 0;
  let ivaRetenido = 0;
  let isrRetenido = 0;
  if (impuestos) {
    ivaTrasladado = num(
      getAttr(impuestos, "TotalImpuestosTrasladados"),
      0,
    );
    ivaRetenido = num(getAttr(impuestos, "TotalImpuestosRetenidos"), 0);
    // Desglose de retenciones para separar ISR vs IVA retenido
    const retsNode = pickNs(impuestos, ["cfdi:Retenciones", "Retenciones"]);
    if (retsNode) {
      const retNode = pickNs(retsNode, ["cfdi:Retencion", "Retencion"]);
      const lista = Array.isArray(retNode)
        ? (retNode as Record<string, unknown>[])
        : retNode
          ? [retNode as Record<string, unknown>]
          : [];
      let ivaR = 0;
      let isrR = 0;
      for (const r of lista) {
        const impuesto = getAttr(r, "Impuesto");
        const importe = num(getAttr(r, "Importe"), 0);
        if (impuesto === "001") isrR += importe; // ISR
        else if (impuesto === "002") ivaR += importe; // IVA
      }
      if (isrR > 0) isrRetenido = isrR;
      if (ivaR > 0) ivaRetenido = ivaR;
    }
  }

  // ---- Complemento de pago (Pago20) ----
  // Solo aplica cuando TipoDeComprobante = 'P'. Estructura:
  //   Complemento > pago20:Pagos > pago20:Pago > pago20:DoctoRelacionado
  const tipoComp = getAttr(comp, "TipoDeComprobante") ?? "I";
  const pagos: CfdiPagoParsed[] = [];
  if (tipoComp === "P" && complemento) {
    const pagosRoot = pickNs(complemento, ["pago20:Pagos", "Pagos"]);
    if (pagosRoot) {
      // Nota: <pago20:Totales MontoTotalPagos="..."> existe pero NO se
      // usa para poblar `cfdi.total` — los complementos de pago deben
      // tener total=0 (los montos reales viven en cfdi_pagos.monto).
      const pagoNodeRaw = pickNs(pagosRoot, ["pago20:Pago", "Pago"]);
      const listaPagos = Array.isArray(pagoNodeRaw)
        ? (pagoNodeRaw as Record<string, unknown>[])
        : pagoNodeRaw
          ? [pagoNodeRaw as Record<string, unknown>]
          : [];
      for (const p of listaPagos) {
        const doctosRaw = pickNs(p, [
          "pago20:DoctoRelacionado",
          "DoctoRelacionado",
        ]);
        const listaDoctos = Array.isArray(doctosRaw)
          ? (doctosRaw as Record<string, unknown>[])
          : doctosRaw
            ? [doctosRaw as Record<string, unknown>]
            : [];
        pagos.push({
          fecha_pago:
            getAttr(p, "FechaPago") ?? new Date().toISOString(),
          forma_pago: getAttr(p, "FormaDePagoP"),
          moneda: getAttr(p, "MonedaP") ?? "MXN",
          tipo_cambio: num(getAttr(p, "TipoCambioP"), 1),
          monto: num(getAttr(p, "Monto"), 0),
          num_operacion: getAttr(p, "NumOperacion"),
          docto_relacionados: listaDoctos.map((d) => ({
            uuid_documento: (
              getAttr(d, "IdDocumento") ?? ""
            ).toLowerCase(),
            serie: getAttr(d, "Serie"),
            folio: getAttr(d, "Folio"),
            moneda: getAttr(d, "MonedaDR") ?? "MXN",
            equivalencia: num(getAttr(d, "EquivalenciaDR"), 1),
            num_parcialidad: num(getAttr(d, "NumParcialidad"), 1),
            imp_saldo_anterior: num(getAttr(d, "ImpSaldoAnt"), 0),
            imp_pagado: num(getAttr(d, "ImpPagado"), 0),
            imp_saldo_insoluto: num(
              getAttr(d, "ImpSaldoInsoluto"),
              0,
            ),
          })),
        });
      }
    }
  }

  // Para complementos de pago, el SAT emite el Comprobante con Total=0
  // intencionalmente — el monto real del pago se queda solo en los
  // registros `cfdi_pagos.monto` (extraídos en pagos[] arriba).
  // Nota: una versión previa hacía `total = MontoTotalPagos` para tipo P
  // creyendo que era el monto correcto, pero eso duplica con cfdi_pagos
  // y hace que vistas como cfdi_kpis_filtrados sobrecuenten al sumar
  // SUM(total) (incluían el complemento + la factura original). Ahora
  // respetamos el formato SAT: complemento de pago contribuye 0 al
  // total/subtotal/iva del CFDI.
  const totalRoot = num(getAttr(comp, "Total"), 0);
  const totalEffective = tipoComp === "P" ? 0 : totalRoot;

  return {
    version: getAttr(comp, "Version") ?? "4.0",
    serie: getAttr(comp, "Serie"),
    folio: getAttr(comp, "Folio"),
    fecha_emision: getAttr(comp, "Fecha") ?? new Date().toISOString(),
    fecha_timbrado: tfd ? getAttr(tfd, "FechaTimbrado") : null,
    uuid_sat: tfd ? getAttr(tfd, "UUID") : null,
    rfc_emisor: getAttr(emisor, "Rfc") ?? "",
    nombre_emisor: getAttr(emisor, "Nombre"),
    rfc_receptor: getAttr(receptor, "Rfc") ?? "",
    nombre_receptor: getAttr(receptor, "Nombre"),
    tipo_comprobante: tipoComp,
    uso_cfdi: receptor ? getAttr(receptor, "UsoCFDI") : null,
    metodo_pago: getAttr(comp, "MetodoPago"),
    forma_pago: getAttr(comp, "FormaPago"),
    moneda: getAttr(comp, "Moneda") ?? "MXN",
    tipo_cambio: num(getAttr(comp, "TipoCambio"), 1),
    subtotal:
      tipoComp === "P" ? 0 : num(getAttr(comp, "SubTotal"), 0),
    descuento:
      tipoComp === "P" ? 0 : num(getAttr(comp, "Descuento"), 0),
    iva_trasladado: tipoComp === "P" ? 0 : ivaTrasladado,
    iva_retenido: tipoComp === "P" ? 0 : ivaRetenido,
    isr_retenido: tipoComp === "P" ? 0 : isrRetenido,
    total: totalEffective,
    conceptos,
    pagos,
  };
}

export function tipoCfdiDb(tipoComprobante: string): "ingreso" | "egreso" | "traslado" | "pago" | "nomina" {
  return TIPO_COMPROBANTE_MAP[tipoComprobante] ?? "ingreso";
}
