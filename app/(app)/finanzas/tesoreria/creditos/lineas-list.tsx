"use client";

import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";

import { toggleLineaActiva } from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const fmtPct = new Intl.NumberFormat("es-MX", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

type Linea = {
  id: string;
  empresa_acreedora_id: string;
  empresa_deudora_id: string;
  monto_autorizado: number;
  monto_utilizado: number | null;
  monto_disponible: number | null;
  vigencia_inicio: string;
  vigencia_fin: string;
  tasa_base: string | null;
  spread: number | null;
  capitaliza_intereses: boolean | null;
  dia_corte: number | null;
  activa: boolean | null;
  acreedora: { codigo: string; nombre_comercial: string | null; razon_social: string } | null;
  deudora: { codigo: string; nombre_comercial: string | null; razon_social: string } | null;
};

export function LineasList({
  lineas,
  puedeGestionar,
}: {
  lineas: Linea[];
  puedeGestionar: boolean;
}) {
  const [, startTransition] = useTransition();

  function toggle(l: Linea) {
    startTransition(async () => {
      const res = await toggleLineaActiva(l.id, !(l.activa ?? false));
      if (!res.ok) notify({ message: res.error ?? "Error", variant: "error" });
    });
  }

  if (lineas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
        Sin líneas de crédito inter-co.
      </div>
    );
  }

  return (
    <TableSurface>
      <Table>
        <TableHeader>
          <TableRow interactive={false}>
            <TableHead>Acreedora → Deudora</TableHead>
            <TableHead align="right">Autorizado</TableHead>
            <TableHead align="right">Utilizado</TableHead>
            <TableHead align="right">Disponible</TableHead>
            <TableHead>Vigencia</TableHead>
            <TableHead>Tasa</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineas.map((l) => {
            const utilizado = Number(l.monto_utilizado ?? 0);
            const autorizado = Number(l.monto_autorizado ?? 0);
            const disponible = Number(l.monto_disponible ?? autorizado - utilizado);
            const pct = autorizado > 0 ? utilizado / autorizado : 0;
            return (
              <TableRow
                key={l.id}
                className={l.activa === false ? "opacity-60" : undefined}
              >
                <TableCell>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          empresaCodigoColor[l.acreedora?.codigo ?? ""] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      {l.acreedora?.codigo ?? "?"}
                    </span>
                    <span className="text-ink-3">→</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          empresaCodigoColor[l.deudora?.codigo ?? ""] ??
                          "bg-muted-foreground"
                        }`}
                      />
                      {l.deudora?.codigo ?? "?"}
                    </span>
                  </div>
                </TableCell>
                <TableCell align="right" mono>
                  {fmtMxn.format(autorizado)}
                </TableCell>
                <TableCell align="right">
                  <div className="font-mono">{fmtMxn.format(utilizado)}</div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-secondary">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${Math.min(pct * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-ink-3">
                    {(pct * 100).toFixed(1)}%
                  </p>
                </TableCell>
                <TableCell align="right" mono>
                  {fmtMxn.format(disponible)}
                </TableCell>
                <TableCell className="text-xs">
                  {new Date(l.vigencia_inicio).toLocaleDateString("es-MX")} →{" "}
                  {new Date(l.vigencia_fin).toLocaleDateString("es-MX")}
                </TableCell>
                <TableCell className="text-xs">
                  <p className="font-medium">
                    {l.tasa_base?.toUpperCase() ?? "—"}
                  </p>
                  <p className="text-ink-3">
                    + spread {fmtPct.format(Number(l.spread ?? 0))}
                  </p>
                  {l.capitaliza_intereses && (
                    <p className="text-[10px] text-amber-700">
                      capitaliza
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Link href={`/finanzas/tesoreria/prestamos?linea=${l.id}`}>
                      <Button size="sm" variant="outline" className="w-full">
                        Préstamos
                      </Button>
                    </Link>
                    {puedeGestionar && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(l)}
                      >
                        {l.activa === false ? "Activar" : "Desactivar"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableSurface>
  );
}
