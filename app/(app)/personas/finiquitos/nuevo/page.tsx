import { FileText } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  empresasDondeGestionaEmpleados,
  obtenerVinculos,
  puedeGestionarEmpleadosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { NuevoFiniquitoForm } from "./form";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function NuevoFiniquitoPage({
  searchParams,
}: {
  searchParams: { empleado?: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const empresasGestionables = empresasDondeGestionaEmpleados(vinculos);
  if (empresasGestionables.length === 0) {
    redirect("/personas");
  }

  // Cargar empleados gestionables (activos o recién dados de baja).
  const { data: empleadosRaw } = await supabase
    .from("empleados")
    .select(
      "id, nombre_completo, numero_empleado, puesto, fecha_ingreso, fecha_baja, salario_base, activo, empresa_id, empresas(codigo)",
    )
    .order("nombre_completo");

  const empleados = (
    (empleadosRaw ?? []) as Array<{
      id: string;
      nombre_completo: string;
      numero_empleado: string;
      puesto: string | null;
      fecha_ingreso: string;
      fecha_baja: string | null;
      salario_base: number | null;
      activo: boolean;
      empresa_id: string;
      empresas: { codigo: string } | null;
    }>
  ).filter((e) => puedeGestionarEmpleadosEn(vinculos, e.empresa_id));

  // Si vino con ?empleado=ID, validar que existe y es gestionable.
  const empleadoPre = searchParams.empleado
    ? empleados.find((e) => e.id === searchParams.empleado)
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/personas/finiquitos"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Finiquitos
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
          <FileText className="h-6 w-6" />
          Nuevo finiquito
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calcula los conceptos con asistente LFT y guárdalo como borrador
          para revisión antes de aprobar.
        </p>
      </div>

      <NuevoFiniquitoForm
        empleados={empleados.map((e) => ({
          id: e.id,
          nombre_completo: e.nombre_completo,
          numero_empleado: e.numero_empleado,
          puesto: e.puesto ?? "",
          fecha_ingreso: e.fecha_ingreso,
          fecha_baja: e.fecha_baja,
          salario_base: Number(e.salario_base ?? 0),
          empresa_codigo: e.empresas?.codigo ?? "?",
          activo: e.activo,
        }))}
        empleadoPreseleccionado={empleadoPre?.id ?? null}
        codigoColor={codigoColor}
      />
    </div>
  );
}
