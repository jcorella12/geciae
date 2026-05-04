import { createHash } from "node:crypto";

import { createClient } from "@/lib/supabase/server";

import {
  calcularCostoUsd,
  getAnthropicClient,
  MODELOS,
  type ModeloKey,
} from "./client";

/**
 * Resultado tipado de una extracción IA.
 */
export type ExtractResult<T> =
  | {
      ok: true;
      data: T;
      meta: {
        modelo: string;
        tokens_input: number;
        tokens_output: number;
        costo_usd: number;
        cache_hit: boolean;
        latencia_ms: number;
        confidence: number;
      };
    }
  | {
      ok: false;
      error: string;
      cause?: "config" | "api" | "parse" | "validation";
    };

const SUPPORTED_MEDIA = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

type MediaType = (typeof SUPPORTED_MEDIA)[number];

export function validarMedia(type: string): type is MediaType {
  return (SUPPORTED_MEDIA as readonly string[]).includes(type);
}

function sourceBlock(media: MediaType, base64: string) {
  if (media === "application/pdf") {
    return {
      type: "document" as const,
      source: {
        type: "base64" as const,
        media_type: media,
        data: base64,
      },
    };
  }
  return {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: media as
        | "image/jpeg"
        | "image/png"
        | "image/gif"
        | "image/webp",
      data: base64,
    },
  };
}

/**
 * Extracción genérica de un documento (imagen o PDF) hacia un JSON tipado.
 *
 * Uso:
 *   const result = await extractFromDocument({
 *     tarea: "csf_lectura",
 *     modulo: "comercial",
 *     systemPrompt: "...",
 *     userPrompt: "...",
 *     base64,
 *     mediaType: "application/pdf",
 *     parse: (raw) => SchemaZod.parse(JSON.parse(raw)),
 *   });
 *
 * Hace cache por hash del input (mismo doc → no llama a Claude dos veces) y
 * registra cada llamada en `ia_invocaciones` para audit + dashboard.
 */
