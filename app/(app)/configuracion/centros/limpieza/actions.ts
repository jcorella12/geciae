"use server";

import { revalidatePath } from "next/cache";

import { puedeGestionarCentrosEn, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export type AsignarBulkResultado = {
  ok: boolean;
  error: string | null;
  asignados: number;
  errores: Array<{ tipo: string; id: string; error: string }>;
};

/**
 * Asigna centro_id (o origen+destino para OT) a múltiples transacciones a la vez.
 * Las transacciones llegan como array de "tipo:id" en el campo "ids".
 *
 * Solo permite cuando el usuario puede gestionar centros en la empresa de la
 * transacción y todas las transacciones son de la misma empresa.
 */
export async function asignarCentroBulk(
  formData: FormData,
): Promise<AsignarBulkResultado> {
  const empty: AsignarBulkResultado = {
    ok: false,
    error: null,
    asignados: 0,
    errores: [],
  };

  const idsRaw = formData.getAll("ids") as string[];
  const centroId = formData.get("centro_id") as string;
  if (!idsRaw || idsRaw.length === 0)
    return { ...empty, error: "Selecciona al menos una transacción." };
  if (!centroId)
    return { ...empty, error: "Selecciona un centro destino." };

  const supabase = createClient();

  // Verificar centro existe + empresa
  const { data: centro } = await supabase
    .from("centros")
    .select("id, empresa_id, tipo")
    .eq("id", centroId)
    .maybeSingle();
  if (!centro) return { ...empty, error: "Centro no encontrado." };

  const v = await obtenerVinculos();
  if (!puedeGestionarCentrosEn(v, centro.empresa_id))
    return { ...empty, error: "Sin permiso en esa empresa." };

  let asignados = 0;
  const errores: AsignarBulkResultado["errores"] = [];

  for (const ref of idsRaw) {
    const [tipo, id] = ref.split(":");
    if (!tipo || !id) {
      errores.push({ tipo: tipo ?? "?", id: id ?? "?", error: "ID mal formado" });
      continue;
    }

    let tabla: string;
    let campo: string;
    if (tipo === "oc") {
      tabla = "ordenes_compra";
      campo = "centro_id";
    } else if (tipo === "ot") {
      // Para OT decidimos por tipo de centro: si es CC → origen, si es CU → destino.
      tabla = "ordenes_trabajo_inter_co";
      campo = centro.tipo === "utilidad" ? "centro_destino_id" : "centro_origen_id";
    } else if (tipo === "cfdi") {
      tabla = "cfdi";
      campo = "centro_id";
    } else if (tipo === "gasto_recurrente") {
      tabla = "gastos_recurrentes";
      campo = "centro_id";
    } else {
      errores.push({ tipo, id, error: `Tipo desconocido: ${tipo}` });
      continue;
    }

    // Verificar empresa del registro = empresa del centro
    const empresaCol = tipo === "ot" ? "empresa_origen_id" : "empresa_id";
    const { data: row } = await supabase
      .from(tabla as never)
      .select(`id, ${empresaCol}`)
      .eq("id", id)
      .maybeSingle();
    if (!row) {
      errores.push({ tipo, id, error: "Registro no encontrado" });
      continue;
    }
    const empresaRow = (row as Record<string, unknown>)[empresaCol] as string;
    if (empresaRow !== centro.empresa_id) {
      errores.push({
        tipo,
        id,
        error: "Empresa no coincide con la del centro",
      });
      continue;
    }

    const { error } = await supabase
      .from(tabla as never)
      .update({ [campo]: centroId } as never)
      .eq("id", id);
    if (error) {
      errores.push({ tipo, id, error: error.message });
    } else {
      asignados++;
    }
  }

  revalidatePath("/configuracion/centros/limpieza");
  return {
    ok: asignados > 0,
    error: asignados === 0 && errores.length > 0 ? "Ninguna asignación tuvo éxito" : null,
    asignados,
    errores,
  };
}
