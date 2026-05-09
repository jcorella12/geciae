import { CheckCircle2, FileWarning, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { fmtFechaCorta } from "@/lib/fechas";
import type { FielEnriquecida } from "@/lib/sat/state";

const COLOR_VIGENCIA = {
  vigente: "border-emerald-200 bg-emerald-50",
  por_vencer: "border-amber-300 bg-amber-50",
  vencida: "border-red-300 bg-red-50",
} as const;

const ICON_VIGENCIA = {
  vigente: CheckCircle2,
  por_vencer: FileWarning,
  vencida: ShieldAlert,
} as const;

const COLOR_ICON_VIGENCIA = {
  vigente: "text-emerald-700",
  por_vencer: "text-amber-700",
  vencida: "text-red-700",
} as const;

export function TablaFiels({
  empresas,
  fiels,
}: {
  empresas: Array<{ id: string; codigo: string; rfc: string }>;
  fiels: FielEnriquecida[];
}) {
  const fielByEmpresa = new Map(fiels.map((f) => [f.empresa_id, f]));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {empresas.map((e) => {
        const fiel = fielByEmpresa.get(e.id);
        if (!fiel) {
          return (
            <div
              key={e.id}
              className="rounded-md border border-dashed border-border bg-card p-4"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold">
                  {e.codigo}
                </span>
                <span className="text-[10.5px] text-ink-3">{e.rfc}</span>
              </div>
              <p className="mb-3 text-[12px] text-ink-3">
                Sin FIEL registrada para esta empresa.
              </p>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/configuracion/sat/nueva-fiel?empresa_id=${e.id}`}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Subir FIEL
                </Link>
              </Button>
            </div>
          );
        }

        const Icon = ICON_VIGENCIA[fiel.estatus_vigencia];
        return (
          <div
            key={e.id}
            className={`rounded-md border p-4 ${COLOR_VIGENCIA[fiel.estatus_vigencia]}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold">
                {e.codigo}
              </span>
              <Icon
                className={`h-4 w-4 ${COLOR_ICON_VIGENCIA[fiel.estatus_vigencia]}`}
              />
            </div>
            <div className="text-[10.5px] font-mono text-ink-3">{fiel.rfc}</div>
            <div className="mt-3 space-y-1 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-ink-3">Vigencia</span>
                <span className="font-mono">
                  {fmtFechaCorta(fiel.vigencia_hasta)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Días restantes</span>
                <span
                  className={`font-mono font-semibold tnum ${
                    fiel.estatus_vigencia === "vencida"
                      ? "text-red-700"
                      : fiel.estatus_vigencia === "por_vencer"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {fiel.dias_restantes < 0
                    ? `${Math.abs(fiel.dias_restantes)} vencida`
                    : fiel.dias_restantes}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Veces usada</span>
                <span className="font-mono tnum">{fiel.veces_usada}</span>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full">
              <Link href={`/configuracion/sat/nueva-fiel?empresa_id=${e.id}`}>
                Reemplazar FIEL
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
