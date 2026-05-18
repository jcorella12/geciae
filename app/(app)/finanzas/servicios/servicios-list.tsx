"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { notify } from "@/components/ui/notify";

import { toggleServicioActivo } from "./actions";

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

type Servicio = {
  id: string;
  empresa_id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  unidad: string | null;
  costo_base: number | null;
  margen_inter_co: number | null;
  precio_inter_co: number | null;
  precio_externo: number | null;
  activo: boolean | null;
  empresas: { codigo: string } | null;
};

export function ServiciosList({
  servicios,
  empresasGestionables,
}: {
  servicios: Servicio[];
  empresasGestionables: string[];
}) {
  const [isPending, startTransition] = useTransition();

  function toggle(id: string, proximo: boolean) {
    startTransition(async () => {
      const res = await toggleServicioActivo(id, proximo);
      if (!res.ok) notify({ message: res.error ?? "Error", variant: "error" });
    });
  }

  if (servicios.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Sin servicios. Crea el primero arriba.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-secondary/50 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">Empresa</th>
            <th className="px-4 py-2 font-medium">Código</th>
            <th className="px-4 py-2 font-medium">Nombre</th>
            <th className="px-4 py-2 text-right font-medium">Costo base</th>
            <th className="px-4 py-2 text-right font-medium">Margen</th>
            <th className="px-4 py-2 text-right font-medium">Precio inter-co</th>
            <th className="px-4 py-2 font-medium">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {servicios.map((s) => {
            const puedeEditar = empresasGestionables.includes(s.empresa_id);
            return (
              <tr key={s.id} className={s.activo === false ? "opacity-60" : undefined}>
                <td className="px-4 py-3 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        empresaCodigoColor[s.empresas?.codigo ?? ""] ??
                        "bg-muted-foreground"
                      }`}
                    />
                    {s.empresas?.codigo ?? "?"}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{s.codigo}</td>
                <td className="px-4 py-3">
                  {s.nombre}
                  {s.unidad && (
                    <p className="text-xs text-muted-foreground">/ {s.unidad}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {s.costo_base != null ? fmtMxn.format(Number(s.costo_base)) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {s.margen_inter_co != null
                    ? `${(Number(s.margen_inter_co) * 100).toFixed(0)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {s.precio_inter_co != null
                    ? fmtMxn.format(Number(s.precio_inter_co))
                    : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {puedeEditar ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => toggle(s.id, !(s.activo ?? false))}
                    >
                      {s.activo === false ? "Activar" : "Desactivar"}
                    </Button>
                  ) : s.activo === false ? (
                    <span className="text-muted-foreground">Inactivo</span>
                  ) : (
                    <span className="text-success">Activo</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
