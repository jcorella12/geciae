"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import type { EstadoSerie, SerieResult } from "./state";

function puedeGestionarSeries(
  vinculos: Awaited<ReturnType<typeof obtenerVinculos>>,
): boolean {
  if (esCEO(vinculos)) return true;
  return vinculos.some(
    (v) => v.rol === "director" || v.rol === "operativo",
  );
}

const CrearMasivoSchema = z.object({
  productoId: z.string().uuid(),
  almacenId: z.string().uuid().nullable().optional(),
  numerosSerie: z
    .array(z.string().trim().min(1).max(120))
    .min(1, "Captura al menos un número de serie."),
  fechaCompra: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  garantiaInicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  garantiaMeses: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().int().min(0).max(600).nullable(),
    )
    .optional(),
  ocId: z.string().uuid().nullable().optional(),
  observaciones: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

/**
 * Crear N series del mismo producto en bloque.
 * Útil para "compré 20 paneles JA Solar, todos del mismo lote/OC":
 * un solo form, una pegada de números separados por línea o coma.
 *
 * Si alguna serie ya existe (UNIQUE), se reporta como duplicada y NO
 * aborta la inserción del resto.
 */
export async function crearSeriesMasivo(input: {
  productoId: string;
  almacenId?: string | null;
  numerosSerie: string[];
  fechaCompra?: string | null;
  garantiaInicio?: string | null;
  garantiaMeses?: number | null;
  ocId?: string | null;
  observaciones?: string | null;
}): Promise<{
  ok: boolean;
  error: string | null;
  insertadas: number;
  duplicadas: number;
  duplicadosLista: string[];
}> {
  const v = await obtenerVinculos();
  if (!puedeGestionarSeries(v)) {
    return {
      ok: false,
      error: "Sin permiso para registrar series.",
      insertadas: 0,
      duplicadas: 0,
      duplicadosLista: [],
    };
  }

  // Normalizar números: trim, upper, dedup interno.
  const numerosLimpios = Array.from(
    new Set(
      input.numerosSerie
        .map((n) => n.trim().toUpperCase())
        .filter((n) => n.length > 0),
    ),
  );

  const parsed = CrearMasivoSchema.safeParse({
    ...input,
    numerosSerie: numerosLimpios,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
      insertadas: 0,
      duplicadas: 0,
      duplicadosLista: [],
    };
  }

  const supabase = createClient();

  // Calcular garantía_fin si dan garantiaMeses + garantiaInicio (o fechaCompra)
  let garantiaFin: string | null = null;
  const baseGarantia =
    parsed.data.garantiaInicio ?? parsed.data.fechaCompra ?? null;
  if (baseGarantia && parsed.data.garantiaMeses) {
    const d = new Date(baseGarantia + "T00:00:00");
    d.setMonth(d.getMonth() + parsed.data.garantiaMeses);
    garantiaFin = d.toISOString().slice(0, 10);
  }

  // Detectar duplicados existentes en DB ANTES de insertar (mejor mensaje).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existentes } = await (supabase as any)
    .from("productos_serie")
    .select("numero_serie")
    .eq("producto_id", parsed.data.productoId)
    .in("numero_serie", parsed.data.numerosSerie);

  const yaExisten = new Set(
    ((existentes ?? []) as Array<{ numero_serie: string }>).map(
      (r) => r.numero_serie,
    ),
  );
  const aInsertar = parsed.data.numerosSerie.filter(
    (n) => !yaExisten.has(n),
  );

  if (aInsertar.length === 0) {
    return {
      ok: false,
      error: "Todos los números de serie ya estaban registrados.",
      insertadas: 0,
      duplicadas: yaExisten.size,
      duplicadosLista: Array.from(yaExisten),
    };
  }

  const rows = aInsertar.map((numero) => ({
    producto_id: parsed.data.productoId,
    numero_serie: numero,
    almacen_id: parsed.data.almacenId ?? null,
    oc_id: parsed.data.ocId ?? null,
    fecha_compra: parsed.data.fechaCompra ?? null,
    garantia_inicio: parsed.data.garantiaInicio ?? null,
    garantia_fin: garantiaFin,
    estado: "en_almacen" as EstadoSerie,
    observaciones: parsed.data.observaciones,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (supabase as any)
    .from("productos_serie")
    .insert(rows);

  if (insErr) {
    return {
      ok: false,
      error: insErr.message,
      insertadas: 0,
      duplicadas: yaExisten.size,
      duplicadosLista: Array.from(yaExisten),
    };
  }

  revalidatePath("/inventario/series");
  return {
    ok: true,
    error: null,
    insertadas: aInsertar.length,
    duplicadas: yaExisten.size,
    duplicadosLista: Array.from(yaExisten),
  };
}

const ActualizarSchema = z.object({
  serieId: z.string().uuid(),
  estado: z
    .enum([
      "en_almacen",
      "asignado_proyecto",
      "instalado",
      "dado_baja",
      "en_garantia",
    ])
    .optional(),
  proyectoId: z.string().uuid().nullable().optional(),
  clienteId: z.string().uuid().nullable().optional(),
  almacenId: z.string().uuid().nullable().optional(),
  fechaInstalacion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  ubicacionActual: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  observaciones: z
    .string()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
});

export async function actualizarSerie(input: {
  serieId: string;
  estado?: EstadoSerie;
  proyectoId?: string | null;
  clienteId?: string | null;
  almacenId?: string | null;
  fechaInstalacion?: string | null;
  ubicacionActual?: string | null;
  observaciones?: string | null;
}): Promise<SerieResult> {
  const v = await obtenerVinculos();
  if (!puedeGestionarSeries(v)) {
    return { ok: false, error: "Sin permiso." };
  }

  const parsed = ActualizarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: any = {};
  if (parsed.data.estado !== undefined) patch.estado = parsed.data.estado;
  if (parsed.data.proyectoId !== undefined)
    patch.proyecto_id = parsed.data.proyectoId;
  if (parsed.data.clienteId !== undefined)
    patch.cliente_id = parsed.data.clienteId;
  if (parsed.data.almacenId !== undefined)
    patch.almacen_id = parsed.data.almacenId;
  if (parsed.data.fechaInstalacion !== undefined)
    patch.fecha_instalacion = parsed.data.fechaInstalacion;
  if (parsed.data.ubicacionActual !== undefined)
    patch.ubicacion_actual = parsed.data.ubicacionActual;
  if (parsed.data.observaciones !== undefined)
    patch.observaciones = parsed.data.observaciones;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("productos_serie")
    .update(patch)
    .eq("id", parsed.data.serieId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/inventario/series");
  revalidatePath(`/inventario/series/${parsed.data.serieId}`);
  return { ok: true, error: null };
}

export async function eliminarSerie(serieId: string): Promise<SerieResult> {
  const v = await obtenerVinculos();
  if (!esCEO(v)) {
    return {
      ok: false,
      error: "Solo CEO puede eliminar series (audit).",
    };
  }
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("productos_serie")
    .delete()
    .eq("id", serieId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/inventario/series");
  return { ok: true, error: null };
}
