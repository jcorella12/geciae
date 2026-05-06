import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { FormNuevoAjuste } from "./form-nuevo-ajuste";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo ajuste gerencial" };

type EmpresaRow = { id: string; codigo: string; nombre_comercial: string | null };
type OcRow = { id: string; numero: string; concepto: string | null; total: number };

export default async function NuevoAjustePage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasIds)
    .order("codigo")) as unknown as { data: EmpresaRow[] | null };

  // OCs candidatas: aprobadas/recibidas/pagadas con concepto que sugiere ajuste
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ocsRaw } = (await (supabase as any)
    .from("ordenes_compra")
    .select("id, numero, concepto, total")
    .in("empresa_id", empresasIds)
    .in("estado", ["aprobada", "enviada", "parcial_recibida", "recibida", "pagada"])
    .order("created_at", { ascending: false })
    .limit(80)) as unknown as { data: OcRow[] | null };

  const ocs = (ocsRaw ?? []).map((o) => ({
    id: o.id,
    numero: o.numero,
    concepto: o.concepto ?? "",
    total: Number(o.total ?? 0),
  }));

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-7">
      <div className="mb-5">
        <p className="lbl-mini">
          <Link
            href="/finanzas/ajustes-gerenciales"
            className="text-ink-3 hover:underline"
          >
            ← Ajustes gerenciales
          </Link>
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
          Nuevo ajuste gerencial
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Registra un activo, pasivo o aportación que no está en la
          contabilidad fiscal.
        </p>
      </div>

      <FormNuevoAjuste empresas={empresas ?? []} ocsCandidatas={ocs} />
    </div>
  );
}
