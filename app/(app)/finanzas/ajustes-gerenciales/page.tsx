import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  COLOR_ESTADO_AJUSTE,
  ETIQUETA_ESTADO_AJUSTE,
  ETIQUETA_TIPO_AJUSTE,
  type EstadoAjusteGerencial,
  type TipoAjusteGerencial,
} from "@/lib/ajustes-gerenciales/state";

import { listarAjustes } from "./actions";
import { FiltrosAjustes } from "./filtros-ajustes";

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajustes gerenciales" };

export default async function AjustesGerencialesPage({
  searchParams,
}: {
  searchParams: { tipo?: string; estado?: string; empresa_id?: string };
}) {
  const ajustes = await listarAjustes({
    tipo: searchParams.tipo,
    estado: searchParams.estado,
    empresa_id: searchParams.empresa_id,
  });

  const totalActivos = ajustes
    .filter((a) => a.naturaleza === "activo" && a.estado === "vigente")
    .reduce((s, a) => s + Number(a.valor_en_libros ?? a.valor), 0);

  const totalPasivos = ajustes
    .filter((a) => a.naturaleza === "pasivo" && a.estado === "vigente")
    .reduce((s, a) => s + Number(a.valor), 0);

  const totalCapital = ajustes
    .filter((a) => a.naturaleza === "capital" && a.estado === "vigente")
    .reduce((s, a) => s + Number(a.valor), 0);

  const enBorrador = ajustes.filter((a) => a.estado === "borrador").length;
  const numActivosVigentes = ajustes.filter(
    (a) => a.naturaleza === "activo" && a.estado === "vigente",
  ).length;
  const numPasivosVigentes = ajustes.filter(
    (a) => a.naturaleza === "pasivo" && a.estado === "vigente",
  ).length;
  const numCapitalVigentes = ajustes.filter(
    (a) => a.naturaleza === "capital" && a.estado === "vigente",
  ).length;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="lbl-mini">Finanzas · Restringido</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
            Ajustes Gerenciales
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Activos, pasivos y capital no registrados en contabilidad fiscal.
            Capa interna del grupo.
          </p>
        </div>
        <Button asChild>
          <Link href="/finanzas/ajustes-gerenciales/nuevo">
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo ajuste
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Activos ocultos"
          value={fmt.format(totalActivos)}
          sub={`${numActivosVigentes} ajuste(s) vigente(s)`}
          accent="brand"
        />
        <KpiCard
          label="Pasivos no registrados"
          value={fmt.format(totalPasivos)}
          sub={`${numPasivosVigentes} ajuste(s)`}
          accent="warn"
        />
        <KpiCard
          label="Capital no formalizado"
          value={fmt.format(totalCapital)}
          sub={`${numCapitalVigentes} ajuste(s)`}
          accent="ok"
        />
        <KpiCard
          label="En borrador"
          value={enBorrador}
          sub={enBorrador > 0 ? "Pendientes activar" : "Sin pendientes"}
          accent={enBorrador > 0 ? "warn" : "ok"}
        />
      </div>

      <FiltrosAjustes filtrosActuales={searchParams} />

      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-[12.5px]">
          <thead className="bg-bg-2 text-[10.5px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Código</th>
              <th className="px-3 py-2.5 text-left font-medium">Tipo</th>
              <th className="px-3 py-2.5 text-left font-medium">Empresa</th>
              <th className="px-3 py-2.5 text-left font-medium">Descripción</th>
              <th className="px-3 py-2.5 text-right font-medium">Valor</th>
              <th className="px-3 py-2.5 text-right font-medium">En libros</th>
              <th className="px-3 py-2.5 text-left font-medium">Estado</th>
              <th className="px-3 py-2.5 text-left font-medium">Adquirido</th>
            </tr>
          </thead>
          <tbody>
            {ajustes.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-12 text-center text-[13px] text-ink-3"
                >
                  Sin ajustes registrados.{" "}
                  <Link
                    href="/finanzas/ajustes-gerenciales/nuevo"
                    className="text-brand hover:underline"
                  >
                    Crear el primero →
                  </Link>
                </td>
              </tr>
            ) : (
              ajustes.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-bg-2/40">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/finanzas/ajustes-gerenciales/${a.id}`}
                      className="font-mono text-[11px] text-brand hover:underline"
                    >
                      {a.codigo}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-[11.5px]">
                    {ETIQUETA_TIPO_AJUSTE[a.tipo as TipoAjusteGerencial]}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">
                    {a.empresa_codigo}
                  </td>
                  <td className="max-w-xs truncate px-3 py-2.5">
                    {a.descripcion}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {fmt.format(Number(a.valor))}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {fmt.format(Number(a.valor_en_libros ?? a.valor))}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                        COLOR_ESTADO_AJUSTE[a.estado as EstadoAjusteGerencial]
                      }`}
                    >
                      {ETIQUETA_ESTADO_AJUSTE[a.estado as EstadoAjusteGerencial]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-ink-3">
                    {new Date(a.fecha_adquisicion).toLocaleDateString("es-MX")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
