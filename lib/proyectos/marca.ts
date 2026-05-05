import { createClient } from "@/lib/supabase/server";

export type EmpresaMarca = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
  rfc: string;
  email_principal?: string | null;
  telefono_principal?: string | null;
  direccion?: string | null;
};

/**
 * Resuelve la empresa cuya marca debe mostrarse al cliente para un proyecto
 * dado. Usa marca_visible_id si está set; si no, cae a empresa_id.
 *
 * Útil para:
 *  - Generación de cotizaciones (logo + razón social comercial visible)
 *  - Contratos (encabezado con marca, pie con empresa fiscal cuando aplique)
 *  - Reportes mensuales al cliente
 *
 * NO se usa para CFDIs — esos siempre se emiten con la empresa fiscal
 * (proyectos.empresa_id), nunca la marca.
 */
export async function resolverMarcaProyecto(
  proyectoId: string,
): Promise<EmpresaMarca | null> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("proyectos")
    .select("empresa_id, marca_visible_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!p) return null;

  const empresaId =
    (p.marca_visible_id as string | null) ??
    (p.empresa_id as string);

  const { data: e } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial, rfc")
    .eq("id", empresaId)
    .maybeSingle();
  if (!e) return null;

  return {
    id: e.id,
    codigo: e.codigo,
    razon_social: e.razon_social,
    nombre_comercial: e.nombre_comercial,
    rfc: e.rfc,
  };
}

/**
 * Resuelve marca visible para una cotización. Las cotizaciones todavía no
 * tienen FK directo a proyecto, así que cae a empresa_id de la cotización.
 * Cuando la cotización se promueve a proyecto, el proyecto resultante sí
 * tiene marca_visible_id (default = empresa_id) y a partir de ahí se usa
 * resolverMarcaProyecto.
 */
export async function resolverMarcaCotizacion(
  cotizacionId: string,
): Promise<EmpresaMarca | null> {
  const supabase = createClient();
  const { data: c } = await supabase
    .from("cotizaciones")
    .select("empresa_id")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!c) return null;

  const { data: e } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial, rfc")
    .eq("id", c.empresa_id as string)
    .maybeSingle();
  if (!e) return null;

  return {
    id: e.id,
    codigo: e.codigo,
    razon_social: e.razon_social,
    nombre_comercial: e.nombre_comercial,
    rfc: e.rfc,
  };
}

/**
 * Helper para componentes UI que muestran encabezados de documentos:
 * devuelve la marca visible y, si difiere de la empresa fiscal, también la
 * empresa fiscal (para footer "Operado por X bajo marca Y").
 */
export async function resolverEncabezadoDocumento(
  proyectoId: string,
): Promise<{
  marca: EmpresaMarca | null;
  empresaFiscal: EmpresaMarca | null;
  difieren: boolean;
}> {
  const supabase = createClient();
  const { data: p } = await supabase
    .from("proyectos")
    .select("empresa_id, marca_visible_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!p)
    return { marca: null, empresaFiscal: null, difieren: false };

  const fiscalId = p.empresa_id as string;
  const marcaId = (p.marca_visible_id as string | null) ?? fiscalId;
  const difieren = fiscalId !== marcaId;

  const ids = difieren ? [fiscalId, marcaId] : [fiscalId];
  const { data: emps } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial, rfc")
    .in("id", ids);

  const map = new Map(
    (emps ?? []).map((e) => [
      e.id,
      {
        id: e.id,
        codigo: e.codigo,
        razon_social: e.razon_social,
        nombre_comercial: e.nombre_comercial,
        rfc: e.rfc,
      } as EmpresaMarca,
    ]),
  );

  return {
    marca: map.get(marcaId) ?? null,
    empresaFiscal: map.get(fiscalId) ?? null,
    difieren,
  };
}
