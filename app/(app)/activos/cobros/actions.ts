"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

async function gateEmisor(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  if (esCEO(v)) return true;
  if (tieneAtributo(v, "tesorero_corporativo")) return true;
  if (esRolEn(v, empresaId, ["director"])) return true;
  return v.some(
    (vi) =>
      vi.empresa_id === empresaId &&
      (vi.atributos ?? []).includes("contralor"),
  );
}

export async function facturarPrestamo(
  prestamoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: p } = (await supabase
    .from("prestamos_activos" as never)
    .select(
      "id, estado, costo_total, empresa_solicitante_id, empresa_propietaria_id, centro_destino_id, motivo, numero" as never,
    )
    .eq("id", prestamoId)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      estado: string;
      costo_total: number;
      empresa_solicitante_id: string;
      empresa_propietaria_id: string;
      centro_destino_id: string | null;
      motivo: string;
      numero: string;
    } | null;
  };
  if (!p) return { ok: false, error: "No encontrado." };
  if (p.estado !== "devuelto") return { ok: false, error: "Solo préstamos devueltos." };
  if (!(await gateEmisor(p.empresa_propietaria_id))) return { ok: false, error: "Sin permiso." };

  // CU "Renta de Activos" de empresa propietaria
  const { data: cuIngreso } = (await supabase
    .from("centros" as never)
    .select("id" as never)
    .eq("empresa_id", p.empresa_propietaria_id)
    .eq("codigo", "CU-RENTA-ACTIVOS")
    .maybeSingle()) as unknown as {
    data: { id: string } | null;
  };

  // Crear movimientos en centros: gasto en solicitante + ingreso en propietaria
  const monto = Number(p.costo_total ?? 0);
  if (monto > 0) {
    const insertGasto: Record<string, unknown> = {
      empresa_id: p.empresa_solicitante_id,
      centro_id: p.centro_destino_id,
      tipo: "gasto",
      monto,
      concepto: `Préstamo activo ${p.numero}: ${p.motivo}`,
      fecha: new Date().toISOString().slice(0, 10),
      origen_tabla: "prestamos_activos",
      origen_id: p.id,
      capturado_por: user.id,
    };

    const insertIngreso: Record<string, unknown> = {
      empresa_id: p.empresa_propietaria_id,
      centro_id: cuIngreso?.id ?? null,
      tipo: "ingreso",
      monto,
      concepto: `Renta activo ${p.numero}: ${p.motivo}`,
      fecha: new Date().toISOString().slice(0, 10),
      origen_tabla: "prestamos_activos",
      origen_id: p.id,
      capturado_por: user.id,
    };

    if (p.centro_destino_id) {
      await supabase.from("centros_movimientos" as never).insert(insertGasto as never);
    }
    if (cuIngreso?.id) {
      await supabase.from("centros_movimientos" as never).insert(insertIngreso as never);
    }
  }

  await supabase
    .from("prestamos_activos" as never)
    .update({ estado: "facturado" } as never)
    .eq("id", prestamoId);

  revalidatePath(`/activos/prestamos/${prestamoId}`);
  revalidatePath("/activos/cobros");
  return { ok: true, error: null };
}

export async function generarCfdiConsolidado(
  empresaEmisoraId: string,
  empresaReceptoraId: string,
  anio: number,
  mes: number,
): Promise<{ ok: boolean; id: string | null; error: string | null }> {
  if (!(await gateEmisor(empresaEmisoraId))) {
    return { ok: false, id: null, error: "Sin permiso." };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, id: null, error: "Sin sesión." };

  const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hastaDate = new Date(anio, mes, 1);
  const hasta = hastaDate.toISOString().slice(0, 10);

  const { data: prestamos } = (await supabase
    .from("prestamos_activos" as never)
    .select("id, costo_total, fecha_devolucion_real" as never)
    .eq("estado", "facturado")
    .eq("empresa_solicitante_id", empresaReceptoraId)
    .eq("empresa_propietaria_id", empresaEmisoraId)
    .is("cfdi_consolidado_id", null)
    .gte("fecha_devolucion_real", desde)
    .lt("fecha_devolucion_real", hasta)) as unknown as {
    data: Array<{ id: string; costo_total: number }> | null;
  };

  if (!prestamos || prestamos.length === 0) {
    return { ok: false, id: null, error: "Sin préstamos pendientes en ese periodo." };
  }

  const subtotal = prestamos.reduce((acc, p) => acc + Number(p.costo_total ?? 0), 0);
  const iva = Math.round(subtotal * 0.16 * 100) / 100;
  const total = Math.round((subtotal + iva) * 100) / 100;

  const numero = `CCA-${anio}-${String(mes).padStart(2, "0")}-${empresaEmisoraId.slice(0, 4).toUpperCase()}-${empresaReceptoraId.slice(0, 4).toUpperCase()}`;

  const { data: cons, error } = await supabase
    .from("cfdi_consolidado_activos" as never)
    .insert({
      numero,
      empresa_emisora_id: empresaEmisoraId,
      empresa_receptora_id: empresaReceptoraId,
      periodo_anio: anio,
      periodo_mes: mes,
      num_prestamos: prestamos.length,
      subtotal,
      iva,
      total,
      estado: "borrador",
      generado_por: user.id,
    } as never)
    .select("id")
    .single();
  if (error) return { ok: false, id: null, error: error.message };

  const ids = prestamos.map((p) => p.id);
  await supabase
    .from("prestamos_activos" as never)
    .update({ cfdi_consolidado_id: (cons as { id: string }).id, facturado_en_periodo: `${anio}-${mes}` } as never)
    .in("id", ids);

  revalidatePath("/activos/cobros");
  return { ok: true, id: (cons as { id: string }).id, error: null };
}
