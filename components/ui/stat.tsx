import { cn } from "@/lib/utils";

/**
 * Bloque "stat con etiqueta" — label uppercase 10.5px + valor mono debajo.
 * Para usar en grids de cards de información (no KPIs grandes).
 */
export function Stat({
  label,
  value,
  sub,
  color,
  mono = true,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-[18px] font-semibold leading-tight tracking-[-0.02em]",
          mono && "tnum",
        )}
        style={{ color: color ?? "var(--ink-1)" }}
      >
        {value}
      </div>
      {sub !== undefined && (
        <div className="mt-0.5 text-[11px] text-ink-3">{sub}</div>
      )}
    </div>
  );
}
