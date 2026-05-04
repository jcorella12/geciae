import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type CmdkResult = {
  group: "PROYECTOS" | "OC" | "CFDI" | "CLIENTES" | "TICKETS" | "VEHICULOS" | "OPORTUNIDADES";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  refCode?: string;
};

/**
 * GET /api/cmdk?q=texto
 * Búsqueda fuzzy global para el command palette.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createClient();
  const results: CmdkResult[] = [];
  const ilike = `%${q}%`;

  const [
    { data: proyectos },
    { data: ocs },
    { data: clientes },
    { data: tickets },
    { data: oportunidades },
  ] = await Promise.all([
    supabase
      .from("proyectos")
      .select("id, codigo, nombre, empresas(codigo)")
      .or(`codigo.ilike.${ilike},nombre.ilike.${ilike}`)
      .limit(8),
    supabase
      .from("ordenes_compra")
      .select("id, numero, total, proveedores(razon_social)")
      .or(`numero.ilike.${ilike},comentarios.ilike.${ilike}`)
      .limit(8),
    supabase
      .from("clientes")
      .select("id, razon_social, rfc, nombre_comercial")
      .or(
        `razon_social.ilike.${ilike},rfc.ilike.${ilike},nombre_comercial.ilike.${ilike}`,
      )
      .limit(8),
    supabase
      .from("tickets_soporte")
      .select("id, numero, asunto, clientes(razon_social)")
      .or(`numero.ilike.${ilike},asunto.ilike.${ilike}`)
      .limit(6),
    supabase
      .from("oportunidades")
      .select("id, nombre, monto_estimado, clientes(razon_social)")
      .ilike("nombre", ilike)
      .limit(6),
  ]);

  for (const p of proyectos ?? []) {
    const emp = p.empresas as { codigo: string } | null;
    results.push({
      group: "PROYECTOS",
      id: `proyecto:${p.id}`,
      title: p.nombre,
      subtitle: `${emp?.codigo ?? ""} · ${p.codigo}`,
      href: `/proyectos/${p.id}`,
      refCode: `proyecto:${p.id}`,
    });
  }
  for (const o of ocs ?? []) {
    const prov = o.proveedores as { razon_social: string } | null;
    results.push({
      group: "OC",
      id: `oc:${o.id}`,
      title: o.numero,
      subtitle: `${prov?.razon_social ?? "—"} · ${Number(o.total ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })}`,
      href: `/finanzas/oc/${o.id}`,
      refCode: `oc:${o.id}`,
    });
  }
  for (const c of clientes ?? []) {
    results.push({
      group: "CLIENTES",
      id: `cliente:${c.id}`,
      title: c.razon_social,
      subtitle: `${c.rfc}${c.nombre_comercial ? ` · ${c.nombre_comercial}` : ""}`,
      href: `/clientes/${c.id}`,
      refCode: `cliente:${c.id}`,
    });
  }
  for (const t of tickets ?? []) {
    const cli = t.clientes as { razon_social: string } | null;
    results.push({
      group: "TICKETS",
      id: `ticket:${t.id}`,
      title: t.asunto,
      subtitle: `${t.numero} · ${cli?.razon_social ?? "—"}`,
      href: `/soporte/tickets/${t.id}`,
      refCode: `ticket:${t.id}`,
    });
  }
  for (const o of oportunidades ?? []) {
    const cli = o.clientes as { razon_social: string } | null;
    results.push({
      group: "OPORTUNIDADES",
      id: `oportunidad:${o.id}`,
      title: o.nombre,
      subtitle: cli?.razon_social ?? "Sin cliente",
      href: `/comercial/oportunidades/${o.id}`,
    });
  }

  return NextResponse.json({ results });
}
