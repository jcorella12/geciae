import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { obtenerVinculos, puedeGestionarClientes } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ClienteForm } from "../../cliente-form";

export const dynamic = "force-dynamic";

export default async function EditClientePage({
  params,
}: {
  params: { id: string };
}) {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarClientes(vinculos)) redirect("/clientes");

  const supabase = createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select(
      "id, razon_social, nombre_comercial, rfc, curp, regimen_fiscal, cp_fiscal, direccion_fiscal, email_facturacion, uso_cfdi_default, tipo, segmento, riesgo, observaciones",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!cliente) notFound();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  const { data: vinculosEmp } = await supabase
    .from("clientes_empresas")
    .select("empresa_id")
    .eq("cliente_id", params.id);

  type DireccionFiscal = {
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    pais?: string;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/clientes/${cliente.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {cliente.razon_social}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar cliente
        </h1>
      </div>

      <ClienteForm
        empresas={empresas ?? []}
        clienteId={cliente.id}
        defaults={{
          id: cliente.id,
          razon_social: cliente.razon_social,
          nombre_comercial: cliente.nombre_comercial,
          rfc: cliente.rfc,
          curp: cliente.curp,
          regimen_fiscal: cliente.regimen_fiscal ?? undefined,
          cp_fiscal: cliente.cp_fiscal ?? undefined,
          direccion_fiscal: cliente.direccion_fiscal as DireccionFiscal | null,
          email_facturacion: cliente.email_facturacion,
          uso_cfdi_default: cliente.uso_cfdi_default,
          tipo: cliente.tipo,
          segmento: cliente.segmento,
          riesgo: cliente.riesgo ?? "bajo",
          observaciones: cliente.observaciones,
          empresaIds: (vinculosEmp ?? []).map((v) => v.empresa_id),
        }}
      />
    </div>
  );
}
