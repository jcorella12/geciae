import Link from "next/link";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { WizardEFM } from "./wizard-efm";

export const dynamic = "force-dynamic";

export default async function NuevoPaqueteEFMPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  const empresasGestionables = (empresas ?? []).filter(
    (e) =>
      esCEO(v) ||
      tieneAtributo(v, "tesorero_corporativo") ||
      esRolEn(v, e.id, ["director", "operativo"]),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/estados-financieros"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Estados financieros
        </Link>
        <h1 className="mt-2 text-[24px] font-semibold leading-tight">
          Nuevo paquete mensual
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Sube los 13 PDFs del despacho contable. El clasificador detecta el
          tipo automáticamente por el nombre; los archivos no reconocidos los
          puedes ajustar después en el detalle.
        </p>
      </div>

      {empresasGestionables.length === 0 ? (
        <p className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          No tienes empresas donde puedas crear paquetes contables. Necesitas
          rol CEO, tesorero corporativo, director u operativo.
        </p>
      ) : (
        <WizardEFM
          empresas={empresasGestionables.map((e) => ({
            id: e.id,
            codigo: e.codigo,
            nombre: e.nombre_comercial ?? e.razon_social,
          }))}
        />
      )}
    </div>
  );
}
