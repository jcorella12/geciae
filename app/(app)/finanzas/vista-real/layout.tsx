import { Shield } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/server";

export default async function VistaRealLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puedeVer } = await (supabase as any).rpc(
    "usuario_puede_ver_ajustes_gerenciales",
  );
  if (!puedeVer) redirect("/finanzas");

  return (
    <div>
      <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5">
        <div className="mx-auto flex max-w-[1480px] items-center gap-3">
          <Shield className="h-4 w-4 flex-shrink-0 text-amber-700" />
          <div className="flex-1 text-[12.5px] text-amber-900">
            <span className="font-semibold">
              Vista interna confidencial.
            </span>{" "}
            Combina ajustes gerenciales con tu posición. NO compartir
            externamente.
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
