import Link from "next/link";
import { redirect } from "next/navigation";

import { obtenerVinculos, puedeAccederConfiguracion } from "@/lib/auth/permisos";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/configuracion/usuarios", label: "Usuarios" },
  { href: "/configuracion/ia", label: "IA" },
] as const;

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vinculos = await obtenerVinculos();
  if (!puedeAccederConfiguracion(vinculos)) {
    redirect("/mi-dia");
  }

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
