"use client";

import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { actualizarUmbralesVinculo } from "./actions";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export type AprobadorFila = {
  usuarioId: string;
  email: string;
  empresaId: string;
  empresaCodigo: string;
  empresaNombre: string;
  rol: string;
  puesto: string | null;
  esCeo: boolean;
  umbralOc: number | null;
  umbralOt: number | null;
  umbralPrestamo: number | null;
};

const fmtMxn = (n: number | null): string => {
  if (n == null) return "—";
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
};

export function UmbralesTabla({ filas }: { filas: AprobadorFila[] }) {
  if (filas.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Sin aprobadores configurados. Asigna el atributo{" "}
        <code className="font-mono">aprobador_financiero</code> a algún
        usuario desde su ficha.
      </div>
    );
  }

  // Agrupar por empresa para mejor escaneo visual.
  const porEmpresa = new Map<string, AprobadorFila[]>();
  for (const f of filas) {
    const arr = porEmpresa.get(f.empresaCodigo) ?? [];
    arr.push(f);
    porEmpresa.set(f.empresaCodigo, arr);
  }

  return (
    <div className="space-y-4">
      {Array.from(porEmpresa.entries()).map(([codigo, filasEmp]) => (
        <section
          key={codigo}
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        >
          <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-4 py-2">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${codigoColor[codigo] ?? "bg-muted-foreground"}`}
            />
            <h3 className="text-[13px] font-semibold uppercase tracking-wide">
              {codigo} · {filasEmp[0].empresaNombre}
            </h3>
            <span className="ml-auto text-[11px] text-muted-foreground">
              {filasEmp.length} aprobador{filasEmp.length === 1 ? "" : "es"}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/30 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Usuario</th>
                <th className="px-4 py-2 font-medium">Rol / Puesto</th>
                <th className="px-4 py-2 text-right font-medium">
                  Tope OC
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  Tope OT inter-co
                </th>
                <th className="px-4 py-2 text-right font-medium">
                  Tope Préstamo
                </th>
                <th className="px-4 py-2 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filasEmp.map((f) => (
                <FilaAprobador
                  key={`${f.usuarioId}-${f.empresaId}`}
                  fila={f}
                />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function FilaAprobador({ fila }: { fila: AprobadorFila }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [oc, setOc] = useState<string>(
    fila.umbralOc != null ? String(fila.umbralOc) : "",
  );
  const [ot, setOt] = useState<string>(
    fila.umbralOt != null ? String(fila.umbralOt) : "",
  );
  const [prestamo, setPrestamo] = useState<string>(
    fila.umbralPrestamo != null ? String(fila.umbralPrestamo) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setOc(fila.umbralOc != null ? String(fila.umbralOc) : "");
    setOt(fila.umbralOt != null ? String(fila.umbralOt) : "");
    setPrestamo(
      fila.umbralPrestamo != null ? String(fila.umbralPrestamo) : "",
    );
    setEditing(false);
    setError(null);
  }

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await actualizarUmbralesVinculo({
        usuarioId: fila.usuarioId,
        empresaId: fila.empresaId,
        umbralOc: oc === "" ? null : Number(oc),
        umbralOt: ot === "" ? null : Number(ot),
        umbralPrestamo: prestamo === "" ? null : Number(prestamo),
      });
      if (!r.ok) {
        setError(r.error ?? "Error");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  if (fila.esCeo) {
    return (
      <tr className="bg-emerald-50/30 align-top">
        <td className="px-4 py-2.5">
          <div className="font-medium">{fila.email}</div>
          <div className="text-[11px] text-muted-foreground">
            {fila.puesto ?? "—"}
          </div>
        </td>
        <td className="px-4 py-2.5">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            CEO
          </span>
        </td>
        <td
          colSpan={3}
          className="px-4 py-2.5 text-center text-[11.5px] italic text-muted-foreground"
        >
          Aprueba todo sin tope (sin umbral configurable)
        </td>
        <td className="px-4 py-2.5"></td>
      </tr>
    );
  }

  return (
    <tr className="align-top hover:bg-secondary/20">
      <td className="px-4 py-2.5">
        <div className="font-medium">{fila.email}</div>
        <div className="text-[11px] text-muted-foreground">
          {fila.puesto ?? "—"}
        </div>
      </td>
      <td className="px-4 py-2.5 text-[12px]">
        <span className="capitalize">{fila.rol}</span>
        <div className="mt-0.5">
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10.5px] font-medium text-blue-800">
            aprobador_financiero
          </span>
        </div>
      </td>
      {editing ? (
        <>
          <td className="px-4 py-2.5">
            <Input
              type="number"
              min="0"
              step="1000"
              value={oc}
              onChange={(e) => setOc(e.target.value)}
              placeholder="sin tope"
              className="h-8 text-right font-mono text-[12.5px]"
            />
          </td>
          <td className="px-4 py-2.5">
            <Input
              type="number"
              min="0"
              step="1000"
              value={ot}
              onChange={(e) => setOt(e.target.value)}
              placeholder="sin tope"
              className="h-8 text-right font-mono text-[12.5px]"
            />
          </td>
          <td className="px-4 py-2.5">
            <Input
              type="number"
              min="0"
              step="1000"
              value={prestamo}
              onChange={(e) => setPrestamo(e.target.value)}
              placeholder="sin tope"
              className="h-8 text-right font-mono text-[12.5px]"
            />
          </td>
          <td className="px-4 py-2.5 text-right">
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={reset}
                disabled={pending}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={guardar} disabled={pending}>
                <Check className="h-3.5 w-3.5" />
                {pending ? "…" : "Guardar"}
              </Button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-4 py-2.5 text-right font-mono text-[12.5px] tabular-nums">
            {fmtMxn(fila.umbralOc)}
          </td>
          <td className="px-4 py-2.5 text-right font-mono text-[12.5px] tabular-nums">
            {fmtMxn(fila.umbralOt)}
          </td>
          <td className="px-4 py-2.5 text-right font-mono text-[12.5px] tabular-nums">
            {fmtMxn(fila.umbralPrestamo)}
          </td>
          <td className="px-4 py-2.5 text-right">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          </td>
        </>
      )}
      {error && (
        <td colSpan={6} className="px-4 pb-2">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-[11.5px] text-destructive">
            {error}
          </p>
        </td>
      )}
    </tr>
  );
}
