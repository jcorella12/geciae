"use server";

import { revalidatePath } from "next/cache";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

/**
 * S3-T6 — Vincula un movimiento bancario sugerido a un CFDI.
 *
 * Lógica:
 * 1. Lee el monto del movimiento y el saldo pendiente del CFDI.
 * 2. Aplica el menor de los dos como pago (manual=TRUE, sin idempotency
 *    porque viene de una sugerencia explícita del usuario).
 * 3. Marca el movimiento como `conciliado=TRUE` con FK al CFDI.
 * 4. Si el CFDI quedó totalmente pagado, marca estado=pagado.
 */
export async function vincularMovimientoACfdi(input: {
  cfdiId: string;
  movimientoId: string;
}): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();

  // Permiso simple: el caller debe poder ver el CFDI (RLS lo gates).
  const v = await obtenerVinculos();
  if (v.length === 0) return { ok: false, error: "Sin sesión." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cfdi } = await (supabase as any)
    .from("cfdi")
    .select("id, total, monto_pagado, estado, empresa_id")
    .eq("id", input.cfdiId)
    .maybeSingle();
  if (!cfdi) return { ok: false, error: "CFDI no encontrado." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mov } = await (supabase as any)
    .from("bancos_movimientos")
    .select("id, monto, fecha, conciliado, cuenta_id")
    .eq("id", input.movimientoId)
    .maybeSingle();
  if (!mov) return { ok: false, error: "Movimiento no encontrado." };
  if (mov.conciliado) {
    return { ok: false, error: "Este movimiento ya está conciliado." };
  }

  const total = Number(cfdi.total ?? 0);
  const yaPagado = Number(cfdi.monto_pagado ?? 0);
  const saldo = total - yaPagado;
  const montoMovAbs = Math.abs(Number(mov.monto));
  const montoAplicar = Math.min(montoMovAbs, saldo);

  if (montoAplicar <= 0.01) {
    return { ok: false, error: "El CFDI ya está totalmente pagado." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Insertar registro en cfdi_pagos (manual=FALSE — viene de match
  //    bancario, tiene FK al movimiento).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: pagoErr } = await (supabase as any)
    .from("cfdi_pagos")
    .insert({
      cfdi_id: null,
      cfdi_pagado_id: input.cfdiId,
      fecha_pago: mov.fecha,
      forma_pago: "03", // Transferencia (asumimos para bancos)
      moneda: "MXN",
      monto: montoAplicar,
      manual: true,
      registrado_por: user?.id ?? null,
      observaciones: `Auto-conciliación con movimiento bancario ${input.movimientoId}`,
    });
  if (pagoErr) return { ok: false, error: pagoErr.message };

  const nuevoPagado = yaPagado + montoAplicar;
  const totalmentePagado = nuevoPagado >= total - 0.01;

  // 2) Actualizar CFDI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updPayload: any = { monto_pagado: nuevoPagado };
  if (totalmentePagado) {
    updPayload.fecha_pago = mov.fecha;
    updPayload.estado = "pagado";
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("cfdi")
    .update(updPayload)
    .eq("id", input.cfdiId);

  // 3) Marcar movimiento conciliado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("bancos_movimientos")
    .update({
      conciliado: true,
      cfdi_id: input.cfdiId,
    })
    .eq("id", input.movimientoId);

  revalidatePath(`/finanzas/cfdi/${input.cfdiId}`);
  revalidatePath(`/finanzas/tesoreria/cuentas/${mov.cuenta_id}`);
  return { ok: true, error: null };
}
