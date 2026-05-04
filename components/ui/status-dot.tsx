import { cn } from "@/lib/utils";

export type StatusLevel = "ok" | "warning" | "danger" | "idle" | "info";

const map: Record<StatusLevel, string> = {
  ok: "bg-ok",
  warning: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  idle: "bg-ink-5",
};

/**
 * Dot 8px de estado — alternativa al badge cuando la celda es ancha y
 * el color/severidad es lo único importante.
 */
export function StatusDot({
  status,
  className,
  size = 8,
}: {
  status: StatusLevel;
  className?: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full", map[status], className)}
      style={{ width: size, height: size }}
    />
  );
}
