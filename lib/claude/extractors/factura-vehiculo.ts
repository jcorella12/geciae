import { z } from "zod";

import { extractFromDocument, type ExtractResult } from "../extract";

/**
 * Extrae datos de una factura de vehículo (PDF o imagen) para pre-llenar
 * el formulario de captura de vehículo en /activos/vehiculos/nuevo.
 */
const FacturaVehiculoSchema = z.object({
  numero_factura: z.string().nullable(),
  fecha_factura: z.string().nullable().describe("YYYY-MM-DD"),
  emisor: z.string().nullable().describe("Agencia / vendedor"),
  rfc_emisor: z.string().nullable().optional(),
  marca: z.string().nullable(),
  modelo: z.string().nullable(),
  anio: z.number().int().nullable(),
  serie: z.string().nullable().describe("VIN / NIV"),
  placa: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  tipo: z
    .enum([
      "pickup",
      "sedan",
      "suv",
      "van",
      "camion",
      "motocicleta",
      "otro",
    ])
    .nullable()
    .optional(),
  combustible: z
    .enum(["gasolina", "diesel", "electrico", "hibrido", "gas_lp"])
    .nullable()
    .optional(),
  costo_total: z.number().positive().nullable(),
  iva: z.number().nullable().optional(),
});

export type DatosFacturaVehiculo = z.infer<typeof FacturaVehiculoSchema>;

const SYSTEM = `Eres un asistente que extrae datos de facturas de venta de vehículos en México.

REGLAS:
- Solo extrae datos visibles. Si no aparece, devuelve null. NO inventes.
- Fechas en formato ISO YYYY-MM-DD.
- Montos sin signo de pesos, con punto como separador decimal.
- VIN/Serie es la cadena alfanumérica de 17 caracteres.
- Marca: capitaliza primera letra (Nissan, Toyota, Ford, etc.)
- Modelo: como aparezca (NP300, Hilux, Silverado, etc.)
- "tipo" infiere por la descripción: pickup, sedan, suv, van, camion, motocicleta, otro
- "combustible" si aparece "diesel" o similar; default null

DEVUELVE SOLO JSON con esta forma:
{
  "numero_factura": string|null,
  "fecha_factura": "YYYY-MM-DD"|null,
  "emisor": string|null,
  "rfc_emisor": string|null,
  "marca": string|null,
  "modelo": string|null,
  "anio": number|null,
  "serie": string|null,
  "placa": string|null,
  "color": string|null,
  "tipo": "pickup"|"sedan"|"suv"|"van"|"camion"|"motocicleta"|"otro"|null,
  "combustible": "gasolina"|"diesel"|"electrico"|"hibrido"|"gas_lp"|null,
  "costo_total": number|null,
  "iva": number|null
}`;

export async function extraerFacturaVehiculo(
  base64: string,
  mediaType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif"
    | "application/pdf",
  empresaId?: string | null,
): Promise<ExtractResult<DatosFacturaVehiculo>> {
  return extractFromDocument({
    tarea: "factura_vehiculo",
    modulo: "vehiculos",
    systemPrompt: SYSTEM,
    userPrompt:
      "Extrae datos de la factura de vehículo. Si algún campo no es visible, devuélvelo como null.",
    base64,
    mediaType,
    parse: (raw) => FacturaVehiculoSchema.parse(JSON.parse(raw)),
    empresaId,
    modelo: "haiku",
    scoreConfidence: (d) => {
      let score = 0.3;
      if (d.marca) score += 0.15;
      if (d.modelo) score += 0.15;
      if (d.serie) score += 0.2;
      if (d.anio) score += 0.1;
      if (d.numero_factura) score += 0.1;
      return Math.min(1, score);
    },
  });
}

/**
 * Schema para póliza de seguro vehicular.
 */
const PolizaSeguroSchema = z.object({
  numero_poliza: z.string().nullable(),
  aseguradora: z.string().nullable(),
  rfc_aseguradora: z.string().nullable().optional(),
  fecha_emision: z.string().nullable().describe("YYYY-MM-DD"),
  fecha_inicio: z.string().nullable().describe("YYYY-MM-DD"),
  fecha_fin: z.string().nullable().describe("YYYY-MM-DD"),
  tipo_cobertura: z.string().nullable().optional(),
  prima_total: z.number().positive().nullable(),
  asegurado_nombre: z.string().nullable().optional(),
  vehiculo_marca: z.string().nullable().optional(),
  vehiculo_modelo: z.string().nullable().optional(),
  vehiculo_anio: z.number().int().nullable().optional(),
  vehiculo_serie: z.string().nullable().optional(),
  vehiculo_placa: z.string().nullable().optional(),
});

export type DatosPolizaSeguro = z.infer<typeof PolizaSeguroSchema>;

const SYSTEM_POLIZA = `Eres un asistente que extrae datos de pólizas de seguro vehicular en México.

REGLAS:
- Solo extrae datos visibles. Si no aparece, devuelve null.
- Fechas en formato ISO YYYY-MM-DD.
- Aseguradora: GNP, Qualitas, AXA, Mapfre, etc. — como aparezca.
- "tipo_cobertura": amplia, limitada, RC, etc.
- "prima_total" es el monto total de la póliza.

DEVUELVE SOLO JSON con esta forma:
{
  "numero_poliza": string|null,
  "aseguradora": string|null,
  "rfc_aseguradora": string|null,
  "fecha_emision": "YYYY-MM-DD"|null,
  "fecha_inicio": "YYYY-MM-DD"|null,
  "fecha_fin": "YYYY-MM-DD"|null,
  "tipo_cobertura": string|null,
  "prima_total": number|null,
  "asegurado_nombre": string|null,
  "vehiculo_marca": string|null,
  "vehiculo_modelo": string|null,
  "vehiculo_anio": number|null,
  "vehiculo_serie": string|null,
  "vehiculo_placa": string|null
}`;

export async function extraerPolizaSeguro(
  base64: string,
  mediaType:
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "image/gif"
    | "application/pdf",
  empresaId?: string | null,
): Promise<ExtractResult<DatosPolizaSeguro>> {
  return extractFromDocument({
    tarea: "poliza_seguro_vehiculo",
    modulo: "vehiculos",
    systemPrompt: SYSTEM_POLIZA,
    userPrompt:
      "Extrae datos de la póliza de seguro vehicular. Si algún campo no es visible, devuélvelo como null.",
    base64,
    mediaType,
    parse: (raw) => PolizaSeguroSchema.parse(JSON.parse(raw)),
    empresaId,
    modelo: "haiku",
    scoreConfidence: (d) => {
      let score = 0.3;
      if (d.numero_poliza) score += 0.2;
      if (d.aseguradora) score += 0.15;
      if (d.fecha_fin) score += 0.2;
      if (d.prima_total) score += 0.15;
      return Math.min(1, score);
    },
  });
}
