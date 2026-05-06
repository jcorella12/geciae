import Link from "next/link";

import { calcularAlertas } from "@/lib/dashboard-widgets/alertas-engine";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";

const ICONOS = {
  info: Info,
  warning: AlertCircle,
  danger: AlertTriangle,
} as const;

const CLASES = {
  info: "border-brand/20 bg-brand/5 text-ink-1",
  warning: "border-warn/30 bg-warn/5 text-ink-1",
  danger: "border-danger/30 bg-danger/5 text-ink-1",
} as const;

const ICON_CLASES = {
  info: "text-brand",
  warning: "text-warn-deep",
  danger: "text-danger-deep",
} as const;

/**
 * Server component que renderiza alertas dinámicas calculadas en tiempo real.
 * Reemplaza secciones permanentes del dashboard antiguo con alertas
 * "smart" que solo aparecen cuando algo se sale del rango esperado.
 */
export async function AlertasInteligentes({
  empresaId = null,
}: {
  empresaId?: string | null;
}) {
  const supabase = createClient();
  const alertas = await calcularAlertas(supabase, empresaId);

  if (alertas.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-ok/20 bg-ok/5 px-4 py-3 text-[12.5px] text-ink-2">
        <CheckCircle2 className="h-4 w-4 text-ok-deep" />
        <span>Todo en orden, sin alertas activas</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alertas.map((a, i) => {
        const Icon = ICONOS[a.severidad];
        const contenido: ReactNode = (
          <div
            className={cn(
              "flex items-start gap-3 rounded-md border px-4 py-3 transition-colors",
              CLASES[a.severidad],
              a.url && "hover:opacity-80",
            )}
          >
            <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", ICON_CLASES[a.severidad])} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-snug">{a.titulo}</div>
              <div className="mt-0.5 text-[11.5px] text-ink-3">{a.mensaje}</div>
            </div>
          </div>
        );

        return a.url ? (
          <Link key={`${a.tipo}-${i}`} href={a.url} className="block">
            {contenido}
          </Link>
        ) : (
          <div key={`${a.tipo}-${i}`}>{contenido}</div>
        );
      })}
    </div>
  );
}
