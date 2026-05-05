"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export type SimpleResultado = { ok: boolean; error: string | null };

async function gateCEO(): Promise<{ ok: boolean; error: string | null }> {
  const v = await obtenerVinculos();
  if (!esCEO(v))
    return { ok: false, error: "Solo CEO puede modificar plantillas." };
  return { ok: true, error: null };
}

// ============================================================================
// PLANTILLA META
// ============================================================================

const ActualizarPlantillaSchema = z.object({
  codigo: z.string(),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  duracion_estimada_dias: z.coerce.number().int().nonnegative().optional().nullable(),
  requiere_tramites_cfe: z.coerce.boolean().default(false),
  requiere_levantamiento_tecnico: z.coerce.boolean().default(false),
  notas: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export async function actualizarPlantilla(
  _prev: SimpleResultado,
  formData: FormData,
): Promise<SimpleResultado> {
  const parsed = ActualizarPlantillaSchema.safeParse({
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") ?? "",
    duracion_estimada_dias: formData.get("duracion_estimada_dias") || null,
    requiere_tramites_cfe: formData.get("requiere_tramites_cfe") === "on",
    requiere_levantamiento_tecnico:
      formData.get("requiere_levantamiento_tecnico") === "on",
    notas: formData.get("notas") ?? "",
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };

  const gate = await gateCEO();
  if (!gate.ok) return gate;

  const supabase = createClient();
  const { error } = await supabase
    .from("plantillas_proyecto")
    .update({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion,
      duracion_estimada_dias: parsed.data.duracion_estimada_dias,
      requiere_tramites_cfe: parsed.data.requiere_tramites_cfe,
      requiere_levantamiento_tecnico: parsed.data.requiere_levantamiento_tecnico,
      notas: parsed.data.notas,
    } as never)
    .eq("codigo", parsed.data.codigo as never);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/configuracion/plantillas/${parsed.data.codigo}`);
  revalidatePath("/configuracion/plantillas");
  return { ok: true, error: null };
}

// ============================================================================
// ETAPAS
// ============================================================================

const EtapaSchema = z.object({
  plantilla_codigo: z.string(),
  numero: z.coerce.number().int().min(1).max(99),
  nombre: z.string().trim().min(2).max(120),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  duracion_estimada_dias: z.coerce.number().int().nonnegative().optional().nullable(),
  hito_facturacion: z.coerce.boolean().default(false),
  porcentaje_facturacion: z.coerce.number().min(0).max(100).optional().nullable(),
});

export async function crearEtapa(
  _prev: SimpleResultado,
  formData: FormData,
): Promise<SimpleResultado> {
  const parsed = EtapaSchema.safeParse({
    plantilla_codigo: formData.get("plantilla_codigo"),
    numero: formData.get("numero"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") ?? "",
    duracion_estimada_dias: formData.get("duracion_estimada_dias") || null,
    hito_facturacion: formData.get("hito_facturacion") === "on",
    porcentaje_facturacion: formData.get("porcentaje_facturacion") || null,
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  const gate = await gateCEO();
  if (!gate.ok) return gate;

  const supabase = createClient();
  const { error } = await supabase.from("plantilla_etapas").insert({
    plantilla_codigo: parsed.data.plantilla_codigo as never,
    numero: parsed.data.numero,
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion,
    duracion_estimada_dias: parsed.data.duracion_estimada_dias,
    hito_facturacion: parsed.data.hito_facturacion,
    porcentaje_facturacion: parsed.data.porcentaje_facturacion,
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/configuracion/plantillas/${parsed.data.plantilla_codigo}`);
  return { ok: true, error: null };
}

export async function eliminarEtapa(
  etapaId: string,
  plantillaCodigo: string,
): Promise<SimpleResultado> {
  const gate = await gateCEO();
  if (!gate.ok) return gate;
  const supabase = createClient();
  const { error } = await supabase
    .from("plantilla_etapas")
    .delete()
    .eq("id", etapaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/configuracion/plantillas/${plantillaCodigo}`);
  return { ok: true, error: null };
}

// ============================================================================
// TAREAS
// ============================================================================

const TareaSchema = z.object({
  etapa_id: z.string().uuid(),
  numero: z.coerce.number().int().min(1).max(99),
  titulo: z.string().trim().min(2).max(200),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  rol_responsable: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  obligatoria: z.coerce.boolean().default(true),
  bloquea_avance: z.coerce.boolean().default(false),
});

export async function crearTarea(
  _prev: SimpleResultado,
  formData: FormData,
): Promise<SimpleResultado> {
  const parsed = TareaSchema.safeParse({
    etapa_id: formData.get("etapa_id"),
    numero: formData.get("numero"),
    titulo: formData.get("titulo"),
    descripcion: formData.get("descripcion") ?? "",
    rol_responsable: formData.get("rol_responsable") ?? "",
    obligatoria: formData.get("obligatoria") === "on",
    bloquea_avance: formData.get("bloquea_avance") === "on",
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };

  const gate = await gateCEO();
  if (!gate.ok) return gate;

  const supabase = createClient();
  const { error } = await supabase.from("plantilla_tareas").insert({
    etapa_id: parsed.data.etapa_id,
    numero: parsed.data.numero,
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion,
    rol_responsable: parsed.data.rol_responsable,
    obligatoria: parsed.data.obligatoria,
    bloquea_avance: parsed.data.bloquea_avance,
  } as never);
  if (error) return { ok: false, error: error.message };

  // Resolver plantilla_codigo para revalidar
  const { data: etapa } = await supabase
    .from("plantilla_etapas")
    .select("plantilla_codigo")
    .eq("id", parsed.data.etapa_id)
    .maybeSingle();
  if (etapa?.plantilla_codigo)
    revalidatePath(`/configuracion/plantillas/${etapa.plantilla_codigo}`);
  return { ok: true, error: null };
}

export async function eliminarTarea(
  tareaId: string,
  plantillaCodigo: string,
): Promise<SimpleResultado> {
  const gate = await gateCEO();
  if (!gate.ok) return gate;
  const supabase = createClient();
  const { error } = await supabase
    .from("plantilla_tareas")
    .delete()
    .eq("id", tareaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/configuracion/plantillas/${plantillaCodigo}`);
  return { ok: true, error: null };
}

// ============================================================================
// DOCUMENTOS
// ============================================================================

const DocumentoSchema = z.object({
  plantilla_codigo: z.string(),
  codigo_documento: z.string().trim().min(2).max(60),
  nombre: z.string().trim().min(2).max(200),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  obligatorio: z.coerce.boolean().default(true),
  requerido_para_estado: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  rol_responsable: z
    .string()
    .trim()
    .max(60)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

export async function crearDocumento(
  _prev: SimpleResultado,
  formData: FormData,
): Promise<SimpleResultado> {
  const parsed = DocumentoSchema.safeParse({
    plantilla_codigo: formData.get("plantilla_codigo"),
    codigo_documento: formData.get("codigo_documento"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") ?? "",
    obligatorio: formData.get("obligatorio") === "on",
    requerido_para_estado: formData.get("requerido_para_estado") ?? "",
    rol_responsable: formData.get("rol_responsable") ?? "",
  });
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };

  const gate = await gateCEO();
  if (!gate.ok) return gate;

  const supabase = createClient();
  const { error } = await supabase.from("plantilla_documentos").insert({
    plantilla_codigo: parsed.data.plantilla_codigo as never,
    codigo_documento: parsed.data.codigo_documento.toUpperCase(),
    nombre: parsed.data.nombre,
    descripcion: parsed.data.descripcion,
    obligatorio: parsed.data.obligatorio,
    requerido_para_estado: parsed.data.requerido_para_estado,
    rol_responsable: parsed.data.rol_responsable,
  } as never);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/configuracion/plantillas/${parsed.data.plantilla_codigo}`);
  return { ok: true, error: null };
}

export async function eliminarDocumento(
  documentoId: string,
  plantillaCodigo: string,
): Promise<SimpleResultado> {
  const gate = await gateCEO();
  if (!gate.ok) return gate;
  const supabase = createClient();
  const { error } = await supabase
    .from("plantilla_documentos")
    .delete()
    .eq("id", documentoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/configuracion/plantillas/${plantillaCodigo}`);
  return { ok: true, error: null };
}
