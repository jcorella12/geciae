import Link from "next/link";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { CuentaForm } from "./cuenta-form";
import { CuentasList } from "./cuentas-list";

export default async function TesoreriaCuentasPage() {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const ceo = esCEO(vinculos);
  const tesorero = tieneAtributo(vinculos, "tesorero_corporativo");

  // Empresas donde puede gestionar bancos: ceo o tesorero ven todas; director ve la suya.
  const todasIds = (
    await supabase.from("empresas").select("id").eq("activa", true)
  ).data?.map((e) => e.id) ?? [];

  const empresasGestionables = ceo || tesorero
    ? todasIds
    : todasIds.filter((id) => esRolEn(vinculos, id, "director"));

  const [{ data: empresas }, { data: cuentas }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("bancos_cuentas")
      .select(
        "id, empresa_id, banco, numero_cuenta, clabe, alias, tipo, saldo_actual, fecha_actualizacion_saldo, activa, empresas(codigo)",
      )
      .order("banco"),
  ]);

  const empresasGestionablesObj = (empresas ?? []).filter((e) =>
    empresasGestionables.includes(e.id),
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tesorería
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Cuentas bancarias
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saldos manuales por ahora. La integración con Belvo (sincronización
          automática) llega en Fase 3.
        </p>
      </div>

      {empresasGestionablesObj.length > 0 && (
        <CuentaForm empresas={empresasGestionablesObj} />
      )}

      <CuentasList
        cuentas={cuentas ?? []}
        empresasGestionables={empresasGestionables}
      />
    </div>
  );
}
