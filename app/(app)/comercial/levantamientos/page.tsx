import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_LEVANTAMIENTO,
  ETIQUETA_ESTADO_LEVANTAMIENTO,
  type EstadoLevantamiento,
} from "@/lib/levantamientos/state";
import { createClient } from "@/lib/supabase/server";

import { NuevoLevantamientoForm } from "./nuevo-form";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default async function LevantamientosPage() {
  const vinculos = await obtenerVinculos();
  const empresasIds = Array.from(new Set(vinculos.map((v) => v.empresa_id)));

  const supabase = createClient();

  const [
    { data: empresas },
    { data: clientes },
    { data: oportunidades },
    { data: levantamientos },
  ] = await Promise.all([
    supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .in("id", empresasIds)
      .eq("activa", true)
      .order("codigo"),
    supabase
      .from("clientes")
      .select("id, razon_social")
      .eq("activo", true)
      .order("razon_social")
      .limit(500),
    supabase
      .from("oportunidades")
      .select("id, nombre, empresa_id, cliente_id, estado")
      .order("nombre")
      .limit(500),
    supabase
      .from("levantamientos")
      .select(
        "id, empresa_id, fecha_solicitud, fecha_realizada, estado, costo_calculado, vendedor_id, ingeniero_id, cliente_id, oportunidad_id, empresas(codigo, nombre_comercial), clientes(razon_social), oportunidades(nombre)",
      )
      .order("fecha_solicitud", { ascending: false })
      .limit(100),
  ]);

  // Lista de ingenieros candidatos: usuarios con rol operativo en alguna empresa
  // Por simplicidad: traemos del propio usuarios_empresas (cualquiera con vínculo)
  const { data: usuariosEmp } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id")
    .in("empresa_id", empresasIds)
    .eq("activo", true);
  const ingenierosIds = Array.from(
    new Set((usuariosEmp ?? []).map((u) => u.usuario_id as string)),
  );
  // No tenemos forma directa de leer auth.users; solo usamos lista vacía o
  // dejamos al usuario llenar después. Para simplicidad mostramos solo IDs.
  const ingenieros = ingenierosIds.slice(0, 50).map((id) => ({
    id,
    email: id.slice(0, 8),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Comercial
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Levantamientos técnicos
        </h1>
      </div>

      <NuevoLevantamientoForm
        empresas={empresas ?? []}
        clientes={clientes ?? []}
        oportunidades={oportunidades ?? []}
        ingenieros={ingenieros}
      />

      <section>
        <h2 className="mb-3 text-base font-semibold">
          Lista ({(levantamientos ?? []).length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Empresa</th>
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Cliente</th>
                <th className="px-4 py-2 font-medium">Oportunidad</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 text-right font-medium">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(levantamientos ?? []).map((l) => {
                const empresaCodigo = l.empresas?.codigo ?? "";
                const estado = l.estado as EstadoLevantamiento;
                return (
                  <tr key={l.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/comercial/levantamientos/${l.id}`}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            codigoColor[empresaCodigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        <span className="font-medium">{empresaCodigo}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link
                        href={`/comercial/levantamientos/${l.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {l.fecha_realizada ?? l.fecha_solicitud}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l.clientes?.razon_social ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {l.oportunidades?.nombre ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_ESTADO_LEVANTAMIENTO[estado]}`}
                      >
                        {ETIQUETA_ESTADO_LEVANTAMIENTO[estado]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                      {fmt(l.costo_calculado)}
                    </td>
                  </tr>
                );
              })}
              {(levantamientos ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin levantamientos. Crea uno con el botón de arriba.
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
