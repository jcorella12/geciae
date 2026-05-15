import Link from "next/link";
import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeAccederCentros,
  puedeAccederConfiguracion,
  puedeRestablecerContrasenas,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string };

const TAB_USUARIOS: Tab = {
  href: "/configuracion/usuarios",
  label: "Usuarios",
};
const TABS_CEO: Tab[] = [
  { href: "/configuracion/centros", label: "Centros" },
  { href: "/configuracion/umbrales", label: "Umbrales" },
  { href: "/configuracion/sgc", label: "SGC" },
  { href: "/configuracion/ia", label: "IA" },
  { href: "/configuracion/validacion", label: "Validación" },
];

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vinculos = await obtenerVinculos();
  // CEO accede a todo. Director/tesorero/auditor solo a Centros; contralor
  // entra para poder restablecer contraseñas de Usuarios. El gate de cada
  // sub-página lo refina.
  if (
    !puedeAccederConfiguracion(vinculos) &&
    !puedeAccederCentros(vinculos) &&
    !puedeRestablecerContrasenas(vinculos)
  ) {
    redirect("/mi-dia");
  }

  // Tab SAT solo si CEO o contralor
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeSat } = await (supabase as any).rpc(
    "usuario_puede_gestionar_sat",
  );

  // CEO ve todas las tabs; contralor solo Usuarios (+ SAT si aplica).
  const esCeo = puedeAccederConfiguracion(vinculos);
  const tabs: Tab[] = [
    ...(esCeo || puedeRestablecerContrasenas(vinculos)
      ? [TAB_USUARIOS]
      : []),
    ...(esCeo ? TABS_CEO : []),
    ...(puedeSat ? [{ href: "/configuracion/sat", label: "SAT" }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Configuración
        </p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          Panel administrativo
        </h1>
      </div>

      <nav className="mb-6 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
