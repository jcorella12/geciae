/**
 * Sprint 8.2 — Extracción de XMLs de paquetes ZIP del SAT.
 */

import { Readable } from "stream";

/** Extrae XMLs de un buffer ZIP retornando filename + contenido. */
export async function extraerXmlsDePaquete(
  zipBuffer: Buffer,
): Promise<Array<{ filename: string; content: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yauzlMod: any = await import("yauzl-promise");
  const yauzl = yauzlMod.default ?? yauzlMod;

  const xmls: Array<{ filename: string; content: string }> = [];
  const zip = await yauzl.fromBuffer(zipBuffer);

  try {
    for await (const entry of zip) {
      if (entry.filename.toLowerCase().endsWith(".xml")) {
        const stream: Readable = await entry.openReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk as Buffer);
        }
        const content = Buffer.concat(chunks).toString("utf-8");
        xmls.push({ filename: entry.filename, content });
      }
    }
  } finally {
    await zip.close();
  }

  return xmls;
}

/**
 * Extrae el UUID del CFDI desde el XML sin parsearlo completo.
 * Mira el atributo UUID="..." del nodo TimbreFiscalDigital.
 */
export function extraerUuid(xml: string): string | null {
  const match = xml.match(/UUID="([0-9A-Fa-f-]{36})"/);
  return match ? match[1].toUpperCase() : null;
}

/** Extrae fecha de emisión "Fecha=YYYY-MM-DDTHH:MM:SS" del comprobante. */
export function extraerFechaEmision(xml: string): string | null {
  const match = xml.match(/Fecha="([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+)"/);
  return match ? match[1] : null;
}

/** Extrae el total del CFDI. */
export function extraerTotal(xml: string): number | null {
  const match = xml.match(/\bTotal="([0-9.]+)"/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

/** Extrae RFCs emisor y receptor. */
export function extraerRfcs(xml: string): {
  emisor: string | null;
  receptor: string | null;
} {
  const emisorMatch = xml.match(/<cfdi:Emisor[^>]*Rfc="([^"]+)"/);
  const receptorMatch = xml.match(/<cfdi:Receptor[^>]*Rfc="([^"]+)"/);
  return {
    emisor: emisorMatch ? emisorMatch[1].toUpperCase() : null,
    receptor: receptorMatch ? receptorMatch[1].toUpperCase() : null,
  };
}
