"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { crearNotificaciones } from "@/lib/notificaciones/emisor";
import { createClient } from "@/lib/supabase/server";

const SolicitudSchema = z.object({
  activo_id: z.string().uuid(),
  empresa_solicitante_id: z.string().uuid(),
  motivo: z.string().trim().min(5).max(500),
  proyecto_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  centro_destino_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  fecha_recogida_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_devolucion_prevista: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  uso_estimado: z.coerce.number().nonnegative().optional(),
});

async function gateAprobador(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  if (esCEO(v)) return true;
  if (esRolEn(v, empresaId, ["director"])) return true;
  return v.some(
    (vi) =>
      vi.empresa_id === empresaId &&
      (vi.atributos ?? []).includes("contralor"),
  );
}

export async function solicitarPrestamo(
  formData: FormData,
): Promise<{ ok: boolean; id: string | null; error: string | null }> {
  const parsed = SolicitudSchema.safeParse({
    activo_id: formData.get("activo_id"),
    empresa_solicitante_id: formData.get("empresa_solicitante_id"),
    motivo: formData.get("motivo"),
    proyecto_id: formData.get("proyecto_id") || undefined,
    centro_destino_id: formData.get("centro_destino_id") || undefined,
    fecha_recogida_prevista: formData.get("fecha_recogida_prevista"),
    fecha_devolucion_prevista: formData.get("fecha_devolucion_prevista"),
    uso_estimado: formData.get("uso_estimado") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, id: null, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const d = parsed.data;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, id: null, error: "Sin sesión." };

  const { data: activo } = (await supabase
    .from("activos_grupo" as never)
    .select("id, empresa_propietaria_id, estado, nombre, codigo, tarifa_vigente" as never)
    .eq("id", d.activo_id)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      empresa_propietaria_id: string;
      estado: string;
      nombre: string;
      codigo: string;
      tarifa_vigente: number;
    } | null;
  };
  if (!activo) return { ok: false, id: null, error: "Activo no encontrado." };
  if (activo.empresa_propietaria_id === d.empresa_solicitante_id) {
    return { ok: false, id: null, error: "El activo ya pertenece a la empresa solicitante." };
  }
  if (activo.estado !== "disponible") {
    return { ok: false, id: null, error: `El activo está en estado "${activo.estado}".` };
  }

  const { data: nuevo, error } = await supabase
    .from("prestamos_activos" as never)
    .insert({
      activo_id: d.activo_id,
      empresa_solicitante_id: d.empresa_solicitante_id,
      empresa_propietaria_id: activo.empresa_propietaria_id,
      solicitante_id: user.id,
      motivo: d.motivo,
      proyecto_id: d.proyecto_id,
      centro_destino_id: d.centro_destino_id,
      fecha_recogida_prevista: d.fecha_recogida_prevista,
      fecha_devolucion_prevista: d.fecha_devolucion_prevista,
      uso_estimado: d.uso_estimado ?? null,
      tarifa_aplicada: activo.tarifa_vigente,
      estado: "solicitado",
    } as never)
    .select("id, numero")
    .single();
  if (error) return { ok: false, id: null, error: error.message };

  // Notificar a directores/contralores de la empresa propietaria
  const { data: aprobadores } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id, atributos")
    .eq("empresa_id", activo.empresa_propietaria_id)
    .eq("activo", true);
  const ids = (aprobadores ?? [])
    .filter(
      (a) =>
        a.usuario_id &&
        (a.atributos ?? []).includes("contralor")
        // Director también, pero rol no está aquí — confiamos que controlador o director también
    )
    .map((a) => a.usuario_id as string);
  if (ids.length > 0) {
    await crearNotificaciones(
      ids.map((uid) => ({
        usuario_id: uid,
        empresa_id: activo.empresa_propietaria_id,
        tipo: "prestamo_activo_solicitado",
        severidad: "info" as const,
        titulo: `Préstamo solicitado: ${activo.codigo} ${activo.nombre}`,
        mensaje: `${(nuevo as { numero: string }).numero} · Recogida: ${d.fecha_recogida_prevista}`,
        url: `/activos/prestamos/${(nuevo as { id: string }).id}`,
        entidad_tipo: "prestamo_activo",
        entidad_id: (nuevo as { id: string }).id,
      })),
    );
  }

  revalidatePath("/activos/prestamos");
  return { ok: true, id: (nuevo as { id: string }).id, error: null };
}

