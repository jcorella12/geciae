"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { getAnthropicClient, MODELOS } from "@/lib/claude/client";
import { createClient } from "@/lib/supabase/server";

/**
 * Server action que procesa un PDF de reporte mensual de gasolina (formato
 * El Faro / similar) y registra cada carga en vehiculos_bitacora haciendo
 * match por placa con la flota de la empresa indicada.
 *
 * Usa Claude vision para extraer movimientos del PDF en JSON estructurado.
 */

export type CargaCombustibleExtraida = {
  placas: string;
  fecha: string; // YYYY-MM-DD
  hora: string | null; // HH:MM
  litros: number;
  precio_por_litro: number;
  importe: number;
  km_lectura: number | null;
  ticket: string | null;
  estacion: string | null;
  alias_usuario: string | null;
  producto: string | null; // Regular, SUPREME, etc.
};

export type ResultadoProcesarReporte = {
  ok: boolean;
  error: string | null;
  empresaCodigo: string | null;
  periodo: string | null;
  cargas_extraidas: number;
  cargas_insertadas: number;
  cargas_sin_match: Array<{
    placas: string;
    fecha: string;
    importe: number;
    alias: string | null;
  }>;
  vehiculos_actualizados: number;
};

const PROMPT_SISTEMA = `Eres un parser de PDFs de reportes mensuales de consumo de gasolina (formato típico El Faro u otra estación de servicio en México). Extraes cada carga individual con datos precisos.

Devuelves SIEMPRE un JSON con esta forma exacta:
{
  "empresa_codigo": "CIAE" | "PSE" | "IED" | "LIMSON" | null,
  "periodo": "YYYY-MM",
  "cargas": [
    {
      "placas": "VB0675A",
      "fecha": "2026-04-27",
      "hora": "11:41",
      "litros": 44.33,
      "precio_por_litro": 23.99,
      "importe": 1063.55,
      "km_lectura": 35168,
      "ticket": "480858",
      "estacion": "2,543.00",
      "alias_usuario": "OROCH",
      "producto": "Regular"
    }
  ]
}

Reglas:
- empresa_codigo: deduce del nombre del cliente. "INTELIGENCIA EN AHORRO DE ENERGIA" → "CIAE". "PSENERGIA" → "PSE". "INGENIERIA ELECTRICA DEL DESIERTO" → "IED". Si no detectas, null.
- placas: las placas del vehículo (campo "Placas"), MAYÚSCULAS, sin espacios.
- km_lectura: el valor de la columna "Kms". Si es 1 o muy bajo (< 50), asume que el conductor no lo capturó; pon null. Si es razonable (>= 50), úsalo.
- alias_usuario: el nombre que aparece después de "Usuario:" en el encabezado de cada vehículo.
- producto: "Regular" o "SUPREME" según columna Product.
- Una fila = una carga. Ignora "Sub Total" y "Grand Total".
- Vehículos sin placas (ej. "UNIVERSAL") los OMITES de cargas.

Devuelve SOLO el JSON, sin markdown ni explicación.`;

async function gateProcesar(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    esRolEn(v, empresaId, ["director", "operativo"]);
  if (!puede) {
    return {
      ok: false,
      error:
        "Sin permiso (requiere CEO, tesorero, director u operativo de la empresa).",
    };
  }
  return { ok: true };
}

