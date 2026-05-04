"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  ActividadComercialSchema,
  OportunidadFormSchema,
} from "@/lib/oportunidades/schemas";
import {
  PROBABILIDAD_DEFAULT,
  type ActividadState,
  type EstadoOportunidad,
  type OportunidadState,
} from "@/lib/oportunidades/state";
import { createClient } from "@/lib/supabase/server";

function gateOportunidad(
  v: Awaited<ReturnType<typeof obtenerVinculos>>,
  empresaId: string,
): boolean {
  return (
    esCEO(v) ||
    tieneAtributo(v, "vendedor") ||
    esRolEn(v, empresaId, ["director", "operativo"])
  );
}

export async function crearOportunidad(
  _prev: OportunidadState,
  formData: FormData,
): Promise<OportunidadState> {
  const parsed = OportunidadFormSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    cliente_id: formData.get("cliente_id"),
    vendedor_id: formData.get("vendedor_id") || undefined,
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    estado: formData.get("estado") || "lead",
    monto_estimado: formData.get("monto_estimado") || undefined,
    probabilidad: formData.get("probabilidad") || undefined,
    fuente: formData.get("fuente") || undefined,
    fecha_proxima_accion: formData.get("fecha_proxima_accion") || undefined,
    proxima_accion: formData.get("proxima_accion") || undefined,
    fecha_cierre_estimada: formData.get("fecha_cierre_estimada") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      oportunidadId: null,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const v = await obtenerVinculos();
  if (!gateOportunidad(v, d.empresa_id)) {
    return { ok: false, oportunidadId: null, error: "Sin permiso." };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { ok: false, oportunidadId: null, error: "Sin sesión." };

  const probabilidad = d.probabilidad ?? PROBABILIDAD_DEFAULT[d.estado];

  const { data: nueva, error } = await supabase
    .from("oportunidades")
    .insert({
      empresa_id: d.empresa_id,
      cliente_id: d.cliente_id,
      vendedor_id: d.vendedor_id ?? user.id,
      nombre: d.nombre,
      descripcion: d.descripcion,
      estado: d.estado,
      monto_estimado: d.monto_estimado ?? null,
      probabilidad,
      fuente: d.fuente,
      fecha_proxima_accion: d.fecha_proxima_accion,
      proxima_accion: d.proxima_accion,
      fecha_cierre_estimada: d.fecha_cierre_estimada,
      observaciones: d.observaciones,
    })
    .select("id")
    .single();
  if (error || !nueva) {
    return {
      ok: false,
      oportunidadId: null,
      error: error?.message ?? "Error al crear.",
    };
  }
  revalidatePath("/comercial/oportunidades");
  return { ok: true, oportunidadId: nueva.id, error: null };
}

export async function actualizarOportunidad(
  oportunidadId: string,
  _prev: OportunidadState,
  formData: FormData,
): Promise<OportunidadState> {
  const parsed = OportunidadFormSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    cliente_id: formData.get("cliente_id"),
    vendedor_id: formData.get("vendedor_id") || undefined,
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    estado: formData.get("estado") || "lead",
    monto_estimado: formData.get("monto_estimado") || undefined,
    probabilidad: formData.get("probabilidad") || undefined,
    fuente: formData.get("fuente") || undefined,
    fecha_proxima_accion: formData.get("fecha_proxima_accion") || undefined,
    proxima_accion: formData.get("proxima_accion") || undefined,
    fecha_cierre_estimada: formData.get("fecha_cierre_estimada") || undefined,
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      oportunidadId,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const v = await obtenerVinculos();
  if (!gateOportunidad(v, d.empresa_id)) {
    return { ok: false, oportunidadId, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("oportunidades")
    .update({
      cliente_id: d.cliente_id,
      vendedor_id: d.vendedor_id,
      nombre: d.nombre,
      descripcion: d.descripcion,
      estado: d.estado,
      monto_estimado: d.monto_estimado ?? null,
      probabilidad: d.probabilidad ?? PROBABILIDAD_DEFAULT[d.estado],
      fuente: d.fuente,
      fecha_proxima_accion: d.fecha_proxima_accion,
      proxima_accion: d.proxima_accion,
      fecha_cierre_estimada: d.fecha_cierre_estimada,
      observaciones: d.observaciones,
      updated_at: new Date().toISOString(),
    })
    .eq("id", oportunidadId);
  if (error) return { ok: false, oportunidadId, error: error.message };
  revalidatePath("/comercial/oportunidades");
  revalidatePath(`/comercial/oportunidades/${oportunidadId}`);
  return { ok: true, oportunidadId, error: null };
}

/**
 * Cambia solo el estado (típicamente desde el Kanban con drag-and-drop o botones).
 * Auto-ajusta la probabilidad si no se ha seteado manual.
 */
export async function cambiarEtapa(
  oportunidadId: string,
  nuevaEtapa: EstadoOportunidad,
  motivoPerdida?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: op } = await supabase
    .from("oportunidades")
    .select("empresa_id, estado, probabilidad")
    .eq("id", oportunidadId)
    .maybeSingle();
  if (!op) return { ok: false, error: "Oportunidad no encontrada." };
  const v = await obtenerVinculos();
  if (!gateOportunidad(v, op.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }

  // Patch dinámico: campos opcionales se agregan condicionalmente.
  // El tipo Update<oportunidades> es exacto; usamos un objeto plano y dejamos
  // que Supabase valide en runtime (cast localizado para evitar `as any` global).
  const update: Record<string, unknown> = {
    estado: nuevaEtapa,
    probabilidad: PROBABILIDAD_DEFAULT[nuevaEtapa],
    updated_at: new Date().toISOString(),
  };
  if (nuevaEtapa === "ganado" || nuevaEtapa === "perdido") {
    update.fecha_cierre_real = new Date().toISOString().slice(0, 10);
    if (nuevaEtapa === "perdido" && motivoPerdida) {
      update.motivo_perdida = motivoPerdida.trim();
    }
  }
  const { error } = await supabase
    .from("oportunidades")
    .update(update as never)
    .eq("id", oportunidadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/comercial/oportunidades");
  revalidatePath(`/comercial/oportunidades/${oportunidadId}`);
  return { ok: true, error: null };
}

export async function registrarActividad(
  _prev: ActividadState,
  formData: FormData,
): Promise<ActividadState> {
  const parsed = ActividadComercialSchema.safeParse({
    oportunidad_id: formData.get("oportunidad_id") || undefined,
    cliente_id: formData.get("cliente_id") || undefined,
    tipo: formData.get("tipo"),
    fecha: formData.get("fecha"),
    duracion_minutos: formData.get("duracion_minutos") || undefined,
    participantes: formData.get("participantes") || undefined,
    notas: formData.get("notas"),
    resultado: formData.get("resultado") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await supabase.from("actividades_comerciales").insert({
    oportunidad_id: d.oportunidad_id,
    cliente_id: d.cliente_id,
    tipo: d.tipo,
    fecha: new Date(d.fecha).toISOString(),
    duracion_minutos: d.duracion_minutos,
    participantes: d.participantes,
    notas: d.notas,
    resultado: d.resultado,
    capturado_por: user.id,
  });
  if (error) return { ok: false, error: error.message };

  if (d.oportunidad_id) {
    revalidatePath(`/comercial/oportunidades/${d.oportunidad_id}`);
  }
  revalidatePath("/comercial/oportunidades");
  return { ok: true, error: null };
}

export async function cerrarOportunidadGanada(
  oportunidadId: string,
): Promise<{ ok: boolean; error: string | null }> {
  return cambiarEtapa(oportunidadId, "ganado");
}

export async function cerrarOportunidadPerdida(
  oportunidadId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 3) {
    return { ok: false, error: "Motivo de pérdida requerido." };
  }
  return cambiarEtapa(oportunidadId, "perdido", motivo);
}
