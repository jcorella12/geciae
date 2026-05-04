import { cn } from "@/lib/utils";

/**
 * KPI destacado fondo navy (brand) — usado como primer KPI en el dashboard.
 * Ocupa col-span-mayor (e.g. 1.2fr en grid 4 cols).
 */
export function KpiFeature({
  label,
  value,
  unit,
  stats,
  sparkline,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  /**
   * Hasta 3 mini-stats inline al pie del KPI: vs anterior, vs meta, YTD…
   */
  stats?: Array<{ label: string; value: React.ReactNode }>;
  sparkline?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-brand p-5 text-brand-fg shadow-sm",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 100%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/70">
          {label}
        </span>
        {sparkline}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-[34px] font-semibold leading-none tracking-[-0.02em] tnum">
          {value}
        </span>
        {unit && (
          <span className="text-[13px] font-medium text-white/75">{unit}</span>
        )}
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-4 flex gap-5">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/70">
                {s.label}
              </div>
              <div className="mt-0.5 text-[14px] font-semibold tnum">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
