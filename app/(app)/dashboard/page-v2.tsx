import { Suspense } from "react";
import { cookies } from "next/headers";

import { DashboardToolbar } from "@/components/dashboard-v2/dashboard-toolbar";
import { WidgetGrid } from "@/components/dashboard-v2/widget-grid";
import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
  VISTA_CONSOLIDADA,
} from "@/lib/empresa-activa";

import { obtenerPreferencias } from "./widget-actions";

/**
 * Sprint Z.1.5.B — Dashboard V2 (configurable con widgets).
 *
 * Reemplaza al dashboard saturado de 1,514 líneas por un sistema de
 * widgets configurables con plantillas por rol, modo compacto y alertas
 * inteligentes. ~80 líneas vs 1,514.
 *
 * Activado vía feature flag NEXT_PUBLIC_DASHBOARD_V2=true.
 */
export default async function DashboardV2() {
  const v = await obtenerVinculos();
  const principal = v[0];
  const atributos = principal?.atributos ?? [];

  // Resolver empresa activa (para widgets que usan empresaId)
  const cookieValue = cookies().get(EMPRESA_COOKIE)?.value ?? null;
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));
  const filtro = resolverEmpresasFiltro({
    cookieValue,
    empresasUsuario,
    puedeConsolidado: puedeVerConsolidado(v),
  });
  const empresaActiva =
    filtro.activaId === VISTA_CONSOLIDADA ? null : (filtro.activaId ?? null);

  const prefs = await obtenerPreferencias();

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <header className="mb-6">
        <p className="lbl-mini">Inicio</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Personaliza los widgets que más te sirven. Compacto deja solo lo crítico.
        </p>
      </header>

      <DashboardToolbar
        modoCompacto={prefs.modo_compacto}
        vistaActiva={prefs.vista_activa}
        layout={prefs.layout}
        atributosUsuario={atributos}
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <WidgetGrid
          layout={prefs.layout}
          modoCompacto={prefs.modo_compacto}
          empresaId={empresaActiva}
        />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="col-span-12 h-32 animate-pulse rounded-md bg-bg-2 md:col-span-4"
        />
      ))}
    </div>
  );
}
