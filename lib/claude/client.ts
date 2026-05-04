import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

/**
 * Singleton del cliente Anthropic.
 *
 * Reglas:
 * - SOLO server-side (lee `ANTHROPIC_API_KEY` de env). NUNCA importar desde
 *   un Client Component.
 * - Si la key no está configurada, lanza con mensaje accionable.
 */
export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no configurada. Agrégala en .env.local y reinicia el servidor.",
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

/**
 * Modelos canónicos del catálogo Claude 4.X.
 * Usar `MODELOS.sonnet` por default para extracción de documentos.
 */
export const MODELOS = {
  haiku: "claude-haiku-4-5-20251001",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-7",
} as const;

export type ModeloKey = keyof typeof MODELOS;

/**
 * Tarifas USD por millón de tokens — usadas para estimar costo en audit log.
 * Actualizar cuando Anthropic publique cambios.
 */
export const PRECIOS_USD_POR_MTOK: Record<ModeloKey, { input: number; output: number }> = {
  haiku: { input: 1.0, output: 5.0 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};

export function calcularCostoUsd(
  modelo: ModeloKey,
  tokensInput: number,
  tokensOutput: number,
): number {
  const p = PRECIOS_USD_POR_MTOK[modelo];
  return (
    (tokensInput * p.input) / 1_000_000 + (tokensOutput * p.output) / 1_000_000
  );
}
