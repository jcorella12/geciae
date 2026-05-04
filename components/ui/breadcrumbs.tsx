import Link from "next/link";

import { cn } from "@/lib/utils";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

/**
 * Breadcrumbs textuales con separador `/`.
 * Último item color `--ink-1` (medium), anteriores `--ink-3`.
 */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-2 text-[13px]", className)}
    >
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <span className="text-ink-5">/</span>}
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-ink-3 transition-colors hover:text-ink-1"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  last ? "font-medium text-ink-1" : "text-ink-3"
                }
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
