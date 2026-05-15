"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  obtenerVinculos,
  puedeGestionarEmpleadosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import type { FiniquitoConcepto, FiniquitoResult } from "./state";

const ConceptoSchema = z.object({
  key: z.string().min(1).max(80),
  label: z.string().min(1).max(120),
  monto: z.number(),
  detalle: z.string().optional(),
});

const CrearSchema = z.object({
  empleadoId: z.string().uuid(),
  fechaBaja: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivoBaja: z.string().min(2).max(100),
  caminoCierre: z.enum(["privada", "reforzada", "ratificada"]),
  conceptos: z.array(ConceptoSchema).min(1),
  observaciones: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null)),
});

async function permisoEmpleado(empleadoId: string): Promise<{
  empresaId: string;
  vinculos: Awaited<ReturnType<typeof obtenerVinculos>>;
}> {
  const supabase = createClient();
  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("id", empleadoId)
    .maybeSingle();
  if (!emp) throw new Error("Empleado no encontrado.");
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarEmpleadosEn(vinculos, emp.empresa_id)) {
    throw new Error("Sin permiso para gestionar este empleado.");
  }
  return { empresaId: emp.empresa_id, vinculos };
}

export async function crearFiniquito(input: {
  empleadoId: string;
  fechaBaja: string;
  motivoBaja: string;
  caminoCierre: "privada" | "reforzada" | "ratificada";
  conceptos: FiniquitoConcepto[];
  observaciones?: string | null;
}): Promise<FiniquitoResult> {
  try {
    await permisoEmpleado(input.empleadoId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  const parsed = CrearSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const totalNeto = parsed.data.conceptos.reduce(
    (acc, c) => acc + Number(c.monto || 0),
    0,
  );

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("finiquitos")
    .insert({
      empleado_id: parsed.data.empleadoId,
      fecha_baja: parsed.data.fechaBaja,
      motivo_baja: parsed.data.motivoBaja,
      camino_cierre: parsed.data.caminoCierre,
      conceptos: parsed.data.conceptos,
      total_neto: Math.round(totalNeto * 100) / 100,
      observaciones: parsed.data.observaciones,
      estado: "borrador",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath("/personas/finiquitos");
  revalidatePath(`/personas/${parsed.data.empleadoId}`);
  return { ok: true, error: null, id: data?.id };
}

const ActualizarConceptosSchema = z.object({
  finiquitoId: z.string().uuid(),
  conceptos: z.array(ConceptoSchema).min(1),
  observaciones: z
    .string()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null))
    .nullable(),
  motivoBaja: z.string().min(2).max(100).optional(),
  caminoCierre: z
    .enum(["privada", "reforzada", "ratificada"])
    .optional(),
});

export async function actualizarFiniquito(input: {
  finiquitoId: string;
  conceptos: FiniquitoConcepto[];
  observaciones?: string | null;
  motivoBaja?: string;
  caminoCierre?: "privada" | "reforzada" | "ratificada";
}): Promise<FiniquitoResult> {
  const parsed = ActualizarConceptosSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = createClient();
  const { data: fin } = await supabase
    .from("finiquitos")
    .select("empleado_id, estado")
    .eq("id", parsed.data.finiquitoId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Finiquito no encontrado." };
  if (fin.estado !== "borrador") {
    return {
      ok: false,
      error: "Solo finiquitos en borrador pueden editarse.",
    };
  }

  try {
    await permisoEmpleado(fin.empleado_id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  const totalNeto = parsed.data.conceptos.reduce(
    (acc, c) => acc + Number(c.monto || 0),
    0,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: any = {
    conceptos: parsed.data.conceptos,
    total_neto: Math.round(totalNeto * 100) / 100,
    observaciones: parsed.data.observaciones,
  };
  if (parsed.data.motivoBaja) patch.motivo_baja = parsed.data.motivoBaja;
  if (parsed.data.caminoCierre) patch.camino_cierre = parsed.data.caminoCierre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("finiquitos")
    .update(patch)
    .eq("id", parsed.data.finiquitoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/finiquitos/${parsed.data.finiquitoId}`);
  return { ok: true, error: null };
}

export async function aprobarFiniquito(
  finiquitoId: string,
): Promise<FiniquitoResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado." };

  const { data: fin } = await supabase
    .from("finiquitos")
    .select("empleado_id, estado")
    .eq("id", finiquitoId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Finiquito no encontrado." };
  if (fin.estado !== "borrador") {
    return {
      ok: false,
      error: "Solo finiquitos en borrador pueden aprobarse.",
    };
  }

  try {
    await permisoEmpleado(fin.empleado_id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("finiquitos")
    .update({
      estado: "aprobado",
      aprobado_por: user.id,
    })
    .eq("id", finiquitoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/finiquitos/${finiquitoId}`);
  revalidatePath("/personas/finiquitos");
  return { ok: true, error: null };
}

export async function marcarPagado(
  finiquitoId: string,
  fechaPago: string,
): Promise<FiniquitoResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
    return { ok: false, error: "Fecha de pago inválida." };
  }

  const supabase = createClient();
  const { data: fin } = await supabase
    .from("finiquitos")
    .select("empleado_id, estado")
    .eq("id", finiquitoId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Finiquito no encontrado." };
  if (fin.estado !== "aprobado") {
    return {
      ok: false,
      error: "Solo finiquitos aprobados pueden marcarse como pagados.",
    };
  }

  try {
    await permisoEmpleado(fin.empleado_id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("finiquitos")
    .update({ estado: "pagado", fecha_pago: fechaPago })
    .eq("id", finiquitoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/finiquitos/${finiquitoId}`);
  revalidatePath("/personas/finiquitos");
  return { ok: true, error: null };
}

export async function marcarRatificado(
  finiquitoId: string,
): Promise<FiniquitoResult> {
  const supabase = createClient();
  const { data: fin } = await supabase
    .from("finiquitos")
    .select("empleado_id, estado, camino_cierre")
    .eq("id", finiquitoId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Finiquito no encontrado." };
  if (fin.estado !== "pagado") {
    return {
      ok: false,
      error:
        "Solo finiquitos pagados pueden marcarse como ratificados ante CCL.",
    };
  }

  try {
    await permisoEmpleado(fin.empleado_id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("finiquitos")
    .update({ estado: "ratificado", camino_cierre: "ratificada" })
    .eq("id", finiquitoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/finiquitos/${finiquitoId}`);
  revalidatePath("/personas/finiquitos");
  return { ok: true, error: null };
}

export async function eliminarFiniquito(
  finiquitoId: string,
): Promise<FiniquitoResult> {
  const supabase = createClient();
  const { data: fin } = await supabase
    .from("finiquitos")
    .select("empleado_id, estado")
    .eq("id", finiquitoId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Finiquito no encontrado." };
  if (fin.estado !== "borrador") {
    return {
      ok: false,
      error: "Solo finiquitos en borrador pueden eliminarse.",
    };
  }

  try {
    const { vinculos } = await permisoEmpleado(fin.empleado_id);
    // Solo CEO puede eliminar (defensa extra).
    if (!esCEO(vinculos)) {
      return {
        ok: false,
        error: "Solo CEO puede eliminar finiquitos.",
      };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("finiquitos")
    .delete()
    .eq("id", finiquitoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/personas/finiquitos");
  return { ok: true, error: null };
}

const SubirArchivoSchema = z.object({
  finiquitoId: z.string().uuid(),
  tipo: z.enum(["convenio_terminacion", "recibo_finiquito"]),
  url: z.string().min(1).max(500),
});

export async function adjuntarArchivo(input: {
  finiquitoId: string;
  tipo: "convenio_terminacion" | "recibo_finiquito";
  url: string;
}): Promise<FiniquitoResult> {
  const parsed = SubirArchivoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }

  const supabase = createClient();
  const { data: fin } = await supabase
    .from("finiquitos")
    .select("empleado_id")
    .eq("id", parsed.data.finiquitoId)
    .maybeSingle();
  if (!fin) return { ok: false, error: "Finiquito no encontrado." };

  try {
    await permisoEmpleado(fin.empleado_id);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Sin permiso",
    };
  }

  const col =
    parsed.data.tipo === "convenio_terminacion"
      ? "url_convenio_terminacion"
      : "url_recibo_finiquito";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("finiquitos")
    .update({ [col]: parsed.data.url })
    .eq("id", parsed.data.finiquitoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/finiquitos/${parsed.data.finiquitoId}`);
  return { ok: true, error: null };
}