export async function aprobarPrestamo(
  prestamoId: string,
  observaciones?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: pre } = (await supabase
    .from("prestamos_activos" as never)
    .select("empresa_propietaria_id, solicitante_id, numero, estado" as never)
    .eq("id", prestamoId)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; solicitante_id: string; numero: string; estado: string } | null;
  };
  if (!pre) return { ok: false, error: "Préstamo no encontrado." };
  if (pre.estado !== "solicitado") return { ok: false, error: `Estado actual: ${pre.estado}` };
  if (!(await gateAprobador(pre.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await supabase
    .from("prestamos_activos" as never)
    .update({
      estado: "aprobado",
      aprobador_id: user.id,
      fecha_aprobacion: new Date().toISOString(),
      observaciones_aprobacion: observaciones ?? null,
    } as never)
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  await crearNotificaciones([
    {
      usuario_id: pre.solicitante_id,
      empresa_id: pre.empresa_propietaria_id,
      tipo: "prestamo_activo_aprobado",
      severidad: "success" as const,
      titulo: `Préstamo aprobado: ${pre.numero}`,
      mensaje: "Puedes pasar a recoger el activo.",
      url: `/activos/prestamos/${prestamoId}`,
      entidad_tipo: "prestamo_activo",
      entidad_id: prestamoId,
    },
  ]);
  revalidatePath(`/activos/prestamos/${prestamoId}`);
  revalidatePath("/activos/prestamos");
  return { ok: true, error: null };
}

export async function rechazarPrestamo(
  prestamoId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 3) {
    return { ok: false, error: "Motivo requerido." };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: pre } = (await supabase
    .from("prestamos_activos" as never)
    .select("empresa_propietaria_id, solicitante_id, numero, estado" as never)
    .eq("id", prestamoId)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; solicitante_id: string; numero: string; estado: string } | null;
  };
  if (!pre) return { ok: false, error: "No encontrado." };
  if (pre.estado !== "solicitado") return { ok: false, error: `Estado actual: ${pre.estado}` };
  if (!(await gateAprobador(pre.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("prestamos_activos" as never)
    .update({
      estado: "rechazado",
      aprobador_id: user.id,
      fecha_aprobacion: new Date().toISOString(),
      observaciones_aprobacion: motivo,
    } as never)
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  await crearNotificaciones([
    {
      usuario_id: pre.solicitante_id,
      empresa_id: pre.empresa_propietaria_id,
      tipo: "prestamo_activo_rechazado",
      severidad: "warning" as const,
      titulo: `Préstamo rechazado: ${pre.numero}`,
      mensaje: motivo,
      url: `/activos/prestamos/${prestamoId}`,
      entidad_tipo: "prestamo_activo",
      entidad_id: prestamoId,
    },
  ]);
  revalidatePath(`/activos/prestamos/${prestamoId}`);
  revalidatePath("/activos/prestamos");
  return { ok: true, error: null };
}

export async function recogerPrestamo(
  prestamoId: string,
  estadoInicial: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await supabase
    .from("prestamos_activos" as never)
    .update({
      estado: "recogido",
      responsable_recogida_id: user.id,
      fecha_recogida_real: new Date().toISOString(),
      estado_inicial_descripcion: estadoInicial,
    } as never)
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activos/prestamos/${prestamoId}`);
  revalidatePath("/activos/prestamos");
  return { ok: true, error: null };
}

export async function devolverPrestamo(
  prestamoId: string,
  data: {
    uso_real: number;
    estado_final: string;
    daños?: string;
    requiere_mantenimiento?: boolean;
    requiere_calibracion?: boolean;
  },
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: pre } = (await supabase
    .from("prestamos_activos" as never)
    .select("tarifa_aplicada, estado, empresa_propietaria_id, solicitante_id, numero" as never)
    .eq("id", prestamoId)
    .maybeSingle()) as unknown as {
    data: { tarifa_aplicada: number; estado: string; empresa_propietaria_id: string; solicitante_id: string; numero: string } | null;
  };
  if (!pre) return { ok: false, error: "No encontrado." };
  if (pre.estado !== "recogido") return { ok: false, error: `Estado actual: ${pre.estado}` };

  const costo = Number(pre.tarifa_aplicada ?? 0) * Number(data.uso_real);

  const { error } = await supabase
    .from("prestamos_activos" as never)
    .update({
      estado: "devuelto",
      responsable_devolucion_id: user.id,
      fecha_devolucion_real: new Date().toISOString(),
      uso_real: data.uso_real,
      estado_final_descripcion: data.estado_final,
      daños_reportados: data.daños ?? null,
      requiere_mantenimiento: data.requiere_mantenimiento ?? false,
      requiere_calibracion: data.requiere_calibracion ?? false,
      costo_calculado: costo,
    } as never)
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };

  // Notificar al director propietaria
  const { data: dirs } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .eq("empresa_id", pre.empresa_propietaria_id)
    .eq("activo", true);
  for (const dir of dirs ?? []) {
    if (dir.usuario_id) {
      await crearNotificaciones([
        {
          usuario_id: dir.usuario_id as string,
          empresa_id: pre.empresa_propietaria_id,
          tipo: "prestamo_activo_devuelto",
          severidad: "info" as const,
          titulo: `Préstamo devuelto: ${pre.numero}`,
          mensaje: `Uso real: ${data.uso_real}. Costo: $${costo.toLocaleString("es-MX")}`,
          url: `/activos/prestamos/${prestamoId}`,
          entidad_tipo: "prestamo_activo",
          entidad_id: prestamoId,
        },
      ]);
    }
  }

  revalidatePath(`/activos/prestamos/${prestamoId}`);
  revalidatePath("/activos/prestamos");
  return { ok: true, error: null };
}

export async function cancelarPrestamo(
  prestamoId: string,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };
  const { data: pre } = (await supabase
    .from("prestamos_activos" as never)
    .select("estado, solicitante_id, empresa_propietaria_id" as never)
    .eq("id", prestamoId)
    .maybeSingle()) as unknown as {
    data: { estado: string; solicitante_id: string; empresa_propietaria_id: string } | null;
  };
  if (!pre) return { ok: false, error: "No encontrado." };
  if (!["solicitado", "aprobado"].includes(pre.estado)) {
    return { ok: false, error: "Solo solicitudes pendientes o aprobadas pueden cancelarse." };
  }
  const v = await obtenerVinculos();
  const puede =
    pre.solicitante_id === user.id ||
    esCEO(v) ||
    (await gateAprobador(pre.empresa_propietaria_id));
  if (!puede) return { ok: false, error: "Sin permiso." };

  const { error } = await supabase
    .from("prestamos_activos" as never)
    .update({
      estado: "cancelado",
      observaciones: `CANCELADO: ${motivo}`,
    } as never)
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activos/prestamos/${prestamoId}`);
  revalidatePath("/activos/prestamos");
  return { ok: true, error: null };
}

export async function ajustarCosto(
  prestamoId: string,
  ajuste: number,
  motivo: string,
): Promise<{ ok: boolean; error: string | null }> {
  if (!motivo || motivo.trim().length < 5) {
    return { ok: false, error: "Motivo requerido (min 5 caracteres)." };
  }
  const supabase = createClient();
  const { data: pre } = (await supabase
    .from("prestamos_activos" as never)
    .select("empresa_propietaria_id, estado" as never)
    .eq("id", prestamoId)
    .maybeSingle()) as unknown as {
    data: { empresa_propietaria_id: string; estado: string } | null;
  };
  if (!pre) return { ok: false, error: "No encontrado." };
  if (pre.estado !== "devuelto") {
    return { ok: false, error: "Solo préstamos devueltos pueden ajustarse." };
  }
  if (!(await gateAprobador(pre.empresa_propietaria_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("prestamos_activos" as never)
    .update({ ajuste_manual: ajuste, motivo_ajuste: motivo } as never)
    .eq("id", prestamoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activos/prestamos/${prestamoId}`);
  return { ok: true, error: null };
}
