import { Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  type AjusteTotalesRow,
  type ResumenAjustesGrupo,
} from "@/lib/ajustes-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

import { registrarVisualizacionDual } from "./actions";
import { BotonExportar } from "./boton-exportar";
import { SelectorEmpresa } from "./selector-empresa";
import { TablaVistaDual } from "./tabla-vista-dual";

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const dynamic = "force-dynamic";
export const metadata = { title: "Vista real" };

type EmpresaOpt = { id: string; codigo: string; nombre_comercial: string | null };

export default async function VistaRealPage({
  searchParams,
}: {
  searchParams: { empresa_id?: string };
}) {
  const supabase = createClient();

  // Guard adicional: el layout de estados-gerenciales deja pasar a directivo Y
  // administrativo, pero la Vista Real (ajustes ocultos) es solo para quien
  // puede ver ajustes gerenciales (directivo). Defensa en profundidad — el tab
  // ya se oculta en la nav, esto cubre el acceso directo por URL.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeVerVistaReal } = await (supabase as any).rpc(
    "usuario_puede_ver_ajustes_gerenciales",
  );
  if (!puedeVerVistaReal) redirect("/finanzas/estados-gerenciales");

  const empresaId = searchParams.empresa_id;
  await registrarVisualizacionDual(empresaId);

  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: empresas } = (await (supabase as any)
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .in("id", empresasUsuario)
    .order("codigo")) as unknown as { data: EmpresaOpt[] | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: resumenRaw } = await (supabase as any)
    .rpc("resumen_ajustes_grupo")
    .single();
  const resumen = (resumenRaw ?? {
    total_activos_ocultos: 0,
    total_pasivos_no_registrados: 0,
    total_capital_no_formalizado: 0,
    num_ajustes_vigentes: 0,
    num_ajustes_borrador: 0,
  }) as ResumenAjustesGrupo;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let qTotales = (supabase as any).from("v_ajustes_gerenciales_totales").select("*");
  if (empresaId) qTotales = qTotales.eq("empresa_id", empresaId);
  const { data: totalesRaw } = (await qTotales) as unknown as {
    data: AjusteTotalesRow[] | null;
  };
  const totales = totalesRaw ?? [];

  return (
    <div className="mx-auto w-full max-w-[1280px] px-8 py-7">
      {/* Aviso de confidencialidad (esta vista combina ajustes ocultos). */}
      <div className="mb-6 flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
        <Shield className="h-4 w-4 flex-shrink-0 text-amber-700" />
        <div className="flex-1 text-[12.5px] text-amber-900">
          <span className="font-semibold">Vista interna confidencial.</span>{" "}
          Combina ajustes gerenciales con tu posición. NO compartir
          externamente.
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="lbl-mini">Finanzas · Restringido</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
            Vista Real del Grupo
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Patrimonio incluyendo ajustes gerenciales no registrados en
            contabilidad fiscal.
          </p>
        </div>
        <BotonExportar empresaId={empresaId} />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] font-medium">Empresa:</span>
        <SelectorEmpresa empresas={empresas ?? []} valor={empresaId} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 rounded-md border border-border bg-card p-5 sm:grid-cols-3">
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
            Activos ocultos
          </div>
          <div className="mt-1 font-mono text-[24px] font-semibold tnum">
            {fmt.format(Number(resumen.total_activos_ocultos))}
          </div>
          <div className="mt-1 text-[11px] text-ink-3">
            Inventario, contenedores, equipo
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
            Pasivos no registrados
          </div>
          <div className="mt-1 font-mono text-[24px] font-semibold tnum">
            {fmt.format(Number(resumen.total_pasivos_no_registrados))}
          </div>
          <div className="mt-1 text-[11px] text-ink-3">
            Préstamos personales al negocio
          </div>
        </div>
        <div>
          <div className="text-[10.5px] uppercase tracking-wide text-ink-3">
            Capital no formalizado
          </div>
          <div className="mt-1 font-mono text-[24px] font-semibold tnum">
            {fmt.format(Number(resumen.total_capital_no_formalizado))}
          </div>
          <div className="mt-1 text-[11px] text-ink-3">
            Aportaciones del fundador
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-sky-200 bg-sky-50 p-4 text-[12.5px] text-sky-900">
        <strong>Cómo leer esta vista:</strong> los números abajo NO reemplazan
        el balance fiscal del despacho. Son ajustes gerenciales que se SUMAN al
        balance fiscal para mostrar la realidad económica. Para tu balance
        fiscal, ve a{" "}
        <Link
          href="/finanzas/estados-financieros"
          className="underline hover:text-sky-700"
        >
          Estados Financieros
        </Link>
        .
      </div>

      <TablaVistaDual totales={totales} />
    </div>
  );
}
