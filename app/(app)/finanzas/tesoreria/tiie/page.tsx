import Link from "next/link";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { TiieRangeForm, TiieSyncButton } from "./sync-button";

const fmtPct = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export default async function TiieHistoricoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) || tieneAtributo(v, "tesorero_corporativo");

  const { data: historico } = await supabase
    .from("tiie_historico")
    .select("fecha, tipo, tasa, fuente")
    .eq("tipo", "tiie_28")
    .order("fecha", { ascending: false })
    .limit(180);

  const ultimo = historico?.[0];
  const previo = historico?.[1];
  const cambio = ultimo && previo ? ultimo.tasa - previo.tasa : 0;
  const banxicoToken = process.env.BANXICO_TOKEN;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Tesorería
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">TIIE 28</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasa de Interés Interbancaria de Equilibrio a 28 días publicada por
          Banxico. Se usa como tasa base de los préstamos inter-co (TIIE +
          spread).
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm md:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Última tasa registrada
          </p>
          {ultimo ? (
            <>
              <p className="mt-1 font-mono text-3xl font-semibold">
                {fmtPct.format(Number(ultimo.tasa))}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Fecha:{" "}
                  <span className="font-mono text-foreground">
                    {new Date(ultimo.fecha).toLocaleDateString("es-MX")}
                  </span>
                </span>
                <span>·</span>
                <span>
                  Fuente:{" "}
                  <span className="text-foreground">
                    {ultimo.fuente ?? "—"}
                  </span>
                </span>
                {cambio !== 0 && (
                  <>
                    <span>·</span>
                    <span
                      className={
                        cambio > 0
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }
                    >
                      {cambio > 0 ? "▲" : "▼"} {fmtPct.format(Math.abs(cambio))}
                    </span>
                  </>
                )}
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Aún no se ha sincronizado la TIIE.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Sincronización Banxico
          </p>
          {!banxicoToken ? (
            <p className="mt-2 text-xs text-amber-700">
              ⚠ Falta <code>BANXICO_TOKEN</code> en .env. Solicítalo gratis en
              Banxico SIE.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Token configurado.
            </p>
          )}
          <div className="mt-3">
            <TiieSyncButton habilitado={puede && !!banxicoToken} />
          </div>
        </div>
      </div>

      {puede && banxicoToken && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Importar rango histórico</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Útil para inicializar el histórico al instalar el sistema o para
            llenar huecos.
          </p>
          <div className="mt-3">
            <TiieRangeForm habilitado={true} />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Histórico (últimos 180 días)</h2>
        </div>
        {(historico?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Sin registros de TIIE.
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 text-right font-medium">Tasa</th>
                  <th className="px-4 py-2 font-medium">Fuente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(historico ?? []).map((r) => (
                  <tr key={`${r.fecha}-${r.tipo}`}>
                    <td className="px-4 py-2 font-mono text-xs">
                      {new Date(r.fecha).toLocaleDateString("es-MX", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {fmtPct.format(Number(r.tasa))}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {r.fuente ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
