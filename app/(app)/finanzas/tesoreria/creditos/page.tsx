import Link from "next/link";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { LineaForm } from "./linea-form";
import { LineasList } from "./lineas-list";

export default async function CreditosPage() {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const puedeGestionar =
    esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo");

  const [{ data: empresas }, { data: lineas }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("lineas_credito_inter_co")
      .select(
        `id, empresa_acreedora_id, empresa_deudora_id, monto_autorizado, monto_utilizado, monto_disponible, vigencia_inicio, vigencia_fin, tasa_base, spread, capitaliza_intereses, dia_corte, activa,
         acreedora:empresas!lineas_credito_inter_co_empresa_acreedora_id_fkey(codigo, razon_social, nombre_comercial),
         deudora:empresas!lineas_credito_inter_co_empresa_deudora_id_fkey(codigo, razon_social, nombre_comercial)`,
      )
      .order("vigencia_inicio", { ascending: false }),
  ]);

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tesorería
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Líneas de crédito inter-co
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Marcos de financiamiento entre las empresas del grupo. Cada línea
          define el monto autorizado, vigencia y tasa (TIIE 28 + spread).
        </p>
      </div>

      {puedeGestionar && <LineaForm empresas={empresas ?? []} />}

      <LineasList
        lineas={(lineas ?? []) as never}
        puedeGestionar={puedeGestionar}
      />
    </div>
  );
}
