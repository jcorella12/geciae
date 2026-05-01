import { LogOut } from "lucide-react";
import Link from "next/link";

import { EmpresaSwitcher } from "@/components/shared/empresa-switcher";
import { Button } from "@/components/ui/button";
import type { EmpresaResumen } from "@/lib/empresa-activa";

type Props = {
  email: string;
  empresas: EmpresaResumen[];
  activaId: string | null;
  puedeConsolidado: boolean;
};

export function AppTopbar({
  email,
  empresas,
  activaId,
  puedeConsolidado,
}: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4">
      <div className="flex items-center gap-3">
        <EmpresaSwitcher
          empresas={empresas}
          activaId={activaId}
          puedeConsolidado={puedeConsolidado}
        />
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/perfil"
          className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          title="Mi perfil"
        >
          {email}
        </Link>
        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="gap-2"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
