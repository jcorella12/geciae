import { AlertTriangle } from "lucide-react";

import { calcularAlertas } from "@/lib/dashboard-widgets/alertas-engine";
import { createClient } from "@/lib/supabase/server";

/**
 * Mini-versión del widget de alertas que solo muestra el COUNT de
 * alertas críticas. La lista completa se renderiza vía
 * <AlertasInteligentes /> cuando el usuario activa ese widget completo.
 */
export async function HeroAlertasCriticas({
  empresaId,
}: {
  empresaId?: string | null;
}) {
  const supabase = createClient();
  const alertas = await calcularAlertas(supabase, empresaId ?? null);
  const danger = alertas.filter((a) => a.severidad === "danger").length;
  const warn = alertas.filter((a) => a.severidad === "warning").length;
  const total = alertas.length;

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className={total > 0 ? "h-3.5 w-3.5 text-danger-deep" : "h-3.5 w-3.5 text-ink-3"} />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Alertas críticas
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={
            total > 0
              ? "font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum text-danger-deep"
              : "font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum"
          }
        >
          {total}
        </span>
        <span className="text-[12px] font-medium text-ink-3">activas</span>
      </div>
      {total === 0 ? (
        <p className="mt-2 text-[11px] text-ok-deep">✓ Todo en orden</p>
      ) : (
        <p className="mt-2 text-[11px] text-ink-3">
          {danger} críticas · {warn} de aviso
        </p>
      )}
      {alertas.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-2">
          {alertas.slice(0, 3).map((a, i) => (
            <li
              key={`${a.tipo}-${i}`}
              className="flex items-start gap-2 text-[11px]"
            >
              <span
                className={
                  a.severidad === "danger"
                    ? "mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-danger"
                    : "mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warn"
                }
              />
              <span className="line-clamp-1">{a.titulo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
