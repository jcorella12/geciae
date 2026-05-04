import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { PeekProvider } from "@/components/shared/peek-provider";

// Todo el grupo (app) requiere sesión y consulta Supabase en cada request,
// por lo que no se puede prerenderizar estáticamente.
export const dynamic = "force-dynamic";
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

  // Datos del user-card en sidebar
  const primerVinculo = vinculos[0];
  const nombreUsuario = user.email?.split("@")[0] ?? "Usuario";
  const initials = (() => {
    const partes = nombreUsuario.split(/[._-]/).filter(Boolean);
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombreUsuario.slice(0, 2).toUpperCase();
  })();
  const rolLabel = primerVinculo
    ? primerVinculo.rol.toUpperCase()
    : "USUARIO";

  return (
    <PeekProvider>
      <div className="flex h-screen overflow-hidden bg-bg-2">
        <AppSidebar
          puedeVerConfiguracion={puedeConfiguracion}
          empresas={empresas}
          activaId={activaId}
          puedeConsolidado={puedeConsolidado}
          user={{
            name: nombreUsuario,
            initials,
            role: rolLabel,
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar email={user.email ?? ""} initials={initials} />
          <main className="flex-1 overflow-y-auto bg-bg-2">{children}</main>
        </div>
      </div>
    </PeekProvider>
  );
}
