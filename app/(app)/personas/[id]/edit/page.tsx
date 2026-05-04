import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  empresasDondeGestionaEmpleados,
  obtenerVinculos,
  puedeGestionarEmpleadosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { EmpleadoForm } from "../../empleado-form";

export default async function EditEmpleadoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: emp } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!emp) notFound();

  if (!puedeGestionarEmpleadosEn(vinculos, emp.empresa_id)) {
    redirect(`/personas/${emp.id}`);
  }

  const idsGestionables = empresasDondeGestionaEmpleados(vinculos);
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", idsGestionables.length ? idsGestionables : [emp.empresa_id])
    .eq("activa", true)
    .order("codigo");

  type Domicilio = {
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    cp?: string;
  };
  type Emergencia = { nombre?: string; relacion?: string; telefono?: string };
  type Cuenta = { clabe?: string; banco?: string };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href={`/personas/${emp.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {emp.nombre_completo}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar empleado
        </h1>
      </div>

      <EmpleadoForm
        empresasGestionables={empresas ?? []}
        empleadoId={emp.id}
        defaults={{
          empresa_id: emp.empresa_id,
          nombre_completo: emp.nombre_completo,
          curp: emp.curp,
          rfc: emp.rfc,
          nss: emp.nss,
          fecha_nacimiento: emp.fecha_nacimiento,
          genero: emp.genero,
          estado_civil: emp.estado_civil,
          email_personal: emp.email_personal,
          telefono: emp.telefono,
          whatsapp: emp.whatsapp,
          domicilio: emp.domicilio as Domicilio | null,
          contacto_emergencia: emp.contacto_emergencia as Emergencia | null,
          numero_empleado: emp.numero_empleado,
          categoria: emp.categoria,
          puesto: emp.puesto,
          area: emp.area,
          jefe_directo_id: emp.jefe_directo_id,
          fecha_ingreso: emp.fecha_ingreso,
          cuenta_bancaria: emp.cuenta_bancaria as Cuenta | null,
          salario_base:
            emp.salario_base != null ? Number(emp.salario_base) : null,
          observaciones: emp.observaciones,
        }}
      />
    </div>
  );
}
