/**
 * Helpers compartidos por los widgets del dashboard v2.
 */

export const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export const fmtMxnCompact = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
  notation: "compact",
});

export const fmtNum = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 0,
});

export function pct(num: number, den: number): number {
  if (!den || den === 0) return 0;
  return (num / den) * 100;
}

export function colorMargen(pctMargen: number, objetivo: number): "ok" | "warn" | "danger" {
  if (objetivo > 0 && pctMargen >= objetivo) return "ok";
  if (pctMargen >= objetivo * 0.8) return "warn";
  return "danger";
}
