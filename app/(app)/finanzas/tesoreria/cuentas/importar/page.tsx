import Link from "next/link";
import { notFound } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ImportEdoctasClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ImportarEdoctasPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const ceo = esCEO(v);
  const tesorero = tieneAtributo(v, "tesorero_corporativo");

  // Empresas donde el usuario gestiona tesorería.
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social")
    .eq("activa", true)
    .order("codigo");

  const empresasGestionables = (empresas ?? []).filter((e) =>
    ceo || tesorero ? true : esRolEn(v, e.id, "director"),
  );

  if (empresasGestionables.length === 0) {
    notFound();
  }

  const empresaIds = empresasGestionables.map((e) => e.id);

  const { data: cuentas } = await supabase
    .from("bancos_cuentas")
    .select("id, empresa_id, banco, numero_cuenta, clabe, alias, activa, empresas(codigo)")
    .in("empresa_id", empresaIds)
    .order("banco");

  const cuentasMin = (cuentas ?? [])
    .filter((c) => c.activa !== false)
    .map((c) => ({
      id: c.id,
      empresa_id: c.empresa_id,
      banco: c.banco,
      numero_cuenta: c.numero_cuenta,
      clabe: c.clabe,
      alias: c.alias,
      empresa_codigo: (c.empresas as { codigo: string } | null)?.codigo ?? null,
    }));

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria/cuentas"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Cuentas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Importar estados de cuenta
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrastra varios archivos a la vez. El sistema intenta detectar la
          cuenta a partir del nombre del archivo (BBVA, número de cuenta,
          últimos dígitos). Si no detecta, asigna manualmente.
        </p>
      </div>

      <ImportEdoctasClient cuentas={cuentasMin} />
    </div>
  );
}
