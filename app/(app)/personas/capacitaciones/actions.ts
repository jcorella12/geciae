"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  obtenerVinculos,
  puedeAsignarCapacitacionEn,
  puedeGestionarCatalogoCapacitaciones,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import type { CursoResult } from "./state";

const MODALIDADES = ["presencial", "online", "mixto"] as const;

const CursoSchema = z.object({
  codigo: z
    .string()
    .trim()
    .min(2, "Código requerido")
    .max(40)
    .regex(/^[A-Z0-9-_]+$/i, "Solo letras, números, guion y guion bajo"),
  nombre: z.string().trim().min(3, "Nombre requerido").max(120),
  descripcion: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
  modalidad: z.enum(MODALIDADES).optional().nullable(),
  duracion_horas: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().positive().nullable(),
    )
    .optional(),
  instructor_externo: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : null)),
  costo: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(0).nullable(),
    )
    .optional(),
  genera_dc3: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  vigencia_constancia_meses: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().int().min(1).max(120).nullable(),
    )
    .optional(),
});

export async function crearCurso(formData: FormData): Promise<CursoResult> {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarCatalogoCapacitaciones(vinculos)) {
    return {
      ok: false,
      error: "Sin permiso para gestionar el catálogo de capacitaciones.",
    };
  }

  const parsed = CursoSchema.safeParse({
    codigo: formData.get("codigo"),
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
    modalidad: formData.get("modalidad") || undefined,
    duracion_horas: formData.get("duracion_horas"),
    instructor_externo: formData.get("instructor_externo") || undefined,
    costo: formData.get("costo"),
    genera_dc3: formData.get("genera_dc3"),
    vigencia_constancia_meses: formData.get("vigencia_constancia_meses"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("capacitaciones").insert({
    ...parsed.data,
    codigo: parsed.data.codigo.toUpperCase(),
    activo: true,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `Ya existe un curso con código ${parsed.data.codigo}.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/personas/capacitaciones");
  return { ok: true, error: null };
}

export async function desactivarCurso(id: string): Promise<CursoResult> {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarCatalogoCapacitaciones(vinculos)) {
    return {
      ok: false,
      error: "Sin permiso.",
    };
  }
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("capacitaciones")
    .update({ activo: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/personas/capacitaciones");
  return { ok: true, error: null };
}

export async function reactivarCurso(id: string): Promise<CursoResult> {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarCatalogoCapacitaciones(vinculos)) {
    return { ok: false, error: "Sin permiso." };
  }
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("capacitaciones")
    .update({ activo: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/personas/capacitaciones");
  return { ok: true, error: null };
}

// ----------------------------------------------------------------------------
// Asignación a empleados
// ----------------------------------------------------------------------------

const AsignarSchema = z.object({
  empleadoId: z.string().uuid(),
  capacitacionId: z.string().uuid(),
  fechaProgramada: z
    .preprocess(
      (v) => (v === "" || v == null ? null : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .nullable(),
    )
    .optional(),
  fechaInicio: z
    .preprocess(
      (v) => (v === "" || v == null ? null : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .nullable(),
    )
    .optional(),
});

export async function asignarCapacitacion(input: {
  empleadoId: string;
  capacitacionId: string;
  fechaProgramada: string | null;
  fechaInicio: string | null;
}): Promise<CursoResult> {
  const parsed = AsignarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  // Resolver empresa del empleado para checar permiso.
  const supabase = createClient();
  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("id", parsed.data.empleadoId)
    .maybeSingle();
  if (!emp) return { ok: false, error: "Empleado no encontrado." };

  const vinculos = await obtenerVinculos();
  if (!puedeAsignarCapacitacionEn(vinculos, emp.empresa_id)) {
    return {
      ok: false,
      error: "Sin permiso para asignar capacitaciones a este empleado.",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("empleados_capacitaciones")
    .insert({
      empleado_id: parsed.data.empleadoId,
      capacitacion_id: parsed.data.capacitacionId,
      fecha_programada: parsed.data.fechaProgramada,
      fecha_inicio: parsed.data.fechaInicio,
      estado: parsed.data.fechaInicio ? "en_proceso" : "inscrito",
    });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/${parsed.data.empleadoId}`);
  return { ok: true, error: null };
}

// ----------------------------------------------------------------------------
// Asignación masiva — un curso a N empleados
// ----------------------------------------------------------------------------

const AsignarMasivoSchema = z.object({
  capacitacionId: z.string().uuid(),
  empleadoIds: z.array(z.string().uuid()).min(1, "Selecciona al menos un empleado."),
  fechaProgramada: z
    .preprocess(
      (v) => (v === "" || v == null ? null : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .nullable(),
    )
    .optional(),
  fechaInicio: z
    .preprocess(
      (v) => (v === "" || v == null ? null : v),
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
        .nullable(),
    )
    .optional(),
});

export type AsignarMasivoResult = {
  ok: boolean;
  insertados: number;
  saltados: number; // ya estaban inscritos al mismo curso
  sinPermiso: number;
  error: string | null;
};

/**
 * Asigna un curso a varios empleados en una sola operación. Útil cuando
 * un curso es para "todos" o un equipo completo.
 *
 * - Verifica permiso por empresa de cada empleado.
 * - Salta empleados que ya tienen este curso en estado inscrito/en_proceso
 *   (no crea duplicados activos).
 */
export async function asignarCapacitacionMasiva(input: {
  capacitacionId: string;
  empleadoIds: string[];
  fechaProgramada: string | null;
  fechaInicio: string | null;
}): Promise<AsignarMasivoResult> {
  const parsed = AsignarMasivoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      insertados: 0,
      saltados: 0,
      sinPermiso: 0,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  // Cargar empresa de cada empleado para chequeo de permiso.
  const { data: empleados, error: empErr } = await supabase
    .from("empleados")
    .select("id, empresa_id")
    .in("id", parsed.data.empleadoIds);
  if (empErr) return {
    ok: false,
    insertados: 0,
    saltados: 0,
    sinPermiso: 0,
    error: empErr.message,
  };

  const empleadoEmpresaMap = new Map<string, string>();
  (empleados ?? []).forEach((e) =>
    empleadoEmpresaMap.set(e.id, e.empresa_id),
  );

  // Separar autorizados vs no autorizados.
  const autorizados: string[] = [];
  let sinPermiso = 0;
  for (const empleadoId of parsed.data.empleadoIds) {
    const empresaId = empleadoEmpresaMap.get(empleadoId);
    if (!empresaId) {
      sinPermiso++;
      continue;
    }
    if (puedeAsignarCapacitacionEn(vinculos, empresaId)) {
      autorizados.push(empleadoId);
    } else {
      sinPermiso++;
    }
  }

  if (autorizados.length === 0) {
    return {
      ok: false,
      insertados: 0,
      saltados: 0,
      sinPermiso,
      error: "No tienes permiso para asignar capacitaciones a ninguno de los seleccionados.",
    };
  }

  // Evitar duplicados: saltar empleados que ya tienen este curso en estado
  // activo (inscrito o en_proceso). Sí permite reinscribir si ya completó/
  // reprobó antes, para recertificaciones.
  const { data: existentes } = await supabase
    .from("empleados_capacitaciones")
    .select("empleado_id")
    .eq("capacitacion_id", parsed.data.capacitacionId)
    .in("empleado_id", autorizados)
    .in("estado", ["inscrito", "en_proceso"]);

  const yaInscritos = new Set(
    (existentes ?? []).map((r) => r.empleado_id),
  );
  const aInsertar = autorizados.filter((id) => !yaInscritos.has(id));
  const saltados = yaInscritos.size;

  if (aInsertar.length === 0) {
    return {
      ok: false,
      insertados: 0,
      saltados,
      sinPermiso,
      error: "Todos los empleados seleccionados ya están inscritos a este curso.",
    };
  }

  const filas = aInsertar.map((empleadoId) => ({
    empleado_id: empleadoId,
    capacitacion_id: parsed.data.capacitacionId,
    fecha_programada: parsed.data.fechaProgramada ?? null,
    fecha_inicio: parsed.data.fechaInicio ?? null,
    estado: parsed.data.fechaInicio ? "en_proceso" : "inscrito",
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insErr } = await (supabase as any)
    .from("empleados_capacitaciones")
    .insert(filas);
  if (insErr) {
    return {
      ok: false,
      insertados: 0,
      saltados,
      sinPermiso,
      error: insErr.message,
    };
  }

  revalidatePath("/personas/capacitaciones");
  // Revalidar también la ficha de cada empleado por si están abiertas.
  for (const empleadoId of aInsertar) {
    revalidatePath(`/personas/${empleadoId}`);
  }

  return {
    ok: true,
    insertados: aInsertar.length,
    saltados,
    sinPermiso,
    error: null,
  };
}

const CompletarSchema = z.object({
  asignacionId: z.string().uuid(),
  fechaFin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  calificacionPost: z
    .preprocess(
      (v) => (v === "" || v == null ? null : Number(v)),
      z.number().min(0).max(100).nullable(),
    )
    .optional(),
  urlConstancia: z
    .preprocess(
      (v) => {
        if (v == null) return null;
        const s = String(v).trim();
        return s === "" ? null : s;
      },
      z.string().max(500).nullable(),
    )
    .optional(),
  estado: z.enum(["completado", "reprobado", "no_asistio"]),
});

export async function completarAsignacion(input: {
  asignacionId: string;
  fechaFin: string;
  calificacionPost?: number | null | string;
  urlConstancia?: string | null;
  estado: "completado" | "reprobado" | "no_asistio";
}): Promise<CursoResult> {
  const parsed = CompletarSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = createClient();
  // Cargar asignación + empresa para checar permiso.
  const { data: asign } = await supabase
    .from("empleados_capacitaciones")
    .select(
      "id, empleado_id, capacitacion_id, empleados(empresa_id), capacitaciones(vigencia_constancia_meses)",
    )
    .eq("id", parsed.data.asignacionId)
    .maybeSingle();
  if (!asign) return { ok: false, error: "Asignación no encontrada." };

  const empresaId = (asign.empleados as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId) return { ok: false, error: "Empresa no resuelta." };

  const vinculos = await obtenerVinculos();
  if (!puedeAsignarCapacitacionEn(vinculos, empresaId)) {
    return { ok: false, error: "Sin permiso." };
  }

  const vigenciaMeses =
    (asign.capacitaciones as { vigencia_constancia_meses: number | null } | null)
      ?.vigencia_constancia_meses ?? null;

  let fechaVencimiento: string | null = null;
  if (parsed.data.estado === "completado" && vigenciaMeses) {
    const d = new Date(parsed.data.fechaFin + "T00:00:00");
    d.setMonth(d.getMonth() + vigenciaMeses);
    fechaVencimiento = d.toISOString().slice(0, 10);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("empleados_capacitaciones")
    .update({
      estado: parsed.data.estado,
      fecha_fin: parsed.data.fechaFin,
      calificacion_post: parsed.data.calificacionPost ?? null,
      url_constancia: parsed.data.urlConstancia ?? null,
      fecha_vencimiento: fechaVencimiento,
    })
    .eq("id", parsed.data.asignacionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/${asign.empleado_id}`);
  return { ok: true, error: null };
}

export async function eliminarAsignacion(
  asignacionId: string,
): Promise<CursoResult> {
  const supabase = createClient();
  const { data: asign } = await supabase
    .from("empleados_capacitaciones")
    .select("id, empleado_id, empleados(empresa_id)")
    .eq("id", asignacionId)
    .maybeSingle();
  if (!asign) return { ok: false, error: "Asignación no encontrada." };

  const empresaId = (asign.empleados as { empresa_id: string } | null)
    ?.empresa_id;
  if (!empresaId) return { ok: false, error: "Empresa no resuelta." };

  const vinculos = await obtenerVinculos();
  if (!puedeAsignarCapacitacionEn(vinculos, empresaId)) {
    return { ok: false, error: "Sin permiso." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("empleados_capacitaciones")
    .delete()
    .eq("id", asignacionId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/${asign.empleado_id}`);
  return { ok: true, error: null };
}

