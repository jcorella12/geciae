import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

function fmt(n: number) {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

type Resumen = {
  marca_visible_id: string;
  marca_codigo: string;
  marca_nombre: string | null;
  total_proyectos: number;
  activos: number;
  entregados: number;
  total_contratado: number;
  total_facturado: number;
  cross_marca: number;
};

export default async function ReportePorMarcaPage() {
  const vinculos = await obtenerVinculos();
  if (vinculos.length === 0) {
    return null;
  }

  const supabase = createClient();

  // RLS: la vista hereda los permisos de proyectos (RLS por empresa_id).
  // Cast porque la vista se crea en migración 20260601100000 y los types
  // se regeneran después.
  const { data: resumen } = await (
    supabase.from("v_proyectos_por_marca" as never) as unknown as {
      select: (cols: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => Promise<{ data: Resumen[] | null }>;
      };
    }
  )
    .select("*")
    .order("total_contratado", { ascending: false });

  const lista = resumen ?? [];

  const totalProyectos = lista.reduce((a, r) => a + r.total_proyectos, 0);
  const totalContratado = lista.reduce(
    (a, r) => a + Number(r.total_contratado),
    0,
  );
  const totalFacturado = lista.reduce(
    (a, r) => a + Number(r.total_facturado),
    0,
  );
  const totalCrossMarca = lista.reduce((a, r) => a + r.cross_marca, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Reportes
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Proyectos por marca visible
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrupa proyectos por la marca que ve el cliente final. &quot;Cross-marca&quot;
          indica proyectos donde la empresa ejecutora es distinta a la marca
          visible (típico Limson bajo marca PSE).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total proyectos" value={String(totalProyectos)} />
        <Stat label="Total contratado" value={fmt(totalContratado)} />
        <Stat label="Total facturado" value={fmt(totalFacturado)} />
        <Stat
          label="Cross-marca"
          value={String(totalCrossMarca)}
          hint="Operados por empresa distinta a la marca"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-secondary/50">
            <tr className="text-left">
              <th className="px-4 py-2 font-medium">Marca</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
              <th className="px-4 py-2 text-right font-medium">Activos</th>
              <th className="px-4 py-2 text-right font-medium">Entregados</th>
              <th className="px-4 py-2 text-right font-medium">Contratado</th>
              <th className="px-4 py-2 text-right font-medium">Facturado</th>
              <th className="px-4 py-2 text-right font-medium">Cross-marca</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lista.map((r) => (
              <tr key={r.marca_visible_id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/proyectos?marca=${r.marca_visible_id}`}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        codigoColor[r.marca_codigo] ?? "bg-muted-foreground"
                      }`}
                    />
                    <span className="font-medium">{r.marca_codigo}</span>
                    {r.marca_nombre && (
                      <span className="text-xs text-muted-foreground">
                        · {r.marca_nombre}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {r.total_proyectos}
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-700 tabular-nums">
                  {r.activos}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {r.entregados}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                  {fmt(Number(r.total_contratado))}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums">
                  {fmt(Number(r.total_facturado))}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {r.cross_marca > 0 ? (
                    <span
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                      title="Proyectos donde la empresa que ejecuta no es la dueña de la marca"
                    >
                      {r.cross_marca}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Sin proyectos visibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
