import { cn } from "@/lib/utils";

import { StatusDot, type StatusLevel } from "./status-dot";

/**
 * Item de lista de alertas con dot de severidad a la izquierda.
 * Para usar dentro de un panel "Alertas" en dashboards.
 */
export function AlertItem({
  severity,
  title,
  meta,
  action,
  className,
}: {
  severity: StatusLevel;
  title: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3",
        className,
      )}
    >
      <StatusDot status={severity} className="mt-1.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium leading-snug">{title}</div>
        {meta !== undefined && (
          <div className="mt-0.5 text-[11.5px] text-ink-3">{meta}</div>
        )}
      </div>
      {action}
    </div>
  );
}
