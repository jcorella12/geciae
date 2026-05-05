"use client";

import { useState } from "react";

const SHA = process.env.NEXT_PUBLIC_BUILD_SHA ?? "dev";
const REF = process.env.NEXT_PUBLIC_BUILD_REF ?? "local";
const DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? "";

function fmtFecha(iso: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

/**
 * Badge discreto en esquina inferior derecha con la versión del build.
 * Click expande detalles (SHA completo, branch, fecha exacta).
 *
 * Útil cuando varios usuarios reportan bugs: pueden mencionar la versión
 * que ven y confirma si están en la última.
 */
export function VersionBadge() {
  const [open, setOpen] = useState(false);
  const corto = `${SHA}@${REF.length > 16 ? REF.slice(0, 16) + "…" : REF}`;

  return (
    <div className="pointer-events-auto fixed bottom-2 right-2 z-50 select-none">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="rounded-md border border-border bg-card/80 px-2 py-1 font-mono text-[10px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:bg-card hover:text-foreground"
        title="Versión del build"
      >
        {corto}
      </button>
      {open && (
        <div className="mt-1 w-72 rounded-md border border-border bg-card p-3 text-xs shadow-md">
          <div className="space-y-2">
            <div>
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                Commit
              </span>
              <p className="mt-0.5 break-all font-mono">{SHA}</p>
            </div>
            <div>
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                Rama
              </span>
              <p className="mt-0.5 break-all font-mono">{REF}</p>
            </div>
            <div>
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                Fecha del commit
              </span>
              <p className="mt-0.5">{fmtFecha(DATE)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-md border border-border bg-secondary px-2 py-1 text-xs hover:bg-secondary/80"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
