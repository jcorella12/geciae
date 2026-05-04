import Link from "next/link";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { PrestamoForm } from "../prestamo-form";

export default async function NuevoPrestamoPage({
  searchParams,
}: {
  searchParams?: { linea?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  // Empresas a las que el usuario pertenece como director/operativo (las únicas
  // que pueden ser deudoras donde puede solicitar). CEO/tesorero ven todas.
  const empresasUser =
    esCEO(v) || tieneAtributo(v, "tesorero_corporativo")
      ? null // null = no filtrar
      : v
          .filter((vi) => ["ceo", "director", "operativo"].includes(vi.rol))
          .map((vi) => vi.empresa_id);

  let query = supabase
    .from("lineas_credito_inter_co")
    .select(
      `id, monto_disponible, monto_autorizado, spread, vigencia_inicio, vigencia_fin, activa, empresa_deudora_id,
       acreedora:empresas!lineas_credito_inter_co_empresa_acreedora_id_fkey(codigo, razon_social, nombre_comercial),
       deudora:empresas!lineas_credito_inter_co_empresa_deudora_id_fkey(codigo, razon_social, nombre_comercial)`,
    )
    .eq("activa", true)
    .order("vigencia_inicio", { ascending: false });

  if (empresasUser !== null && empresasUser.length > 0) {
    query = query.in("empresa_deudora_id", empresasUser);
  }
  const { data: lineas } = await query;

  const hoy = new Date();
  const vigentes = (lineas ?? []).filter(
    (l) =>
      new Date(l.vigencia_inicio) <= hoy &&
      new Date(l.vigencia_fin) >= hoy &&
      Number(l.monto_disponible ?? l.monto_autorizado) > 0,
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria/prestamos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Préstamos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Solicitar préstamo inter-co
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La solicitud va a aprobación por la empresa acreedora. Una vez
          aprobada, el tesorero corporativo ejecuta la transferencia.
        </p>
      </div>

      <PrestamoForm
        lineas={vigentes as never}
        lineaPreseleccionada={searchParams?.linea ?? null}
      />
    </div>
  );
}
