import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Primitives de tabla v2.
 *
 * Specs (densidad comfy):
 * - Padding celda: 12px 16px
 * - Header: uppercase 11px letter-spacing 0.06em color ink-3, bg bg-2, border-bottom strong
 * - Números: font-mono tabular-nums, alineados a la derecha
 * - Row hover: bg bg-2
 * - Border row: divider 1px
 *
 * Densidad compact (data-density="compact" en <html>): padding 8px 14px, row 32px.
 */

const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full text-[13px]", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-bg-2 text-left", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("divide-y divide-divider", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t-2 border-border-strong bg-bg-2/60 font-medium",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }
>(({ className, interactive = true, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors",
      interactive && "hover:bg-bg-2",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

type HeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
};

const TableHead = forwardRef<HTMLTableCellElement, HeadProps>(
  ({ className, align = "left", ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "border-b border-border-strong px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

type CellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  mono?: boolean;
};

const TableCell = forwardRef<HTMLTableCellElement, CellProps>(
  ({ className, align = "left", mono = false, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3",
        align === "right" && "text-right",
        align === "center" && "text-center",
        mono && "font-mono tnum",
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

/**
 * Wrapper para envolver una tabla en un contenedor con borde + sombra.
 * Si la tabla está dentro de un Card más grande no lo uses.
 */
const TableSurface = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden rounded-md border border-border bg-card shadow-xs",
      className,
    )}
    {...props}
  />
));
TableSurface.displayName = "TableSurface";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableSurface,
};
