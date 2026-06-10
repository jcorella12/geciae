import Link from "next/link";
import { notFound } from "next/navigation";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { listarCentrosActivos } from "@/lib/centros/listar";
import { createClient } from "@/lib/supabase/server";

import { GastoForm } from "../gasto-form";

export const metadata = { title: "Editar gasto recurrente · PSE ERP" };

export default async function EditarGastoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();
  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));

  const { data: gasto } = await supabase
    .from("gastos_recurrentes")
    .select(
      "id, empresa_id, categoria, descripcion, proveedor_id, proveedor_nombre, monto, moneda, iva_incluido, frecuencia, dia_pago, fecha_inicio, fecha_fin, identificador, observaciones, centro_id",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!gasto) notFound();

  const [{ data: empresas }, { data: proveedores }, centros] =
    await Promise.all([
      supabase
        .from("empresas")
        .select(
          "id, codigo, razon_social, nombre_comercial, centro_default_gastos_id",
        )
        .in("id", empresasIds)
        .eq("activa", true)
        .order("codigo"),
      supabase
        .from("proveedores")
        .select("id, razon_social, rfc")
        .eq("activo", true)
        .order("razon_social")
        .limit(500),
      listarCentrosActivos(),
    ]);

  const centroDefaultPorEmpresa: Record<string, string | null> = {};
  for (const e of empresas ?? []) {
    centroDefaultPorEmpresa[e.id] =
      (e as { centro_default_gastos_id?: string | null })
        .centro_default_gastos_id ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/gastos-recurrentes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Gastos recurrentes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          Editar gasto recurrente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {gasto.descripcion}
        </p>
      </div>

      <GastoForm
        empresas={empresas ?? []}
        proveedores={proveedores ?? []}
        centros={centros}
        centroDefaultPorEmpresa={centroDefaultPorEmpresa}
        gastoId={gasto.id}
        defaults={{
          empresa_id: gasto.empresa_id ?? undefined,
          categoria: gasto.categoria ?? undefined,
          descripcion: gasto.descripcion ?? undefined,
          proveedor_id: gasto.proveedor_id,
          proveedor_nombre: gasto.proveedor_nombre,
          monto: gasto.monto ?? undefined,
          moneda: gasto.moneda ?? undefined,
          iva_incluido: gasto.iva_incluido ?? undefined,
          frecuencia: gasto.frecuencia ?? undefined,
          dia_pago: gasto.dia_pago,
          fecha_inicio: gasto.fecha_inicio ?? undefined,
          fecha_fin: gasto.fecha_fin,
          identificador: gasto.identificador,
          observaciones: gasto.observaciones,
          centro_id: gasto.centro_id,
        }}
      />
    </div>
  );
}
