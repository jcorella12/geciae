import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";

import { DensityToggle } from "@/components/shared/density-toggle";
import { NotificationBell } from "@/components/shared/notification-bell";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { SearchTrigger } from "@/components/shared/search-trigger";
import { SugerirMejoraButton } from "@/components/shared/sugerir-mejora-button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  TopbarCreateButton,
  type CreateOption,
} from "@/components/shared/topbar-create-button";
import { TopbarBreadcrumbs } from "@/components/shared/topbar-breadcrumbs";
import { VersionInfo } from "@/components/shared/version-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  empresasDondeCreaOC,
  empresasDondeGestionaEmpleados,
  empresasDondeGestionaProyectos,
  esCEO,
  obtenerVinculos,
  puedeGestionarClientes,
  puedeGestionarProveedores,
  tieneAtributo,
} from "@/lib/auth/permisos";

type Props = {
  email: string;
  initials: string;
};

export async function AppTopbar({ email, initials }: Props) {
  const v = await obtenerVinculos();

  const options: CreateOption[] = [];

  if (empresasDondeCreaOC(v).length > 0) {
    options.push({
      href: "/finanzas/oc/nueva",
      label: "Orden de compra",
      description: "Capturar OC con conceptos",
      icon: "oc",
      group: "operacion",
    });
  }

  options.push({
    href: "/finanzas/cfdi/nuevo",
    label: "Registrar CFDI",
    description: "Subir XML/PDF timbrado",
    icon: "cfdi",
    group: "operacion",
  });

  if (
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    v.some((vi) => ["director", "operativo"].includes(vi.rol))
  ) {
    options.push({
      href: "/finanzas/ot/nueva",
      label: "OT inter-co",
      description: "Servicio entre empresas del grupo",
      icon: "ot",
      group: "operacion",
    });
  }

  if (empresasDondeGestionaProyectos(v).length > 0) {
    options.push({
      href: "/proyectos/nuevo",
      label: "Proyecto",
      description: "Nuevo proyecto cliente",
      icon: "proyecto",
      group: "operacion",
    });
  }

  if (puedeGestionarClientes(v)) {
    options.push({
      href: "/clientes/nuevo",
      label: "Cliente",
      icon: "cliente",
      group: "comercial",
    });
  }

  if (puedeGestionarProveedores(v)) {
    options.push({
      href: "/finanzas/proveedores/nuevo",
      label: "Proveedor",
      icon: "proveedor",
      group: "comercial",
    });
  }

  if (empresasDondeGestionaEmpleados(v).length > 0) {
    options.push({
      href: "/personas/nuevo",
      label: "Empleado",
      icon: "empleado",
      group: "personas",
    });
  }

  if (esCEO(v) || tieneAtributo(v, "tesorero_corporativo")) {
    options.push({
      href: "/finanzas/tesoreria/prestamos/nuevo",
      label: "Préstamo inter-co",
      description: "Solicitar disposición sobre línea",
      icon: "prestamo",
      group: "tesoreria",
    });
  }

  return (
    <header
      className="flex shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:gap-3 md:px-6"
      style={{ height: "var(--topbar-h)" }}
    >
      <div className="hidden md:block">
        <TopbarBreadcrumbs />
      </div>

      <div className="ml-auto">
        <SearchTrigger />
      </div>

      <div className="hidden md:block">
        <DensityToggle variant="icon" />
      </div>

      <div className="hidden md:block">
        <ThemeToggle compact />
      </div>

      <div className="hidden md:block">
        <SugerirMejoraButton />
      </div>

      <OfflineIndicator />

      <NotificationBell />

      <TopbarCreateButton options={options} />

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11.5px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menú de usuario"
        >
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[14rem]">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/perfil">Mi perfil</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/configuracion">Configuración</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/perfil/contrasena" className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Restablecer contraseña
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <form action="/auth/signout" method="post" className="w-full">
              <button
                type="submit"
                className="flex w-full items-center gap-2 text-left"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <VersionInfo />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
