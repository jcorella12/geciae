import { Info } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";

import { TabsNav } from "./tabs-nav";

/**
 * Sprint EF.4 — Layout de Estados Gerenciales con guard + banner permanente.
 * Solo accesible para CEO + atributo contralor + atributo tesorero_corporativo.
 */
export default async function EstadosGerencialesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeVer } = await (supabase as any).rpc(
    "usuario_puede_ver_estados_gerenciales",
  );
  if (!puedeVer) redirect("/finanzas");

  // Vista Real (ajustes ocultos) es un tab extra solo para directivo.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeVerVistaReal } = await (supabase as any).rpc(
    "usuario_puede_ver_ajustes_gerenciales",
  );

  return (
    <div>
      {/* Banner permanente */}
      <div className="border-b border-blue-200 bg-blue-50 px-6 py-2.5">
        <div className="mx-auto flex max-w-[1480px] items-center gap-3">
          <Info className="h-4 w-4 flex-shrink-0 text-blue-700" />
          <div className="flex-1 text-[12.5px] text-blue-900">
            <span className="font-semibold">Estados Gerenciales.</span>{" "}
            Generados desde el ERP en tiempo real.{" "}
            <span className="font-semibold">
              NO son estados financieros oficiales
            </span>{" "}
            — los oficiales están en{" "}
            <Link
              href="/finanzas/estados-financieros"
              className="underline hover:text-blue-700"
            >
              Estados Financieros
            </Link>{" "}
            (PDFs del despacho).
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabsNav puedeVerVistaReal={!!puedeVerVistaReal} />

      {children}
    </div>
  );
}
