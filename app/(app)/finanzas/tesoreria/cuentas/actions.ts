"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  obtenerVinculos,
  esCEO,
  esRolEn,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

const CuentaSchema = z.object({
  empresa_id: z.string().uuid(),
  banco: z.string().trim().min(2).max(60),
  numero_cuenta: z.string().trim().min(3).max(40),
  clabe: z
    .string()
    .trim()
    .regex(/^\d{18}$/, "CLABE debe ser 18 dígitos")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  alias: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  tipo: z
    .enum(["cheques", "ahorro", "inversion"])
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  saldo_inicial: z.coerce.number().default(0),
});

export type CuentaState = {
  ok: boolean;
  error: string | null;
};

export const initialCuentaState: CuentaState = { ok: false, error: null };

function gateBancos(
  vinculos: Awaited<ReturnType<typeof obtenerVinculos>>,
  empresaId: string,
): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    esRolEn(vinculos, empresaId, "director")
  );
}

export async function crearCuenta(
  _prev: CuentaState,
  formData: FormData,
): Promise<CuentaState> {
  const parsed = CuentaSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    banco: formData.get("banco"),
    numero_cuenta: formData.get("numero_cuenta"),
    clabe: formData.get("clabe") || undefined,
    alias: formData.get("alias") || undefined,
    tipo: formData.get("tipo") || undefined,
    saldo_inicial: formData.get("saldo_inicial") || 0,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const v = await obtenerVinculos();
  if (!gateBancos(v, d.empresa_id)) {
    return {
      ok: false,
      error:
        "Sin permiso (requiere CEO, tesorero corporativo o director de la empresa).",
    };
  }
  const supabase = createClient();
  const { error } = await supabase.from("bancos_cuentas").insert({
    empresa_id: d.empresa_id,
    banco: d.banco,
    numero_cuenta: d.numero_cuenta,
    clabe: d.clabe,
    alias: d.alias,
    tipo: d.tipo,
    moneda: "MXN",
    saldo_actual: d.saldo_inicial,
    fecha_actualizacion_saldo: new Date().toISOString(),
    activa: true,
  });
  if (error) {
    return { ok: false, error: `Error: ${error.message}` };
  }
  revalidatePath("/finanzas/tesoreria");
  revalidatePath("/finanzas/tesoreria/cuentas");
  return { ok: true, error: null };
}

export async function actualizarSaldo(
  cuentaId: string,
  nuevoSaldo: number,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: cuenta } = await supabase
    .from("bancos_cuentas")
    .select("empresa_id")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!cuenta) return { ok: false, error: "Cuenta no encontrada." };
  const v = await obtenerVinculos();
  if (!gateBancos(v, cuenta.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("bancos_cuentas")
    .update({
      saldo_actual: nuevoSaldo,
      fecha_actualizacion_saldo: new Date().toISOString(),
    })
    .eq("id", cuentaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/tesoreria");
  revalidatePath("/finanzas/tesoreria/cuentas");
  return { ok: true, error: null };
}

export async function toggleCuentaActiva(
  cuentaId: string,
  proxima: boolean,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: cuenta } = await supabase
    .from("bancos_cuentas")
    .select("empresa_id")
    .eq("id", cuentaId)
    .maybeSingle();
  if (!cuenta) return { ok: false, error: "Cuenta no encontrada." };
  const v = await obtenerVinculos();
  if (!gateBancos(v, cuenta.empresa_id)) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await supabase
    .from("bancos_cuentas")
    .update({ activa: proxima })
    .eq("id", cuentaId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/finanzas/tesoreria");
  revalidatePath("/finanzas/tesoreria/cuentas");
  return { ok: true, error: null };
}
