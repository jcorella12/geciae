import { cn } from "@/lib/utils";

export type KpiDelta = {
  dir: "up" | "down" | "flat";
  text: string;
};

const deltaCls: Record<KpiDelta["dir"], string> = {
  up: "text-ok-deep",
  down: "text-danger-deep",
  flat: "text-ink-3",
};

const deltaArrow: Record<KpiDelta["dir"], string> = {
  up: "▲",
  down: "▼",
  flat: "→",
};

/**
 * KPI estándar para grids 4×col-span. Label uppercase + valor mono grande
 * + delta + sub. Sparkline opcional como contenido children.
 */
export function KpiCard({
  label,
  value,
  unit,
  delta,
  sub,
  sparkline,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: React.ReactNode;
  delta?: KpiDelta;
  sub?: React.ReactNode;
  sparkline?: React.ReactNode;
  accent?: "brand" | "warn" | "danger" | "ok";
  className?: string;
}) {
  const accentDot: Record<NonNullable<typeof accent>, string> = {
    brand: "bg-brand",
    warn: "bg-warn",
    danger: "bg-danger",
    ok: "bg-ok",
  };
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-sm",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {accent && (
            <span
              className={cn("inline-block h-1.5 w-1.5 rounded-full", accentDot[accent])}
              aria-hidden
            />
          )}
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            {label}
          </span>
        </div>
        {sparkline}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-0.02em] tnum">
          {value}
        </span>
        {unit && (
          <span className="text-[12px] font-medium text-ink-3">{unit}</span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[11.5px] font-medium",
              deltaCls[delta.dir],
            )}
          >
            <span aria-hidden>{deltaArrow[delta.dir]}</span>
            {delta.text}
          </span>
        )}
        {sub !== undefined && (
          <span className="text-[11.5px] text-ink-3">{sub}</span>
        )}
      </div>
    </div>
  );
}
