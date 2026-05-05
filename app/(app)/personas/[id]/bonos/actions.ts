"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  esCEO,
  obtenerVinculos,
  esRolEn,
} from "@/lib/auth/permisos";
import {
  initialBonoState,
  TIPOS_BONO,
  type BonoState,
} from "@/lib/portal-empleado/state";
import { createClient } from "@/lib/supabase/server";

const CrearBonoSchema = z.object({
  empleado_id: z.string().uuid(),
  fecha_pago: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  tipo: z.enum(TIPOS_BONO as [string, ...string[]]),
  concepto: z.string().trim().min(3).max(200),
  monto: z.coerce.number().positive("Monto debe ser > 0"),
  motivo: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  comprobante_url: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});

async function gateBono(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (!esCEO(v) && !esRolEn(v, empresaId, "director"))
    return {
      ok: false,
      error: "Sin permiso (CEO o director de la empresa).",
    };
  return { ok: true };
}

export async function crearBonoManual(
  _prev: BonoState,
  formData: FormData,
): Promise<BonoState> {
  const parsed = CrearBonoSchema.safeParse({
    empleado_id: formData.get("empleado_id"),
    fecha_pago: formData.get("fecha_pago"),
    tipo: formData.get("tipo"),
    concepto: formData.get("concepto"),
    monto: formData.get("monto"),
    motivo: formData.get("motivo") ?? "",
    comprobante_url: formData.get("comprobante_url") ?? "",
  });
  if (!parsed.success) {
    return {
      ...initialBonoState,
      error: "Revisa los campos.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = createClient();

  // Obtener empresa_id del empleado
  const { data: emp } = await supabase
    .from("empleados")
    .select("empresa_id")
    .eq("id", parsed.data.empleado_id)
    .maybeSingle();
  if (!emp) return { ...initialBonoState, error: "Empleado no encontrado." };

  const gate = await gateBono(emp.empresa_id);
  if (!gate.ok) return { ...initialBonoState, error: gate.error };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...initialBonoState, error: "Sin sesión." };

  const { error } = await supabase.from("empleado_bonos_manuales").insert({
    empresa_id: emp.empresa_id,
    empleado_id: parsed.data.empleado_id,
    fecha_pago: parsed.data.fecha_pago,
    tipo: parsed.data.tipo as never,
    concepto: parsed.data.concepto,
    monto: parsed.data.monto,
    motivo: parsed.data.motivo,
    comprobante_url: parsed.data.comprobante_url,
    autorizado_por: user.id,
    timbrado: false,
  });
  if (error) return { ...initialBonoState, error: error.message };

  revalidatePath(`/personas/${parsed.data.empleado_id}`);
  revalidatePath("/portal-empleado");
  return { ok: true, error: null };
}

export async function eliminarBonoManual(
  bonoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: bono } = await supabase
    .from("empleado_bonos_manuales")
    .select("empresa_id, empleado_id")
    .eq("id", bonoId)
    .maybeSingle();
  if (!bono) return { ok: false, error: "Bono no encontrado." };

  const gate = await gateBono(bono.empresa_id);
  if (!gate.ok) return { ok: false, error: gate.error };

  const { error } = await supabase
    .from("empleado_bonos_manuales")
    .delete()
    .eq("id", bonoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/personas/${bono.empleado_id}`);
  revalidatePath("/portal-empleado");
  return { ok: true, error: null };
}
