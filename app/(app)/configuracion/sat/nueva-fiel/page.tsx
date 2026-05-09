import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { FormSubirFiel } from "./form-subir-fiel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subir FIEL · Configuración SAT" };

type EmpresaRow = {
  id: string;
  codigo: string;
  rfc: string;
  nombre_comercial: string | null;
};

export default async function NuevaFielPage({
  searchParams,
}: {
  searchParams: { empresa_id?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, rfc, nombre_comercial")
    .in("id", empresasIds)
    .order("codigo")) as unknown as { data: EmpresaRow[] | null };

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-7">
      <div className="mb-5">
        <p className="lbl-mini">
          <Link
            href="/configuracion/sat"
            className="text-ink-3 hover:underline"
          >
            ← Configuración SAT
          </Link>
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
          Subir FIEL
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Carga el certificado (.cer) y la llave privada (.key) de tu FIEL para
          habilitar la descarga directa de CFDIs.
        </p>
      </div>

      <FormSubirFiel
        empresas={empresas ?? []}
        empresaIdInicial={searchParams.empresa_id}
      />
    </div>
  );
}
