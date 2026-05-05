import Link from "next/link";
import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { NuevaTarifaForm } from "./nueva-tarifa-form";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function TarifasPage() {
  const vinculos = await obtenerVinculos();
  const puedeGestionar =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    vinculos.some((v) => v.rol === "director");
  if (!puedeGestionar) redirect("/mi-dia");

  const supabase = createClient();

  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));

  const [{ data: empresas }, { data: tarifas }] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, nombre_comercial, razon_social")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("tarifas_internas")
      .select(
        "id, empresa_id, concepto, unidad, costo_unitario, vigente_desde, vigente_hasta, activa, observaciones, empresas(codigo, nombre_comercial)",
      )
      .order("activa", { ascending: false })
      .order("vigente_desde", { ascending: false })
      .limit(200),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div>
        <Link
          href="/comercial/levantamientos"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a levantamientos
        </Link>
        <p className="mt-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Comercial · Levantamientos
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Tarifas internas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Costos por hora ingeniero, kilometraje, viáticos y otros conceptos.
          El cálculo automático del costo de levantamiento usa la tarifa
          vigente al día de la fecha realizada.
        </p>
      </div>

      <NuevaTarifaForm empresas={empresas ?? []} />

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Tarifas registradas ({(tarifas ?? []).length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 font-medium">Unidad</th>
                <th className="px-4 py-2 text-right font-medium">
                  Costo unitario
                </th>
                <th className="px-4 py-2 font-medium">Vigencia</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(tarifas ?? []).map((t) => {
                const emp = t.empresas as
                  | { codigo: string; nombre_comercial: string | null }
                  | null;
                return (
                  <tr key={t.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            codigoColor[emp?.codigo ?? ""] ??
                            "bg-muted-foreground"
                          }`}
                        />
                        <span className="font-medium">{emp?.codigo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {t.concepto}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t.unidad}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      $
                      {Number(t.costo_unitario).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.vigente_desde}
                      {t.vigente_hasta ? ` → ${t.vigente_hasta}` : " →"}
                    </td>
                    <td className="px-4 py-3">
                      {t.activa ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          Activa
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          Inactiva
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(tarifas ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin tarifas. Crea una para que el costo de levantamiento se
                    calcule automáticamente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
