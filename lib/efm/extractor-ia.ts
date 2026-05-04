import { extractFromDocument, validarMedia } from "@/lib/claude/extract";
import { createClient } from "@/lib/supabase/server";

import { KPIsExtraidoSchema, type KPIsExtraido } from "./schemas";

const BUCKET = "estados-financieros";

const SYSTEM_PROMPT = `Eres un asistente experto en contabilidad mexicana NIF.
Recibes el PDF del Balance General y/o Estado de Resultados de un mes
contable mexicano. Extrae los siguientes KPIs en MXN (sin separadores de
miles, sin moneda, solo el número decimal puro):

- utilidad_neta: del Estado de Resultados, "Utilidad neta" o "Resultado del
  ejercicio" o equivalente. Si hay pérdida, usar número negativo.
- ingresos_totales: del Estado de Resultados, "Ingresos" o "Ventas totales"
  o equivalente, ANTES de impuestos.
- egresos_totales: del Estado de Resultados, suma de costos + gastos.
- iva_trasladado: del Balance, cuenta IVA trasladado (no acreditable). Si
  no aparece, devolver null.
- iva_acreditable: del Balance, IVA acreditable.
- flujo_efectivo: del Balance, total de Bancos + Caja, o del Flujo de
  Efectivo final del periodo. Si no es claro, devolver null.

Devuelve EXCLUSIVAMENTE un JSON con esta forma exacta y nada más:

{
  "utilidad_neta": <number|null>,
  "ingresos_totales": <number|null>,
  "egresos_totales": <number|null>,
  "iva_trasladado": <number|null>,
  "iva_acreditable": <number|null>,
  "flujo_efectivo": <number|null>,
  "confidence": <number entre 0 y 1>
}

confidence refleja qué tan seguro estás de los números: 1.0 si son
claramente legibles, 0.5 si son borrosos o ambiguos, 0.2 si no estás
seguro. Si NO encuentras un KPI, su valor es null y reduces confidence.
Nunca incluyas texto fuera del JSON.`;

const USER_PROMPT = `Extrae los KPIs financieros del documento adjunto en
formato JSON estricto, según el system prompt. Solo el JSON.`;

/**
 * Extrae los KPIs financieros (utilidad neta, ingresos, etc.) del Balance +
 * Estado de Resultados de un EFM. Persiste en `estados_financieros_mensuales`
 * y registra la invocación IA con costo en `ia_invocaciones` (vía
 * extractFromDocument que ya hace audit + cache).
 *
 * Estrategia: si hay tanto Balance como ER, prioriza el ER (los KPIs principales
 * vienen del ER). Si solo hay Balance, lo intenta. Si ninguno: error.
 */
export async function extraerKPIsIA(efmId: string): Promise<{
  ok: boolean;
  error: string | null;
  kpis?: KPIsExtraido;
  confidence?: number;
}> {
  const supabase = createClient();
  const { data: efm } = await supabase
    .from("estados_financieros_mensuales")
    .select("id, empresa_id, documentos")
    .eq("id", efmId)
    .maybeSingle();
  if (!efm)
    return { ok: false, error: "EFM no encontrado." };

  const documentos = (efm.documentos ?? {}) as Record<string, string>;
  // Priorizamos Estado de Resultados; si no hay, usamos Balance.
  const path =
    documentos.estado_resultados ??
    documentos.balance_general ??
    null;
  if (!path)
    return {
      ok: false,
      error:
        "Falta Balance General o Estado de Resultados. Sube al menos uno antes de extraer KPIs.",
    };

  // Descargar el PDF del bucket
  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(path);
  if (dlErr || !blob)
    return {
      ok: false,
      error: `No se pudo descargar el PDF: ${dlErr?.message ?? "blob vacío"}`,
    };

  const ab = await blob.arrayBuffer();
  const buf = Buffer.from(ab);
  const base64 = buf.toString("base64");
  const mediaType = "application/pdf";
  if (!validarMedia(mediaType))
    return { ok: false, error: "Tipo de archivo no soportado." };

  const result = await extractFromDocument({
    tarea: "efm_kpis",
    modulo: "finanzas",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: USER_PROMPT,
    base64,
    mediaType,
    parse: (raw) => {
      // Claude a veces devuelve el JSON envuelto. Limpiar.
      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");
      const obj = JSON.parse(cleaned);
      return KPIsExtraidoSchema.parse(obj);
    },
    scoreConfidence: (k) => k.confidence ?? 0.7,
    empresaId: efm.empresa_id,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  // Persistir en estados_financieros_mensuales (sin tocar firmados/observaciones)
  const { error: upErr } = await supabase
    .from("estados_financieros_mensuales")
    .update({
      utilidad_neta: result.data.utilidad_neta,
      ingresos_totales: result.data.ingresos_totales,
      egresos_totales: result.data.egresos_totales,
      iva_trasladado: result.data.iva_trasladado,
      iva_acreditable: result.data.iva_acreditable,
      flujo_efectivo: result.data.flujo_efectivo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", efmId);
  if (upErr)
    return {
      ok: false,
      error: `KPIs extraídos pero no se pudieron guardar: ${upErr.message}`,
    };

  return {
    ok: true,
    error: null,
    kpis: result.data,
    confidence: result.meta.confidence,
  };
}
