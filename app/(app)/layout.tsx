import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { AppTopbar } from "@/components/shared/app-topbar";
import {
  obtenerVinculosConEmpresa,
  puedeAccederConfiguracion,
} from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  VISTA_CONSOLIDADA,
  puedeVerConsolidado,
  type EmpresaResumen,
} from "@/lib/empresa-activa";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const vinculos = await obtenerVinculosConEmpresa();

  const empresas: EmpresaResumen[] = vinculos
    .map((v) => v.empresa)
    .filter((e): e is EmpresaResumen => Boolean(e));

  const puedeConsolidado = puedeVerConsolidado(vinculos);

  const cookieValue = cookies().get(EMPRESA_COOKIE)?.value ?? null;
  const activaId =
    cookieValue === VISTA_CONSOLIDADA && puedeConsolidado
      ? VISTA_CONSOLIDADA
      : empresas.find((e) => e.id === cookieValue)?.id ??
        empresas[0]?.id ??
        null;

  const puedeConfiguracion = puedeAccederConfiguracion(
    vinculos.map(({ empresa: _e, ...rest }) => rest),
  );

  // Banda superior: refuerza visualmente en qué empresa estás operando.
  const empresaActiva =
    activaId && activaId !== VISTA_CONSOLIDADA
      ? empresas.find((e) => e.id === activaId) ?? null
      : null;

  const bandaClase: Record<string, string> = {
    PSE: "bg-pse",
    CIAE: "bg-ciae",
    IED: "bg-ied",
    LIMSON: "bg-limson",
  };
  const bandaColor = empresaActiva
    ? bandaClase[empresaActiva.codigo] ?? "bg-muted"
    : activaId === VISTA_CONSOLIDADA
      ? "bg-gradient-to-r from-pse via-ciae via-30% via-ied via-70% to-limson"
      : "bg-muted";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div className={`h-1 shrink-0 ${bandaColor}`} aria-hidden="true" />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar puedeVerConfiguracion={puedeConfiguracion} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar
            email={user.email ?? ""}
            empresas={empresas}
            activaId={activaId}
            puedeConsolidado={puedeConsolidado}
          />
          <main className="flex-1 overflow-y-auto bg-secondary/30">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
