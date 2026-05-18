import Link from "next/link";
import { redirect } from "next/navigation";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { CotizacionFormConIa } from "./page-wrapper";

export default async function NuevaCotizacionPage({
  searchParams,
}: {
  searchParams?: { oportunidad?: string; cliente?: string };
}) {
  const vinculos = await obtenerVinculos();

  // Empresas donde puede cotizar (mismo gate que en server action):
  // CEO/director/operativo de la empresa, o atributo vendedor en cualquier empresa.
  const empresasPermitidas = new Set<string>();
  const tieneVendedorEnAlguna = vinculos.some((v) =>
    v.atributos.includes("vendedor"),
  );
  for (const v of vinculos) {
    if (
      v.rol === "ceo" ||
      v.rol === "director" ||
      v.rol === "operativo" ||
      tieneVendedorEnAlguna
    ) {
      empresasPermitidas.add(v.empresa_id);
    }
  }

  if (empresasPermitidas.size === 0) redirect("/comercial/cotizaciones");

  const empresasIds = Array.from(empresasPermitidas);
  const supabase = createClient();

  const [{ data: empresas }, { data: clientes }, { data: oportunidades }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      supabase
        .from("clientes")
        .select("id, razon_social, rfc, nombre_comercial")
        .eq("activo", true)
        .order("razon_social"),
      supabase
        .from("oportunidades")
        .select("id, nombre, empresa_id, cliente_id, estado")
        .in("empresa_id", empresasIds)
        .in("estado", [
          "lead",
          "calificado",
          "visita_tecnica",
          "cotizacion_proceso",
          "cotizacion_enviada",
          "negociacion",
        ])
        .order("nombre"),
    ]);

  const defaults: Parameters<typeof CotizacionFormConIa>[0]["defaults"] = {
    cliente_id: searchParams?.cliente,
    oportunidad_id: searchParams?.oportunidad,
  };

  // Si llega ?oportunidad=ID, hidratar empresa+cliente
  if (searchParams?.oportunidad && oportunidades) {
    const op = oportunidades.find((o) => o.id === searchParams.oportunidad);
    if (op && empresasIds.includes(op.empresa_id)) {
      defaults.empresa_id = op.empresa_id;
      defaults.cliente_id = op.cliente_id ?? undefined;
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/comercial/cotizaciones"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Cotizaciones
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nueva cotización
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura los conceptos y el sistema generará el número, los totales y la
          fecha de vencimiento. Arranca como <strong>borrador</strong>.
        </p>
      </div>

      <CotizacionFormConIa
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        oportunidades={oportunidades ?? []}
        defaults={defaults}
      />
    </div>
  );
}
