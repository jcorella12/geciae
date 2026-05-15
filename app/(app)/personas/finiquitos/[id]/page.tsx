import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  obtenerVinculos,
  puedeGestionarEmpleadosEn,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import type {
  CaminoCierre,
  EstadoFiniquito,
  FiniquitoConcepto,
} from "../state";

import { FiniquitoDetalle } from "./detalle";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function FiniquitoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: fin } = await supabase
    .from("finiquitos")
    .select(
      "id, empleado_id, fecha_baja, motivo_baja, camino_cierre, conceptos, total_neto, url_convenio_terminacion, url_recibo_finiquito, fecha_pago, estado, aprobado_por, observaciones, created_at, empleados(nombre_completo, numero_empleado, puesto, fecha_ingreso, salario_base, empresa_id, empresas(codigo))",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!fin) notFound();

  const empleado = fin.empleados as {
    nombre_completo: string;
    numero_empleado: string;
    puesto: string | null;
    fecha_ingreso: string;
    salario_base: number | null;
    empresa_id: string;
    empresas: { codigo: string } | null;
  } | null;

  if (!empleado) notFound();

  const puedeGestionar = puedeGestionarEmpleadosEn(
    vinculos,
    empleado.empresa_id,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/personas/finiquitos"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Finiquitos
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
          <FileText className="h-6 w-6" />
          Finiquito · {empleado.nombre_completo}
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <span
            className={`inline-block h-2 w-2 rounded-full ${codigoColor[empleado.empresas?.codigo ?? ""] ?? "bg-muted-foreground"}`}
          />
          {empleado.empresas?.codigo} · {empleado.numero_empleado} ·{" "}
          {empleado.puesto ?? "—"} · ingresó {empleado.fecha_ingreso}
        </p>
      </div>

      <FiniquitoDetalle
        finiquito={{
          id: fin.id,
          empleadoId: fin.empleado_id,
          fechaBaja: fin.fecha_baja,
          motivoBaja: fin.motivo_baja,
          caminoCierre: (fin.camino_cierre as CaminoCierre | null) ?? null,
          conceptos: (fin.conceptos as FiniquitoConcepto[] | null) ?? [],
          totalNeto: Number(fin.total_neto),
          urlConvenioTerminacion: fin.url_convenio_terminacion ?? null,
          urlReciboFiniquito: fin.url_recibo_finiquito ?? null,
          fechaPago: fin.fecha_pago,
          estado: (fin.estado as EstadoFiniquito) ?? "borrador",
          observaciones: fin.observaciones,
        }}
        empleado={{
          nombreCompleto: empleado.nombre_completo,
          numeroEmpleado: empleado.numero_empleado,
          salarioBase: Number(empleado.salario_base ?? 0),
        }}
        puedeGestionar={puedeGestionar}
      />
    </div>
  );
}
