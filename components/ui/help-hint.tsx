import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function HelpHint({
  children,
  severity = "info",
}: {
  children: ReactNode;
  severity?: "info" | "warning" | "success";
}) {
  const Icon = severity === "warning" ? AlertTriangle : severity === "success" ? CheckCircle2 : Info;
  return (
    <div
      className={cn(
        "flex gap-2 rounded-md p-3 text-[12.5px]",
        severity === "info" && "bg-blue-50 text-blue-900",
        severity === "warning" && "bg-amber-50 text-amber-900",
        severity === "success" && "bg-emerald-50 text-emerald-900",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function KbdShortcut({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex gap-1">
      {keys.map((k, i) => (
        <kbd
          key={i}
          className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-2 shadow-sm"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
}
