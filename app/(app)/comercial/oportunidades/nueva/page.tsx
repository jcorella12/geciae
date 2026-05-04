import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { OportunidadForm } from "../oportunidad-form";

export default async function NuevaOportunidadPage() {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));

  const [{ data: empresas }, { data: clientes }, { data: vendedoresUE }] =
    await Promise.all([
      supabase
        .from("empresas")
        .select("id, codigo, razon_social, nombre_comercial")
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      // `es_potencial` se agregó en migración 20260520000000; hasta que se
      // regeneren los types no se puede pedir en .select() sin TS error.
      // Se obtiene en una segunda query (mismo registro) — barato, < 200 filas.
      supabase
        .from("clientes")
        .select("id, razon_social, rfc, nombre_comercial")
        .eq("activo", true)
        .order("razon_social"),
      supabase
        .from("usuarios_empresas")
        .select("usuario_id, atributos")
        .in("empresa_id", empresasIds)
        .eq("activo", true),
    ]);

  // Vendedores: usuarios con atributo 'vendedor'
  const vendedoresIds = Array.from(
    new Set(
      (vendedoresUE ?? [])
        .filter((u) =>
          ((u.atributos ?? []) as string[]).includes("vendedor"),
        )
        .map((u) => u.usuario_id as string),
    ),
  );

  let vendedores: Array<{
    id: string;
    full_name: string | null;
    email: string | null;
  }> = [];
  if (vendedoresIds.length > 0) {
    // No hay tabla de profiles públicos en este proyecto; pasamos placeholders
    vendedores = vendedoresIds.map((id) => ({
      id,
      full_name: null,
      email: id.slice(0, 8),
    }));
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/comercial/oportunidades"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Pipeline
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nueva oportunidad
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura un lead o una oportunidad calificada. Avanza por las etapas
          del pipeline conforme avance la venta.
        </p>
      </div>

      <OportunidadForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        vendedores={vendedores}
      />
    </div>
  );
}
