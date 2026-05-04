import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { obtenerVinculos, puedeGestionarProveedores } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { ProveedorForm } from "../../proveedor-form";

export const dynamic = "force-dynamic";

export default async function EditProveedorPage({
  params,
}: {
  params: { id: string };
}) {
  const vinculos = await obtenerVinculos();
  if (!puedeGestionarProveedores(vinculos)) redirect("/finanzas/proveedores");

  const supabase = createClient();
  const { data: prov } = await supabase
    .from("proveedores")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!prov) notFound();

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  const { data: vinculosEmp } = await supabase
    .from("proveedores_empresas")
    .select("empresa_id")
    .eq("proveedor_id", params.id);

  type Direccion = {
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    pais?: string;
  };
  type Cuenta = { clabe?: string; banco?: string; titular?: string };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/finanzas/proveedores/${prov.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {prov.razon_social}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar proveedor
        </h1>
      </div>

      <ProveedorForm
        empresas={empresas ?? []}
        proveedorId={prov.id}
        defaults={{
          razon_social: prov.razon_social,
          nombre_comercial: prov.nombre_comercial,
          rfc: prov.rfc,
          curp: prov.curp,
          regimen_fiscal: prov.regimen_fiscal ?? undefined,
          cp_fiscal: prov.cp_fiscal ?? undefined,
          direccion_fiscal: prov.direccion_fiscal as Direccion | null,
          representante_legal: prov.representante_legal,
          rfc_representante: prov.rfc_representante,
          tipo_proveedor: prov.tipo_proveedor,
          categoria_sat: prov.categoria_sat,
          clasificacion_interna: prov.clasificacion_interna,
          requiere_repse: prov.requiere_repse ?? false,
          cuenta_bancaria: prov.cuenta_bancaria as Cuenta | null,
          semaforo: prov.semaforo ?? "verde",
          esta_aprobado: prov.esta_aprobado ?? false,
          fecha_aprobacion: prov.fecha_aprobacion,
          observaciones: prov.observaciones,
          empresaIds: (vinculosEmp ?? []).map((v) => v.empresa_id),
        }}
      />
    </div>
  );
}
