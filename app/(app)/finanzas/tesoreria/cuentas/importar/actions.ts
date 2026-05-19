"use server";

import {
  obtenerVinculos,
  esCEO,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { detectarEmpresaEnExp } from "@/lib/edoctas/detect-exp";
import { detectarPdfEdocta } from "@/lib/edoctas/detect-pdf";

export type AnalisisResult = {
  ok: boolean;
  error: string | null;
  formato: "pdf" | "exp" | "desconocido";
  /** Pistas extraídas del contenido del archivo. */
  content: {
    rfc?: string | null;
    numeroCuenta?: string | null;
    clabe?: string | null;
    banco?: string | null;
    empresaCodigo?: string | null;
  } | null;
  /** Resumen humano para mostrar al usuario. */
  hint: string;
};

async function gateGestion(): Promise<boolean> {
  const v = await obtenerVinculos();
  return (
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    v.some((vi) => vi.rol === "director")
  );
}

function detectarFormato(filename: string): "pdf" | "exp" | "desconocido" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (
    lower.endsWith(".exp") ||
    lower.endsWith(".tsv") ||
    lower.endsWith(".txt")
  ) {
    return "exp";
  }
  return "desconocido";
}

/**
 * Analiza un archivo de estado de cuenta (PDF o .exp) y retorna pistas
 * estructuradas SIN subir nada. Permite al UI hacer auto-detección de
 * cuenta antes de procesar.
 *
 * El archivo se lee en memoria, se analiza y se descarta — no toca el
 * bucket de Storage.
 */
export async function analizarArchivoEdocta(
  formData: FormData,
): Promise<AnalisisResult> {
  if (!(await gateGestion())) {
    return {
      ok: false,
      error: "Sin permiso.",
      formato: "desconocido",
      content: null,
      hint: "Acceso denegado",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file || !file.name) {
    return {
      ok: false,
      error: "Sin archivo.",
      formato: "desconocido",
      content: null,
      hint: "No se recibió archivo",
    };
  }

  const formato = detectarFormato(file.name);
  if (formato === "desconocido") {
    return {
      ok: false,
      error: "Formato no soportado (solo .pdf / .exp / .tsv / .txt)",
      formato,
      content: null,
      hint: "Formato no soportado",
    };
  }

  // Límite de tamaño para análisis (evita drama si el usuario sube algo grande
  // por error). El uploader real acepta hasta lo que permita el bucket.
  if (file.size > 25 * 1024 * 1024) {
    return {
      ok: false,
      error: "Archivo > 25MB, omitido del análisis previo.",
      formato,
      content: null,
      hint: "Archivo demasiado grande para análisis previo",
    };
  }

  const buffer = await file.arrayBuffer();

  if (formato === "exp") {
    const r = detectarEmpresaEnExp(buffer);
    return {
      ok: true,
      error: null,
      formato,
      content: {
        empresaCodigo: r.empresaCodigo,
      },
      hint:
        r.empresaCodigo != null
          ? `${r.hint} (${r.lineas} líneas de movimientos)`
          : `${r.hint} (${r.lineas} líneas)`,
    };
  }

  // PDF
  try {
    const pdfBuffer = Buffer.from(buffer);
    const r = await detectarPdfEdocta(pdfBuffer);
    return {
      ok: true,
      error: null,
      formato,
      content: {
        rfc: r.rfc,
        numeroCuenta: r.numeroCuenta,
        clabe: r.clabe,
        banco: r.banco,
      },
      hint: r.hint,
    };
  } catch (e) {
    return {
      ok: false,
      error: `Error al analizar PDF: ${(e as Error).message}`,
      formato,
      content: null,
      hint: "Error al leer PDF",
    };
  }
}
