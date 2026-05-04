import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { PreviewCliente } from "./preview-cliente";

export const dynamic = "force-dynamic";

export default async function CierreMensualPage() {
  const vinculos = await obtenerVinculos();
  if (!esCEO(vinculos) && !tieneAtributo(vinculos, "tesorero_corporativo")) {
    redirect("/mi-dia");
  }

  const supabase = createClient();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Centros · Cierre mensual
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Cierre y allocation mensual
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calcula el reparto de servicios compartidos hacia las demás empresas
          del grupo. El preview no toca la base; solo el botón &quot;Cerrar mes&quot;
          genera los movimientos.
        </p>
      </div>

      <PreviewCliente empresas={empresas ?? []} />
    </div>
  );
}