export async function procesarReporteGasolina(
  formData: FormData,
): Promise<ResultadoProcesarReporte> {
  const empty: ResultadoProcesarReporte = {
    ok: false,
    error: null,
    empresaCodigo: null,
    periodo: null,
    cargas_extraidas: 0,
    cargas_insertadas: 0,
    cargas_sin_match: [],
    vehiculos_actualizados: 0,
  };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { ...empty, error: "Selecciona un archivo PDF." };
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { ...empty, error: "Solo se acepta formato PDF." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ...empty, error: "Archivo > 10MB no permitido." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...empty, error: "Sin sesión." };

  // Convertir PDF a base64
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  // Llamar a Claude para extraer
  let extraido: {
    empresa_codigo: string | null;
    periodo: string;
    cargas: CargaCombustibleExtraida[];
  };
  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: MODELOS.sonnet,
      max_tokens: 4096,
      system: PROMPT_SISTEMA,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Extrae todas las cargas del reporte. Responde solo con el JSON.",
            },
          ],
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const raw =
      textBlock && "text" in textBlock ? textBlock.text.trim() : "";
    if (!raw) {
      return { ...empty, error: "Claude no devolvió contenido." };
    }
    // Quitar fences markdown si vinieran
    const limpio = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");
    extraido = JSON.parse(limpio);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ...empty, error: `Error procesando PDF: ${msg}` };
  }

  if (!Array.isArray(extraido?.cargas)) {
    return { ...empty, error: "PDF no parece un reporte de gasolina válido." };
  }

  // Resolver empresa
  if (!extraido.empresa_codigo) {
    return {
      ...empty,
      error:
        "No se pudo detectar la empresa del PDF. Asegúrate que el reporte tenga el nombre del cliente.",
    };
  }

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, codigo")
    .eq("codigo", extraido.empresa_codigo)
    .maybeSingle();
  if (!empresa) {
    return {
      ...empty,
      error: `Empresa ${extraido.empresa_codigo} no encontrada en el sistema.`,
    };
  }

  const gate = await gateProcesar(empresa.id);
  if (!gate.ok) return { ...empty, error: gate.error };

  // Cargar vehículos de la empresa para hacer match
  const { data: vehiculos } = await supabase
    .from("vehiculos")
    .select("id, placa, km_actual")
    .eq("empresa_id", empresa.id);
  const vehPorPlaca = new Map<string, { id: string; km_actual: number | null }>();
  for (const v of vehiculos ?? []) {
    if (v.placa)
      vehPorPlaca.set(v.placa.toUpperCase().replace(/\s/g, ""), {
        id: v.id,
        km_actual: v.km_actual ?? null,
      });
  }

  // Insertar bitácora con dedupe por (vehiculo_id, fecha, ticket)
  const sinMatch: ResultadoProcesarReporte["cargas_sin_match"] = [];
  const insertarPayload: Array<Record<string, unknown>> = [];
  const vehiculosTocados = new Set<string>();

  for (const c of extraido.cargas) {
    const placaNorm = (c.placas ?? "").toUpperCase().replace(/\s/g, "");
    if (!placaNorm) {
      sinMatch.push({
        placas: c.placas ?? "(sin placa)",
        fecha: c.fecha,
        importe: c.importe,
        alias: c.alias_usuario,
      });
      continue;
    }
    const veh = vehPorPlaca.get(placaNorm);
    if (!veh) {
      sinMatch.push({
        placas: c.placas,
        fecha: c.fecha,
        importe: c.importe,
        alias: c.alias_usuario,
      });
      continue;
    }
    vehiculosTocados.add(veh.id);
    insertarPayload.push({
      vehiculo_id: veh.id,
      fecha: c.fecha,
      tipo: "carga_combustible" as never,
      descripcion: `${c.producto ?? "Combustible"} · ${c.litros.toFixed(2)} L · ${c.alias_usuario ?? "—"}${c.ticket ? ` · ticket ${c.ticket}` : ""}`,
      litros: c.litros,
      precio_por_litro: c.precio_por_litro,
      monto: c.importe,
      km_lectura: c.km_lectura,
      capturado_por: user.id,
      observaciones: `Cargado desde reporte mensual ${extraido.periodo}. Ticket ${c.ticket ?? "—"}, estación ${c.estacion ?? "—"}, alias ${c.alias_usuario ?? "—"}.`,
    });
  }

  // Dedupe: si ya hay bitácora para (vehiculo, fecha, descripcion-ticket), saltar.
  // Estrategia simple: borrar todas las cargas del mes para los vehiculos
  // tocados con observaciones que mencionen el periodo, antes de insertar.
  if (insertarPayload.length > 0 && vehiculosTocados.size > 0) {
    const inicio = `${extraido.periodo}-01`;
    const [yy, mm] = extraido.periodo.split("-").map(Number);
    const sigYear = mm === 12 ? yy + 1 : yy;
    const sigMes = mm === 12 ? 1 : mm + 1;
    const fin = `${sigYear}-${String(sigMes).padStart(2, "0")}-01`;

    await supabase
      .from("vehiculos_bitacora")
      .delete()
      .eq("tipo", "carga_combustible")
      .in("vehiculo_id", Array.from(vehiculosTocados))
      .gte("fecha", inicio)
      .lt("fecha", fin)
      .like(
        "observaciones",
        `Cargado desde reporte mensual ${extraido.periodo}%`,
      );
  }

  const { error: insErr } = insertarPayload.length
    ? await supabase
        .from("vehiculos_bitacora")
        .insert(insertarPayload as never)
    : { error: null };
  if (insErr) {
    return {
      ...empty,
      error: `Error insertando bitácora: ${insErr.message}`,
    };
  }

  revalidatePath("/activos/vehiculos");

  return {
    ok: true,
    error: null,
    empresaCodigo: empresa.codigo,
    periodo: extraido.periodo,
    cargas_extraidas: extraido.cargas.length,
    cargas_insertadas: insertarPayload.length,
    cargas_sin_match: sinMatch,
    vehiculos_actualizados: vehiculosTocados.size,
  };
}
