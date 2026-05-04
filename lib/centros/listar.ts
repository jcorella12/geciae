import { createClient } from "@/lib/supabase/server";

export type CentroOpcion = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  tipo: "costo" | "utilidad";
  subtipo: string;
};

/**
 * Lista centros activos para usar en selectores. RLS filtra por empresa.
 * Si se pasa empresaId, filtra a esa empresa específicamente.
 */
export async function listarCentrosActivos(
  empresaId?: string,
): Promise<CentroOpcion[]> {
  const supabase = createClient();
  let query = supabase
    .from("centros")
    .select("id, empresa_id, codigo, nombre, tipo, subtipo")
    .eq("activo", true)
    .order("codigo");
  if (empresaId) query = query.eq("empresa_id", empresaId);
  const { data } = await query;
  return ((data ?? []) as CentroOpcion[]).map((c) => ({
    id: c.id,
    empresa_id: c.empresa_id,
    codigo: c.codigo,
    nombre: c.nombre,
    tipo: c.tipo as "costo" | "utilidad",
    subtipo: c.subtipo,
  }));
}
