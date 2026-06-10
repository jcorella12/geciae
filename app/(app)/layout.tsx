import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/shared/app-sidebar";
import { BottomNav } from "@/components/shared/bottom-nav";
import { MobileSidebarDrawer } from "@/components/shared/mobile-sidebar-drawer";
import { OfflineHandlers } from "@/components/shared/offline-handlers";
import { PageviewTracker } from "@/components/shared/pageview-tracker";
import { PeekProvider } from "@/components/shared/peek-provider";
import { VersionBadge } from "@/components/shared/version-badge";

// Todo el grupo (app) requiere sesión y consulta Supabase en cada request,
// por lo que no se puede prerenderizar estáticamente.
export const dynamic = "force-dynamic";
import { AppTopbar } from "@/components/shared/app-topbar";
import {
  esCEO,
  obtenerVinculosConEmpresa,
  puedeAccederConfiguracion,
  puedeGestionarClientes,
  puedeGestionarProveedores,
  puedeRestablecerContrasenas,
  tieneAtributo,
  type Vinculo,
} from "@/lib/auth/permisos";
import type { NavCaps } from "@/components/shared/app-sidebar";
import {
  EMPRESA_COOKIE,
  VISTA_CONSOLIDADA,
  puedeVerConsolidado,
  type EmpresaResumen,
} from "@/lib/empresa-activa";
import { getSidebarCollapsed } from "@/lib/preferences/sidebar";
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

  const vinculosLite = vinculos.map(({ empresa: _e, ...rest }) => rest);
  // Mostrar "Configuración" en la sidebar si tiene cualquier permiso
  // que le dé acceso a alguna pestaña (CEO completo, o contralor que solo
  // entra a Usuarios para restablecer contraseñas).
  const puedeConfiguracion =
    puedeAccederConfiguracion(vinculosLite) ||
    puedeRestablecerContrasenas(vinculosLite);

  // ¿Puede ver el módulo de Ajustes Gerenciales? (CEO + contralor + tesorero)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeAjustesData } = await (supabase as any).rpc(
    "usuario_puede_ver_ajustes_gerenciales",
  );
  const puedeAjustesGerenciales = Boolean(puedeAjustesData);

  // Capacidades de navegación — qué SECCIONES del sidebar ve el usuario.
  // Filosofía conservadora: lo operativo-personal (Mi día, Calendario,
  // Proyectos, Solicitudes, Campo, Tickets, Ayuda) es UNIVERSAL y no se
  // calcula aquí; solo gateamos lo gerencial/administrativo. Cuando hay
  // duda, mostramos (el RLS de cada página protege la acción real).
  // Un empleado de obra sin atributos verá un menú corto; los roles y
  // atributos van desbloqueando secciones.
  const v: Vinculo[] = vinculosLite;
  const esGerencial =
    esCEO(v) ||
    v.some((x) => x.rol === "director") ||
    tieneAtributo(v, "tesorero_corporativo") ||
    tieneAtributo(v, "contralor") ||
    tieneAtributo(v, "aprobador_financiero");
  const navCaps: NavCaps = {
    // Dashboard ejecutivo + Reportes: visión de negocio → roles gerenciales.
    gerencial: esGerencial,
    // Comercial (clientes, pipeline, cotizaciones, servicios): quien gestiona
    // clientes o es vendedor.
    comercial: puedeGestionarClientes(v) || tieneAtributo(v, "vendedor"),
    // Proveedores: quien los gestiona (ceo/director/operativo).
    proveedores: puedeGestionarProveedores(v),
    // Finanzas (OC, OT, CFDI, tesorería, gastos, cumplimiento): roles
    // financieros u operativos que generan compras.
    finanzas:
      esGerencial ||
      v.some((x) => x.rol === "operativo") ||
      tieneAtributo(v, "auditor_interno"),
    // Personas (gestión de empleados/nómina/capacitación): ceo, director, rh.
    personas:
      esCEO(v) ||
      v.some((x) => x.rol === "director") ||
      tieneAtributo(v, "rh") ||
      tieneAtributo(v, "contralor"),
    // Inventario y Activos: operación física → ceo/director/operativo o
    // supervisor de cuadrilla / almacén.
    inventarioActivos:
      esCEO(v) ||
      v.some((x) => x.rol === "director" || x.rol === "operativo") ||
      tieneAtributo(v, "supervisor_cuadrilla"),
  };

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

  const sidebarCollapsed = await getSidebarCollapsed();

  return (
    <PeekProvider>
      <PageviewTracker />
      <div className="flex h-screen overflow-hidden bg-bg-2">
        <div className="hidden md:flex">
          <AppSidebar
            puedeVerConfiguracion={puedeConfiguracion}
            puedeVerAjustesGerenciales={puedeAjustesGerenciales}
            navCaps={navCaps}
            empresas={empresas}
            activaId={activaId}
            puedeConsolidado={puedeConsolidado}
            collapsed={sidebarCollapsed}
            user={{
              name: nombreUsuario,
              initials,
              role: rolLabel,
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar email={user.email ?? ""} initials={initials} />
          <main className="flex-1 overflow-y-auto bg-bg-2 pb-16 md:pb-0">{children}</main>
        </div>
      </div>
      {/* Drawer móvil — el botón "Más" del BottomNav lo abre */}
      <MobileSidebarDrawer>
        <AppSidebar
          puedeVerConfiguracion={puedeConfiguracion}
          puedeVerAjustesGerenciales={puedeAjustesGerenciales}
          navCaps={navCaps}
          empresas={empresas}
          activaId={activaId}
          puedeConsolidado={puedeConsolidado}
          collapsed={false}
          user={{
            name: nombreUsuario,
            initials,
            role: rolLabel,
          }}
        />
      </MobileSidebarDrawer>
      <BottomNav />
      <VersionBadge />
      <OfflineHandlers />
    </PeekProvider>
  );
}
