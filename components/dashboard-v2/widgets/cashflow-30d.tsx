import { TrendingUp } from "lucide-react";

import { fmtMxnCompact } from "./_utils";

/**
 * Versión simplificada del cashflow (placeholder funcional). El componente
 * existente <CashflowChart> en components/dashboard se puede integrar en
 * una iteración futura para tener gráfica real.
 */
export async function Cashflow30d() {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Cashflow próximos 30 días
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <div className="text-[11px] text-ink-3">Entradas estimadas</div>
          <div className="mt-1 font-mono text-[15px] font-semibold text-ok-deep tnum">
            {fmtMxnCompact.format(0)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-ink-3">Salidas estimadas</div>
          <div className="mt-1 font-mono text-[15px] font-semibold text-danger-deep tnum">
            {fmtMxnCompact.format(0)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-ink-3">Neto</div>
          <div className="mt-1 font-mono text-[15px] font-semibold tnum">
            {fmtMxnCompact.format(0)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-ink-3">
        💡 Próxima iteración integra timeline diario con CFDIs por cobrar y obligaciones SAT.
      </p>
    </div>
  );
}
