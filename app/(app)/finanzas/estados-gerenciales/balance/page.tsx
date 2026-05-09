import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { obtenerBalanceGeneral } from "../actions";
import { SelectorEmpresa } from "../selector-empresa";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const dynamic = "force-dynamic";
export const metadata = { title: "Balance General · Estados Gerenciales" };

type EmpresaOpt = {
  id: string;
  codigo: string;
  nombre_comercial: string | null;
};

export default async function BalancePage({
  searchParams,
}: {
  searchParams: { empresa_id?: string; fecha?: string };
}) {
  const empresaId = searchParams.empresa_id || null;
  const fechaCorte =
    searchParams.fecha ?? new Date().toISOString().slice(0, 10);

  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasUsuario)
    .order("codigo")) as unknown as { data: EmpresaOpt[] | null };

  const balance = await obtenerBalanceGeneral(empresaId, fechaCorte);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-8 py-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lbl-mini">Estados Gerenciales</p>
          <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
            Balance General
          </h1>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Al {new Date(fechaCorte).toLocaleDateString("es-MX")}
          </p>
        </div>
        <SelectorEmpresa empresas={empresas ?? []} valor={empresaId ?? undefined} />
      </div>

      <section className="rounded-md border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* ACTIVOS */}
          <div className="border-b lg:border-b-0 lg:border-r border-border p-5">
            <h2 className="mb-3 text-[14px] font-semibold uppercase tracking-wide text-ink-2">
              Activos
            </h2>

            <div className="mb-4">
              <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                Circulantes
              </h3>
              <Linea
                etiqueta="Bancos"
                valor={balance.activos.circulantes.bancos}
              />
              <Linea
                etiqueta="Cuentas por cobrar"
                valor={balance.activos.circulantes.cxc_total}
                detalle={
                  balance.activos.circulantes.cxc_vencida > 0
                    ? `${fmtMxn.format(balance.activos.circulantes.cxc_vencida)} vencida`
                    : undefined
                }
              />
              <Linea
                etiqueta="Inventario"
                valor={balance.activos.circulantes.inventario}
              />
              <Subtotal
                etiqueta="Subtotal circulantes"
                valor={balance.activos.circulantes.total}
              />
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                Fijos
              </h3>
              <Linea
                etiqueta="Vehículos"
                valor={balance.activos.fijos.vehiculos}
              />
              <Linea
                etiqueta="Activos del grupo"
                valor={balance.activos.fijos.activos_grupo}
              />
              <Subtotal
                etiqueta="Subtotal fijos"
                valor={balance.activos.fijos.total}
              />
            </div>

            <Total etiqueta="Total Activos" valor={balance.activos.total} />
          </div>

          {/* PASIVOS + CAPITAL */}
          <div className="p-5">
            <h2 className="mb-3 text-[14px] font-semibold uppercase tracking-wide text-ink-2">
              Pasivos
            </h2>

            <div className="mb-4">
              <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                Corto plazo
              </h3>
              <Linea
                etiqueta="Cuentas por pagar"
                valor={balance.pasivos.corto_plazo.cxp}
              />
              <Subtotal
                etiqueta="Subtotal corto plazo"
                valor={balance.pasivos.corto_plazo.total}
              />
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-ink-3">
                Largo plazo
              </h3>
              <Linea
                etiqueta="Créditos inter-co"
                valor={balance.pasivos.largo_plazo.creditos_inter_co}
              />
              <Subtotal
                etiqueta="Subtotal largo plazo"
                valor={balance.pasivos.largo_plazo.total}
              />
            </div>

            <Total etiqueta="Total Pasivos" valor={balance.pasivos.total} />

            <div className="mt-6 border-t border-border pt-4">
              <h2 className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-ink-2">
                Capital
              </h2>
              <Total
                etiqueta="Capital (calculado)"
                valor={balance.capital.calculado}
                tono={balance.capital.calculado >= 0 ? "ok" : "danger"}
              />
              <p className="mt-2 text-[11px] text-ink-3">
                Activos − Pasivos. Es estimación gerencial, no incluye reservas
                ni utilidades retenidas formales del despacho.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Linea({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string;
  valor: number;
  detalle?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 py-1.5 text-[12.5px]">
      <span>
        {etiqueta}
        {detalle && (
          <span className="ml-2 text-[10.5px] text-ink-3">({detalle})</span>
        )}
      </span>
      <span className="font-mono tnum">{fmtMxn.format(valor)}</span>
    </div>
  );
}

function Subtotal({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="mt-2 flex items-baseline justify-between border-t border-border py-2 text-[12.5px] font-medium">
      <span>{etiqueta}</span>
      <span className="font-mono font-semibold tnum">{fmtMxn.format(valor)}</span>
    </div>
  );
}

function Total({
  etiqueta,
  valor,
  tono,
}: {
  etiqueta: string;
  valor: number;
  tono?: "ok" | "danger";
}) {
  const cls =
    tono === "ok"
      ? "text-ok-deep"
      : tono === "danger"
        ? "text-danger-deep"
        : "";
  return (
    <div className="mt-3 flex items-baseline justify-between rounded-md bg-bg-2 px-3 py-2.5 text-[14px] font-semibold">
      <span>{etiqueta}</span>
      <span className={`font-mono tnum ${cls}`}>{fmtMxn.format(valor)}</span>
    </div>
  );
}