export async function extractFromDocument<T>(opts: {
  tarea: string;
  modulo: string;
  systemPrompt: string;
  userPrompt: string;
  base64: string;
  mediaType: MediaType;
  parse: (raw: string) => T;
  modelo?: ModeloKey;
  empresaId?: string | null;
  /** Función que asigna confidence ∈ [0,1] al output parseado. */
  scoreConfidence?: (data: T) => number;
}): Promise<ExtractResult<T>> {
  const t0 = Date.now();
  const modeloKey = opts.modelo ?? "sonnet";
  const modeloId = MODELOS[modeloKey];

  let client;
  try {
    client = getAnthropicClient();
  } catch (e) {
    return {
      ok: false,
      cause: "config",
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }

  // Hash del input para cache.
  const hash = createHash("sha256")
    .update(`${opts.tarea}|${opts.mediaType}|${opts.base64}`)
    .digest("hex");

  const supabase = createClient();

  // 1) Lookup cache.
  const cacheRes = await supabase
    .from("ia_cache")
    .select("resultado")
    .eq("hash_input", hash)
    .eq("tarea", opts.tarea)
    .maybeSingle();

  if (cacheRes.data?.resultado) {
    try {
      const parsed = opts.parse(JSON.stringify(cacheRes.data.resultado));
      const conf = opts.scoreConfidence?.(parsed) ?? 1;
      // Nice-to-have: contador de hits. No es crítico, omitir si no existe RPC.
      await registrarInvocacion({
        usuario: await usuarioIdActual(),
        empresaId: opts.empresaId ?? null,
        modulo: opts.modulo,
        tarea: opts.tarea,
        modelo: modeloKey,
        tokensInput: 0,
        tokensOutput: 0,
        cache: "hit",
        confidence: conf,
        duracionMs: Date.now() - t0,
        ejecutada: true,
      });
      return {
        ok: true,
        data: parsed,
        meta: {
          modelo: modeloId,
          tokens_input: 0,
          tokens_output: 0,
          costo_usd: 0,
          cache_hit: true,
          latencia_ms: Date.now() - t0,
          confidence: conf,
        },
      };
    } catch {
      // Cache corrupto, ignorar y reprocesar.
    }
  }

  // 2) Llamada a Claude.
  let response;
  try {
    response = await client.messages.create({
      model: modeloId,
      max_tokens: 1024,
      system: opts.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            sourceBlock(opts.mediaType, opts.base64),
            { type: "text", text: opts.userPrompt },
          ],
        },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    await registrarInvocacion({
      usuario: await usuarioIdActual(),
      empresaId: opts.empresaId ?? null,
      modulo: opts.modulo,
      tarea: opts.tarea,
      modelo: modeloKey,
      tokensInput: 0,
      tokensOutput: 0,
      cache: "miss",
      confidence: 0,
      duracionMs: Date.now() - t0,
      ejecutada: false,
      error: msg,
    });
    return { ok: false, cause: "api", error: msg };
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";
  if (!raw) {
    return { ok: false, cause: "parse", error: "Respuesta vacía del modelo" };
  }

  // El modelo a veces devuelve markdown ```json. Extraemos el JSON puro.
  const jsonStr = extraerJsonDeRespuesta(raw);

  let parsed: T;
  try {
    parsed = opts.parse(jsonStr);
  } catch (e) {
    return {
      ok: false,
      cause: "parse",
      error: `No se pudo parsear la respuesta: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  const conf = opts.scoreConfidence?.(parsed) ?? 1;
  const tokIn = response.usage.input_tokens;
  const tokOut = response.usage.output_tokens;
  const costoUsd = calcularCostoUsd(modeloKey, tokIn, tokOut);

  // 3) Persistir cache + audit (best effort).
  void supabase
    .from("ia_cache")
    .insert({
      hash_input: hash,
      tarea: opts.tarea,
      resultado: parsed as never,
      hits: 0,
      fecha_expiracion: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 30 días
    })
    .then(
      () => undefined,
      () => undefined,
    );

  await registrarInvocacion({
    usuario: await usuarioIdActual(),
    empresaId: opts.empresaId ?? null,
    modulo: opts.modulo,
    tarea: opts.tarea,
    modelo: modeloKey,
    tokensInput: tokIn,
    tokensOutput: tokOut,
    costoUsd,
    cache: "miss",
    confidence: conf,
    duracionMs: Date.now() - t0,
    ejecutada: true,
  });

  return {
    ok: true,
    data: parsed,
    meta: {
      modelo: modeloId,
      tokens_input: tokIn,
      tokens_output: tokOut,
      costo_usd: costoUsd,
      cache_hit: false,
      latencia_ms: Date.now() - t0,
      confidence: conf,
    },
  };
}

function extraerJsonDeRespuesta(raw: string): string {
  // Si el modelo respondió con ```json ... ```, extraerlo.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  // Si la respuesta empieza con { o [, asumir JSON puro.
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return trimmed;
  // Buscar el primer { o [ y tomarlo desde ahí.
  const firstBrace = raw.search(/[{[]/);
  if (firstBrace >= 0) return raw.slice(firstBrace).trim();
  return raw;
}

async function usuarioIdActual(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function registrarInvocacion(opts: {
  usuario: string | null;
  empresaId: string | null;
  modulo: string;
  tarea: string;
  modelo: ModeloKey;
  tokensInput: number;
  tokensOutput: number;
  costoUsd?: number;
  cache: "hit" | "miss";
  confidence: number;
  duracionMs: number;
  ejecutada: boolean;
  error?: string;
}) {
  if (!opts.usuario) return;
  const supabase = createClient();
  const costoMxn = (opts.costoUsd ?? 0) * 18.5; // tipo de cambio aproximado; refinar Sprint 5
  void supabase.from("ia_invocaciones").insert({
    usuario_id: opts.usuario,
    empresa_id: opts.empresaId,
    modulo: opts.modulo,
    tarea: opts.tarea,
    modelo_usado: opts.modelo,
    tokens_input: opts.tokensInput,
    tokens_output: opts.tokensOutput,
    costo_usd: opts.costoUsd ?? 0,
    costo_mxn: costoMxn,
    tipo_cache: opts.cache,
    confidence_score: opts.confidence,
    nivel_autonomia: opts.ejecutada ? "amarillo" : "rojo",
    ejecutada: opts.ejecutada,
    duracion_ms: opts.duracionMs,
    resultado_output: opts.error ? { error: opts.error } : null,
  });
}
