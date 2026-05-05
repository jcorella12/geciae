import Link from "next/link";
import { redirect } from "next/navigation";

import {
  esCEO,
  obtenerVinculos,
  puedeAccederCentros,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_SUBTIPO_CENTRO,
  COLOR_TIPO_CENTRO,
  ETIQUETA_SUBTIPO_CENTRO,
  ETIQUETA_TIPO_CENTRO,
  type SubtipoCentro,
  type TipoCentro,
} from "@/lib/centros/state";
import { createClient } from "@/lib/supabase/server";

import { NuevoCentroForm } from "./nuevo-centro-form";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function CentrosPage() {
  const vinculos = await obtenerVinculos();
  if (!puedeAccederCentros(vinculos)) {
    redirect("/mi-dia");
  }

  const supabase = createClient();

  // RLS filtra por usuario; para CEO/tesorero vienen todos.
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  const { data: centros, error } = await supabase
    .from("centros")
    .select(
      "id, empresa_id, codigo, nombre, tipo, subtipo, activo, centro_padre_id, presupuesto_anual, empresas!centros_empresa_id_fkey(codigo, nombre_comercial, razon_social)",
    )
    .order("activo", { ascending: false })
    .order("codigo");

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Error cargando centros: {error.message}
      </div>
    );
  }

  // Stats por empresa
  const totalActivos = (centros ?? []).filter((c) => c.activo).length;
  const totalArchivados = (centros ?? []).filter((c) => !c.activo).length;
  const totalCC = (centros ?? []).filter(
    (c) => c.activo && c.tipo === "costo",
  ).length;
  const totalCU = (centros ?? []).filter(
    (c) => c.activo && c.tipo === "utilidad",
  ).length;

  // Para el form: solo empresas donde puede gestionar
  const puedeGestionar =
    esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo");
  const empresasGestionables = (empresas ?? []).filter((e) => {
    if (puedeGestionar) return true;
    return vinculos.some(
      (v) => v.empresa_id === e.id && v.rol === "director",
    );
  });

  // Lista de centros para el selector "padre" del form
  const centrosParaPadre = (centros ?? [])
    .filter((c) => c.activo)
    .map((c) => ({
      id: c.id,
      empresa_id: c.empresa_id,
      codigo: c.codigo,
      nombre: c.nombre,
      subtipo: c.subtipo as SubtipoCentro,
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Activos" value={totalActivos} />
        <StatCard label="Centros de costo" value={totalCC} />
        <StatCard label="Centros de utilidad" value={totalCU} />
        <StatCard label="Archivados" value={totalArchivados} muted />
      </div>

      {empresasGestionables.length > 0 && (
        <NuevoCentroForm
          empresas={empresasGestionables}
          centros={centrosParaPadre}
        />
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Centros ({(centros ?? []).length})
        </h2>

        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Código</th>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Subtipo</th>
                <th className="px-4 py-2 text-right font-medium">
                  Presupuesto
                </th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(centros ?? []).map((c) => {
                const empresaCodigo = c.empresas?.codigo ?? "";
                const empresaNombre =
                  c.empresas?.nombre_comercial ??
                  c.empresas?.razon_social ??
                  empresaCodigo;
                const tipo = c.tipo as TipoCentro;
                const subtipo = c.subtipo as SubtipoCentro;
                return (
                  <tr
                    key={c.id}
                    className="align-top hover:bg-secondary/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/configuracion/centros/${c.id}`}
                        className="flex items-center gap-2"
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            codigoColor[empresaCodigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        <span className="text-xs font-medium">
                          {empresaCodigo}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          · {empresaNombre}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/configuracion/centros/${c.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {c.codigo}
                      </Link>
                      {c.centro_padre_id && (
                        <span
                          className="ml-2 text-[10px] text-muted-foreground"
                          title="Sub-centro"
                        >
                          (sub)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/configuracion/centros/${c.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {c.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${COLOR_TIPO_CENTRO[tipo]}`}
                      >
                        {ETIQUETA_TIPO_CENTRO[tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_SUBTIPO_CENTRO[subtipo]}`}
                      >
                        {ETIQUETA_SUBTIPO_CENTRO[subtipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {c.presupuesto_anual != null
                        ? `$${Number(c.presupuesto_anual).toLocaleString(
                            "es-MX",
                            { minimumFractionDigits: 2 },
                          )}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.activo ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          Activo
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                          Archivado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(centros ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin centros aún. Crea uno con el botón de arriba.
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

function StatCard({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-card px-4 py-3 shadow-sm ${
        muted ? "opacity-70" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
