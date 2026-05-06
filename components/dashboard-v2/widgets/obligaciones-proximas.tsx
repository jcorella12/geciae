import { AlertCircle } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

type Obligacion = {
  id: string;
  tipo: string;
  periodo_label: string;
  fecha_vencimiento: string;
  empresa_id: string;
};

const TIPO_LABEL: Record<string, string> = {
  iva_mensual: "IVA mensual",
  isr_mensual: "ISR mensual",
  isr_retenciones: "ISR retenciones",
  iva_retenciones: "IVA retenciones",
  diot: "DIOT",
  isr_anual: "ISR anual",
  declaracion_anual: "Declaración anual",
  pago_provisional: "Pago provisional",
};

export async function ObligacionesProximas() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const empresasFiltro = Array.from(new Set(v.map((x) => x.empresa_id)));

  const hoy = new Date().toISOString().slice(0, 10);
  const en15 = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("obligaciones_sat")
    .select("id, tipo, periodo_label, fecha_vencimiento, empresa_id")
    .in("empresa_id", empresasFiltro)
    .in("estado", ["pendiente", "en_proceso"])
    .gte("fecha_vencimiento", hoy)
    .lte("fecha_vencimiento", en15)
    .order("fecha_vencimiento", { ascending: true })
    .limit(10)) as unknown as { data: Obligacion[] | null };

  const obligaciones = data ?? [];

  return (
    <Link href="/finanzas/cumplimiento" className="block">
      <div className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 text-warn-deep" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Obligaciones SAT próximas
        </span>
        <span className="ml-auto font-mono text-[11px] text-ink-3 tnum">
          {obligaciones.length}
        </span>
      </div>
      {obligaciones.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ok-deep">
          ✓ Sin vencimientos en próximos 15 días
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {obligaciones.slice(0, 6).map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-bg-2"
            >
              <div className="min-w-0">
                <div className="text-[11.5px] font-medium leading-tight">
                  {TIPO_LABEL[o.tipo] ?? o.tipo}
                </div>
                <div className="text-[10px] text-ink-3">{o.periodo_label}</div>
              </div>
              <span className="flex-shrink-0 font-mono text-[11px] text-ink-2 tnum">
                {o.fecha_vencimiento}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
