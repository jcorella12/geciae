/**
 * Detección por contenido de archivos `.exp` / `.tsv` / `.txt` de BBVA.
 *
 * Port a TypeScript de la heurística que usa el skill `bbva-estado-cuenta`
 * (Python). El .exp no trae cuenta ni RFC explícitos — la empresa se
 * detecta buscando palabras clave en los conceptos de los movimientos.
 *
 * Funciona server-side y client-side (usa TextDecoder + string ops).
 */

const EMPRESAS_KEYWORDS: Record<string, string[]> = {
  PSE: ["PSENERGIA", "PSE ENERGIA", "PSO240322"],
  CIAE: ["INTELIGENCIA EN AHORRO", "IAE160824", "CIAE"],
  IED: ["INGENIERIA ELECTRICA DEL DESIERTO", "IED191120"],
  LIMSON: ["LIMSON", "LIMPIEZA INDUSTRIAL"],
};

export type ExpDetectResult = {
  empresaCodigo: "PSE" | "CIAE" | "IED" | "LIMSON" | null;
  /** Palabra clave que disparó el match (para mostrar al usuario). */
  hint: string;
  /** Número total de líneas con contenido (para chequeo de plausibilidad). */
  lineas: number;
};

/**
 * Decodifica los primeros bytes del archivo como latin-1 (encoding del .exp
 * de BBVA) y busca palabras clave de cada empresa del grupo.
 */
export function detectarEmpresaEnExp(buffer: ArrayBuffer): ExpDetectResult {
  const bytes = new Uint8Array(buffer);
  // BBVA .exp es ISO-8859-1 (latin-1). Lee hasta 64KB — más que suficiente
  // para tener varias decenas de movimientos.
  const sample = bytes.slice(0, 64 * 1024);
  const text = new TextDecoder("latin1").decode(sample).toUpperCase();
  const lineas = text.split(/\r?\n/).filter((l) => l.trim().length > 0).length;

  for (const [codigo, keywords] of Object.entries(EMPRESAS_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toUpperCase())) {
        return {
          empresaCodigo: codigo as ExpDetectResult["empresaCodigo"],
          hint: `Concepto contiene "${kw}" → ${codigo}`,
          lineas,
        };
      }
    }
  }

  return { empresaCodigo: null, hint: "Sin keywords de empresa en conceptos", lineas };
}
