import { Box } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { CrearSeriesForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NuevaSeriePage() {
  const supabase = createClient();

  // Solo productos marcados como serializables (requiere_serie=TRUE).
  const { data: productos } = await supabase
    .from("catalogo_productos")
    .select("id, codigo, nombre, marca, modelo, requiere_serie")
    .eq("activo", true)
    .eq("requiere_serie", true)
    .order("codigo");

  const { data: almacenes } = await supabase
    .from("almacenes")
    .select("id, codigo, nombre, empresa_id")
    .eq("activo", true)
    .order("codigo");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/inventario/series"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Series
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold leading-tight">
          <Box className="h-6 w-6" />
          Registrar series
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Para alta masiva: elige el producto, pega los números de serie y
          opcionalmente la fecha de compra + duración de garantía. Una sola
          pasada para 20 paneles del mismo lote.
        </p>
      </div>

      {(productos ?? []).length === 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm">
          <p className="font-medium">
            No hay productos marcados como serializables.
          </p>
          <p className="mt-1 text-xs">
            Marca <code className="font-mono">requiere_serie = TRUE</code> en
            el catálogo de productos para los que llevan número de serie
            (paneles, inversores, equipos de medición, vehículos).
          </p>
        </div>
      ) : (
        <CrearSeriesForm
          productos={(productos ?? []).map((p) => ({
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            marca: p.marca,
            modelo: p.modelo,
          }))}
          almacenes={(almacenes ?? []).map((a) => ({
            id: a.id,
            codigo: a.codigo,
            nombre: a.nombre,
            empresa_id: a.empresa_id,
          }))}
        />
      )}
    </div>
  );
}
