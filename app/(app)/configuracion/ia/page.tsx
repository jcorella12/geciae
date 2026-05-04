import { Sparkles } from "lucide-react";

import { esCEO, obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const fmtPct = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export default async function IADashboardPage() {
  const vinculos = await obtenerVinculos();
  if (!esCEO(vinculos)) return null;

  const supabase = createClient();
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: invocaciones } = await supabase
    .from("ia_invocaciones")
    .select(
      "modelo_usado, tarea, tokens_input, tokens_output, costo_usd, costo_mxn, tipo_cache, duracion_ms, ejecutada, usuario_id, created_at",
    )
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(2000);

  const filas = invocaciones ?? [];
  const total = filas.length;
  const exitosas = filas.filter((f) => f.ejecutada).length;
  const cacheHits = filas.filter((f) => f.tipo_cache === "hit").length;
  const cacheRate = total > 0 ? cacheHits / total : 0;

  const sumUsd = filas.reduce((acc, f) => acc + (Number(f.costo_usd) || 0), 0);
  const sumMxn = filas.reduce((acc, f) => acc + (Number(f.costo_mxn) || 0), 0);
  const sumTokensIn = filas.reduce((acc, f) => acc + (f.tokens_input ?? 0), 0);
  const sumTokensOut = filas.reduce(
    (acc, f) => acc + (f.tokens_output ?? 0),
    0,
  );

  const latPromedio =
    filas.length > 0
      ? Math.round(
          filas
            .filter((f) => f.tipo_cache !== "hit" && f.duracion_ms != null)
            .reduce((acc, f) => acc + (f.duracion_ms ?? 0), 0) /
            Math.max(
              1,
              filas.filter((f) => f.tipo_cache !== "hit" && f.duracion_ms != null)
                .length,
            ),
        )
      : 0;

  // Distribución por modelo
  const porModelo = new Map<string, { calls: number; usd: number }>();
  for (const f of filas) {
    const k = f.modelo_usado ?? "—";
    const v = porModelo.get(k) ?? { calls: 0, usd: 0 };
    v.calls += 1;
    v.usd += Number(f.costo_usd) || 0;
    porModelo.set(k, v);
  }

  // Top tareas
  const porTarea = new Map<string, { calls: number; usd: number }>();
  for (const f of filas) {
    const k = f.tarea ?? "—";
    const v = porTarea.get(k) ?? { calls: 0, usd: 0 };
    v.calls += 1;
    v.usd += Number(f.costo_usd) || 0;
    porTarea.set(k, v);
  }
  const topTareas = Array.from(porTarea.entries())
    .sort((a, b) => b[1].usd - a[1].usd)
    .slice(0, 6);

  // Top usuarios
  const porUsuario = new Map<string, { calls: number; usd: number }>();
  for (const f of filas) {
    if (!f.usuario_id) continue;
    const v = porUsuario.get(f.usuario_id) ?? { calls: 0, usd: 0 };
    v.calls += 1;
    v.usd += Number(f.costo_usd) || 0;
    porUsuario.set(f.usuario_id, v);
  }
  const topUsuariosIds = Array.from(porUsuario.entries())
    .sort((a, b) => b[1].usd - a[1].usd)
    .slice(0, 5);

  // Resolver emails de top usuarios via admin client (CEO ya pasó el gate).
  const topUsuariosEmails = new Map<string, string>();
  if (topUsuariosIds.length > 0) {
    // Usamos service-role indirecto: como CEO, query a auth.users no es directa
    // desde el cliente authenticated. Para MVP mostramos id corto.
    for (const [id] of topUsuariosIds) {
      topUsuariosEmails.set(id, id.slice(0, 8) + "…");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4 text-accent" />
          Uso de Claude API · últimos 30 días
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas agregadas de invocaciones, costo, modelos y cache. Refresh
          al recargar la página.
        </p>
      </div>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Invocaciones" value={total.toLocaleString("es-MX")} hint={`${exitosas} exitosas`} />
        <KPICard
          label="Costo USD"
          value={fmtUsd.format(sumUsd)}
          hint={fmtMxn.format(sumMxn)}
        />
        <KPICard
          label="Tokens"
          value={`${(sumTokensIn / 1000).toFixed(1)}k in / ${(sumTokensOut / 1000).toFixed(1)}k out`}
          hint={`Total ${((sumTokensIn + sumTokensOut) / 1000).toFixed(1)}k`}
        />
        <KPICard
          label="Cache hit rate"
          value={fmtPct.format(cacheRate)}
          hint={
            latPromedio > 0
              ? `Latencia prom (sin cache): ${latPromedio} ms`
              : "Sin datos de latencia"
          }
        />
      </section>

      {/* Distribución por modelo */}
      <section>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Distribución por modelo
        </h3>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Modelo</th>
                <th className="px-4 py-2 text-right font-medium">Invocaciones</th>
                <th className="px-4 py-2 text-right font-medium">Costo USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from(porModelo.entries()).map(([k, v]) => (
                <tr key={k}>
                  <td className="px-4 py-2 font-mono text-xs">{k}</td>
                  <td className="px-4 py-2 text-right">
                    {v.calls.toLocaleString("es-MX")}
                  </td>
                  <td className="px-4 py-2 text-right">{fmtUsd.format(v.usd)}</td>
                </tr>
              ))}
              {porModelo.size === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    Sin invocaciones en los últimos 30 días.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Top tareas */}
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Top tareas por costo
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Tarea</th>
                  <th className="px-4 py-2 text-right font-medium">Calls</th>
                  <th className="px-4 py-2 text-right font-medium">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topTareas.map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-4 py-2 font-mono text-xs">{k}</td>
                    <td className="px-4 py-2 text-right">{v.calls}</td>
                    <td className="px-4 py-2 text-right">{fmtUsd.format(v.usd)}</td>
                  </tr>
                ))}
                {topTareas.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-xs text-muted-foreground"
                    >
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top usuarios */}
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Top usuarios por consumo
          </h3>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Usuario</th>
                  <th className="px-4 py-2 text-right font-medium">Calls</th>
                  <th className="px-4 py-2 text-right font-medium">USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topUsuariosIds.map(([id, v]) => (
                  <tr key={id}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {topUsuariosEmails.get(id) ?? id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2 text-right">{v.calls}</td>
                    <td className="px-4 py-2 text-right">{fmtUsd.format(v.usd)}</td>
                  </tr>
                ))}
                {topUsuariosIds.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-xs text-muted-foreground"
                    >
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Tipo de cambio MXN aproximado: 18.50 (refinar en Sprint 5 cuando
        sincronicemos con Banxico). Para detalle de invocación individual
        consulta la tabla <code>ia_invocaciones</code>.
      </p>
    </div>
  );
}

function KPICard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
