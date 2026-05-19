/**
 * Detección por contenido de PDFs de estado de cuenta bancario.
 *
 * Port (parcial) del skill `bbva-estado-cuenta` Python → TS. Extrae del
 * header del PDF (primera página):
 *  - RFC del titular (12-13 chars)
 *  - Número de cuenta (8-11 dígitos)
 *  - CLABE (18 dígitos)
 *  - Banco emisor (BBVA, Banamex, Santander, Banorte, HSBC, Scotia)
 *
 * Server-side only (usa pdf-parse). Llamar desde server action, NO desde
 * client component.
 */

export type PdfDetectResult = {
  rfc: string | null;
  numeroCuenta: string | null;
  clabe: string | null;
  banco: string | null;
  /** Periodo si lo encuentra (formato YYYY-MM-DD..YYYY-MM-DD). */
  periodo: { inicio: string; fin: string } | null;
  /** Resumen humano para mostrar en UI. */
  hint: string;
};

const RFC_RE = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/g;
const CLABE_RE = /\b(\d{18})\b/;
const CUENTA_BBVA_RE = /No\.?\s*de\s*Cuenta\s+(\d{8,11})/i;
const CUENTA_GENERIC_RE = /(?:Cuenta|Account)[^\d]{0,30}(\d{8,11})\b/i;

const BANCO_PATTERNS: Array<{ banco: string; pattern: RegExp }> = [
  { banco: "BBVA México", pattern: /\bBBVA(?:\s+M[EÉ]XICO|\s+BANCOMER)?\b/i },
  { banco: "Banamex", pattern: /\b(?:Banamex|Citibanamex|CITIBANAMEX)\b/i },
  { banco: "Santander", pattern: /\bSantander\b/i },
  { banco: "Banorte", pattern: /\bBanorte\b/i },
  { banco: "HSBC", pattern: /\bHSBC\b/i },
  { banco: "Scotiabank", pattern: /\bScotia(?:bank)?\b/i },
  { banco: "Inbursa", pattern: /\bInbursa\b/i },
  { banco: "Mifel", pattern: /\bMifel\b/i },
];

const MES_MAP: Record<string, number> = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

/** Extrae texto del PDF (server-side). */
async function extractPdfText(buffer: Buffer): Promise<string> {
  // Carga dinámica para que no entre al bundle del cliente.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    // El header BBVA está en página 1. Truncamos para no perder cycles si el
    // PDF tiene muchas páginas — los metadatos están al inicio.
    return result.text.slice(0, 16000);
  } finally {
    await parser.destroy().catch(() => {
      // ignore — el destroy es best-effort
    });
  }
}

/**
 * Analiza un PDF de estado de cuenta y retorna pistas estructuradas.
 * No tira si algo no se encuentra — solo retorna null para los campos no
 * detectados.
 */
export async function detectarPdfEdocta(
  buffer: Buffer,
): Promise<PdfDetectResult> {
  let text: string;
  try {
    text = await extractPdfText(buffer);
  } catch (e) {
    return {
      rfc: null,
      numeroCuenta: null,
      clabe: null,
      banco: null,
      periodo: null,
      hint: `Error al leer PDF: ${(e as Error).message}`,
    };
  }

  // RFC: pueden aparecer varios (titular + receptor de SAT timbre).
  // Tomamos el primero que NO sea un RFC reconocido del banco
  // (BBVA: BBA830831LJ2, BNAMEX, etc.).
  const RFCS_BANCOS = new Set([
    "BBA830831LJ2",
    "BBA830831",
    "BNM840515",
    "BSM970519",
    "BBI610818",
    "BMG761125",
    "HBM950201",
  ]);
  let rfc: string | null = null;
  const rfcMatches = Array.from(text.matchAll(RFC_RE));
  for (const m of rfcMatches) {
    const candidate = m[1].toUpperCase();
    const stem = candidate.slice(0, 9);
    if (!RFCS_BANCOS.has(candidate) && !RFCS_BANCOS.has(stem)) {
      rfc = candidate;
      break;
    }
  }

  const clabeMatch = text.match(CLABE_RE);
  const clabe = clabeMatch ? clabeMatch[1] : null;

  // Número de cuenta: primero patrón BBVA específico, luego genérico.
  let numeroCuenta: string | null = null;
  const ctaMatch = text.match(CUENTA_BBVA_RE) ?? text.match(CUENTA_GENERIC_RE);
  if (ctaMatch) numeroCuenta = ctaMatch[1];

  let banco: string | null = null;
  for (const { banco: nombre, pattern } of BANCO_PATTERNS) {
    if (pattern.test(text)) {
      banco = nombre;
      break;
    }
  }

  // Periodo (BBVA: "DEL DD/MM/YYYY AL DD/MM/YYYY").
  let periodo: PdfDetectResult["periodo"] = null;
  const perBbva = text.match(
    /Periodo\s+DEL\s+(\d{2})\/(\d{2})\/(\d{4})\s+AL\s+(\d{2})\/(\d{2})\/(\d{4})/i,
  );
  if (perBbva) {
    periodo = {
      inicio: `${perBbva[3]}-${perBbva[2]}-${perBbva[1]}`,
      fin: `${perBbva[6]}-${perBbva[5]}-${perBbva[4]}`,
    };
  } else {
    // Patrón "Del 01-ENE-2026 Al 31-ENE-2026" (Banamex, Banorte).
    const perAlt = text.match(
      /Del\s+(\d{1,2})-([A-Z]{3})-(\d{4})\s+Al\s+(\d{1,2})-([A-Z]{3})-(\d{4})/i,
    );
    if (perAlt) {
      const mIni = MES_MAP[perAlt[2].toUpperCase()];
      const mFin = MES_MAP[perAlt[5].toUpperCase()];
      if (mIni && mFin) {
        periodo = {
          inicio: `${perAlt[3]}-${String(mIni).padStart(2, "0")}-${String(Number(perAlt[1])).padStart(2, "0")}`,
          fin: `${perAlt[6]}-${String(mFin).padStart(2, "0")}-${String(Number(perAlt[4])).padStart(2, "0")}`,
        };
      }
    }
  }

  const pistas: string[] = [];
  if (rfc) pistas.push(`RFC ${rfc}`);
  if (banco) pistas.push(banco);
  if (numeroCuenta) pistas.push(`cuenta ${numeroCuenta}`);
  if (clabe) pistas.push(`CLABE ${clabe.slice(0, 4)}…${clabe.slice(-4)}`);
  const hint =
    pistas.length > 0 ? pistas.join(" · ") : "PDF sin metadatos reconocibles";

  return { rfc, numeroCuenta, clabe, banco, periodo, hint };
}
