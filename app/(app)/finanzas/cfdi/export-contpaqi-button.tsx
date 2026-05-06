"use client";

import { Package } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

/**
 * Genera el paquete mensual ZIP con CFDIs (XML + PDF + manifest CSV) para
 * que el contador externo lo importe a CONTPAQi.
 */
export function ExportContpaqiButton({ empresas }: { empresas: Empresa[] }) {
  const [open, setOpen] = useState(false);
  const hoy = new Date();
  const [empresaId, setEmpresaId] = useState(empresas[0]?.id ?? "");
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [direccion, setDireccion] = useState<"ambos" | "emitidos" | "recibidos">(
    "ambos",
  );

  function descargar() {
    const params = new URLSearchParams({
      empresa: empresaId,
      anio: String(anio),
      mes: String(mes),
      direccion,
    });
    window.open(`/api/cfdi/export-contpaqi?${params.toString()}`, "_blank");
    setOpen(false);
  }

  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Package className="h-4 w-4" />
        Paquete CONTPAQi
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">
              Generar paquete mensual CONTPAQi
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-3">
              ZIP con XMLs + PDFs + manifiesto CSV. Para entregar al contador
              externo.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                  Empresa
                </label>
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo} · {e.nombre_comercial ?? e.razon_social}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Año
                  </label>
                  <select
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Mes
                  </label>
                  <select
                    value={mes}
                    onChange={(e) => setMes(Number(e.target.value))}
                    className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {meses.map((m, i) => (
                      <option key={i + 1} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
                  Dirección
                </label>
                <select
                  value={direccion}
                  onChange={(e) =>
                    setDireccion(
                      e.target.value as "ambos" | "emitidos" | "recibidos",
                    )
                  }
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="ambos">Ambos (emitidos + recibidos)</option>
                  <option value="emitidos">Solo emitidos</option>
                  <option value="recibidos">Solo recibidos</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={descargar} disabled={!empresaId}>
                <Package className="h-4 w-4" />
                Descargar ZIP
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
