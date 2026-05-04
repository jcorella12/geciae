import { cn } from "@/lib/utils";

/**
 * Barra dual: planeado vs real (curva-S simplificada).
 * El relleno gris claro = planeado. El brand color = real.
 * Si real > planeado, usa color danger (sobreavance / desviación).
 */
export function DualBar({
  planned,
  actual,
  max = 100,
  height = 18,
  className,
  ariaLabel,
}: {
  planned: number;
  actual: number;
  max?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const pp = Math.min(100, (planned / max) * 100);
  const ap = Math.min(100, (actual / max) * 100);
  const over = actual > planned;
  return (
    <div
      role="img"
      aria-label={
        ariaLabel ??
        `Avance ${actual} de ${max}, planeado ${planned}`
      }
      className={cn("relative overflow-hidden rounded bg-bg-3", className)}
      style={{ height }}
      title={`Real ${actual}% · plan ${planned}%`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-ink-5"
        style={{ width: `${pp}%` }}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 opacity-90",
          over ? "bg-danger" : "bg-brand",
        )}
        style={{ width: `${ap}%` }}
      />
    </div>
  );
}
