"use server";

import { revalidatePath } from "next/cache";

import {
  empresasDondeCreaOC,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export type ImportRow = {
  numero: string;
  empresa_codigo: string;
  rfc_proveedor: string;
  fecha_emision: string;
  fecha_entrega_esperada?: string;
  proyecto_codigo?: string;
  total: number;
  subtotal?: number;
  iva?: number;
  estado: string;
  comentarios?: string;
};

export type ImportResult = {
  ok: boolean;
  total: number;
  insertados: number;
  duplicados: number;
  errores: number;
  detalleErrores: Array<{ row: number; motivo: string }>;
};

export async function importarOCsBatch(
  rows: ImportRow[],
): Promise<ImportResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      total: 0,
      insertados: 0,
      duplicados: 0,
      errores: rows.length,
      detalleErrores: [{ row: 0, motivo: "Sin sesión." }],
    };
  }

  const v = await obtenerVinculos();
  const empresasPermitidas = empresasDondeCreaOC(v);

  // Cargar catálogos de referencia
  const [{ data: empresas }, { data: proveedores }, { data: proyectos }] =
    await Promise.all([
      supabase.from("empresas").select("id, codigo"),
      supabase.from("proveedores").select("id, rfc"),
      supabase.from("proyectos").select("id, codigo, empresa_id"),
    ]);
  const empresaByCode = new Map(
    (empresas ?? []).map((e) => [e.codigo.toUpperCase(), e]),
  );
  const provByRfc = new Map(
    (proveedores ?? []).map((p) => [p.rfc.toUpperCase(), p]),
  );
  const proyByKey = new Map(
    (proyectos ?? []).map((p) => [
      `${p.empresa_id}:${p.codigo.toUpperCase()}`,
      p,
    ]),
  );

  // Detectar OCs ya existentes (por numero+empresa) para no duplicar
  const numeros = rows.map((r) => r.numero).filter(Boolean);
  const { data: existentes } = await supabase
    .from("ordenes_compra")
    .select("numero, empresa_id")
    .in("numero", numeros);
  const yaExisten = new Set(
    (existentes ?? []).map((e) => `${e.empresa_id}:${e.numero}`),
  );

  const insertables: Array<Record<string, unknown>> = [];
  const detalleErrores: Array<{ row: number; motivo: string }> = [];
  let duplicados = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.numero) {
      detalleErrores.push({ row: i + 2, motivo: "Falta número de OC" });
      continue;
    }
    const empresa = empresaByCode.get((r.empresa_codigo ?? "").toUpperCase());
    if (!empresa) {
      detalleErrores.push({
        row: i + 2,
        motivo: `Empresa no encontrada: ${r.empresa_codigo}`,
      });
      continue;
    }
    if (!empresasPermitidas.includes(empresa.id)) {
      detalleErrores.push({
        row: i + 2,
        motivo: `Sin permiso para crear OC en ${empresa.codigo}`,
      });
      continue;
    }
    const proveedor = provByRfc.get((r.rfc_proveedor ?? "").toUpperCase());
    if (!proveedor) {
      detalleErrores.push({
        row: i + 2,
        motivo: `Proveedor no encontrado por RFC: ${r.rfc_proveedor}`,
      });
      continue;
    }
    if (yaExisten.has(`${empresa.id}:${r.numero}`)) {
      duplicados += 1;
      continue;
    }
    let proyectoId: string | null = null;
    if (r.proyecto_codigo) {
      const proy = proyByKey.get(
        `${empresa.id}:${r.proyecto_codigo.toUpperCase()}`,
      );
      if (proy) proyectoId = proy.id;
    }

    insertables.push({
      empresa_id: empresa.id,
      proveedor_id: proveedor.id,
      proyecto_id: proyectoId,
      numero: r.numero,
      fecha_emision: r.fecha_emision,
      fecha_entrega_esperada: r.fecha_entrega_esperada || null,
      subtotal: r.subtotal ?? r.total / 1.16,
      iva: r.iva ?? r.total - (r.subtotal ?? r.total / 1.16),
      total: r.total,
      estado: (r.estado || "borrador") as never,
      comentarios: r.comentarios || null,
      capturado_por: user.id,
    });
  }

  let insertados = 0;
  if (insertables.length > 0) {
    // Insertar en batches de 100
    for (let i = 0; i < insertables.length; i += 100) {
      const chunk = insertables.slice(i, i + 100);
      const { error } = await supabase
        .from("ordenes_compra")
        .insert(chunk as never);
      if (error) {
        detalleErrores.push({
          row: -1,
          motivo: `Error batch ${i / 100 + 1}: ${error.message}`,
        });
      } else {
        insertados += chunk.length;
      }
    }
  }

  revalidatePath("/finanzas/oc");
  return {
    ok: detalleErrores.length === 0,
    total: rows.length,
    insertados,
    duplicados,
    errores: detalleErrores.length,
    detalleErrores: detalleErrores.slice(0, 50),
  };
}
