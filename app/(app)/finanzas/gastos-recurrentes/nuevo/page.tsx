import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { GastoForm } from "../gasto-form";

export default async function NuevoGastoPage() {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));

  const [{ data: empresas }, { data: proveedores }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("proveedores")
      .select("id, razon_social, rfc")
      .eq("activo", true)
      .order("razon_social")
      .limit(500),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/gastos-recurrentes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Gastos recurrentes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Nuevo gasto recurrente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registra un gasto que se paga periódicamente. El sistema calcula el
          monto mensualizado para sumar indirectos.
        </p>
      </div>

      <GastoForm empresas={empresas ?? []} proveedores={proveedores ?? []} />
    </div>
  );
}
