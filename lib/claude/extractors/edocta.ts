import { z } from "zod";

import { extractFromDocument, type ExtractResult } from "../extract";

/**
 * Schema esperado al extraer el resumen de un estado de cuenta bancario.
 */
const EdocuentaSchema = z.object({
  saldo_inicial: z.number().nullable(),
  saldo_final: z.number().nullable(),
  total_abonos: z.number().nullable(),
  total_cargos: z.number().nullable(),
  num_abonos: z.number().int().nullable(),
  num_cargos: z.number().int().nullable(),
  periodo_inicio: z.string().nullable().describe("YYYY-MM-DD"),
  periodo_fin: z.string().nullable().describe("YYYY-MM-DD"),
});

export type DatosEdocuenta = z.infer<typeof EdocuentaSchema>;

const SYSTEM = `Eres un asistente especializado en estados de cuenta bancarios mexicanos.
Solo respondes JSON válido. Sin texto adicional ni markdown.`;

const userPrompt = (banco: string) => `Este es un estado de cuenta de ${banco}. Extrae el RESUMEN del periodo:

- saldo_inicial: saldo al inicio del periodo
- saldo_final: saldo al cierre del periodo
- total_abonos: suma de depósitos/abonos
- total_cargos: suma de retiros/cargos (en valor absoluto)
- num_abonos: número de movimientos de abono
- num_cargos: número de movimientos de cargo
- periodo_inicio: fecha inicio en YYYY-MM-DD
- periodo_fin: fecha fin en YYYY-MM-DD

REGLAS:
- Solo números, sin formato (punto decimal, sin separador de miles).
- Si un campo NO aparece o es ilegible: null. NO inventes.

Formato (SOLO JSON):
{"saldo_inicial":number|null,"saldo_final":number|null,"total_abonos":number|null,"total_cargos":number|null,"num_abonos":number|null,"num_cargos":number|null,"periodo_inicio":"YYYY-MM-DD"|null,"periodo_fin":"YYYY-MM-DD"|null}`;

export async function extraerEdocuenta(
  base64: string,
  banco: string,
  empresaId?: string | null,
): Promise<ExtractResult<DatosEdocuenta>> {
  return extractFromDocument({
    tarea: "edocuenta_resumen",
    modulo: "tesoreria",
    systemPrompt: SYSTEM,
    userPrompt: userPrompt(banco),
    base64,
    mediaType: "application/pdf",
    parse: (raw) => EdocuentaSchema.parse(JSON.parse(raw)),
    empresaId,
    modelo: "haiku",
    scoreConfidence: (d) => {
      let s = 0.3;
      if (d.saldo_final != null) s += 0.3;
      if (d.saldo_inicial != null) s += 0.15;
      if (d.total_abonos != null) s += 0.1;
      if (d.total_cargos != null) s += 0.1;
      if (d.periodo_fin) s += 0.05;
      return Math.min(1, s);
    },
  });
}
