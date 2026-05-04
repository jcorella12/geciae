"use client";

import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGIMENES_FISCALES, RFC_REGEX } from "@/lib/sat/catalogos";

import { convertirClienteAFormal } from "@/app/(app)/clientes/actions";

/**
 * Botón + modal para convertir un cliente potencial a formal cuando se gana
 * la oportunidad. Solicita los datos fiscales mínimos: RFC, régimen, CP.
 *
 * Se muestra solo si:
 *  - oportunidad.estado === "ganado"
 *  - cliente.es_potencial === true
 */
export function ConvertirClienteButton({
  clienteId,
  clienteNombre,
}: {
  clienteId: string;
  clienteNombre: string;
}) {
  const [open, setOpen] = useState(false);
  const [rfc, setRfc] = useState("");
  const [regimen, setRegimen] = useState("");
  const [cp, setCp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const rfcUp = rfc.trim().toUpperCase();
    if (!RFC_REGEX.test(rfcUp)) {
      setError("RFC con formato inválido (12 chars moral, 13 chars física).");
      return;
    }
    if (!regimen) {
      setError("Selecciona un régimen fiscal.");
      return;
    }
    if (!/^\d{5}$/.test(cp)) {
      setError("CP fiscal debe ser 5 dígitos.");
      return;
    }
    startTransition(async () => {
      const res = await convertirClienteAFormal(clienteId, {
        rfc: rfcUp,
        regimen_fiscal: regimen,
        cp_fiscal: cp,
      });
      if (!res.ok) {
        setError(res.error ?? "No se pudo convertir");
        return;
      }
      setOpen(false);
    });
  };

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Convertir a cliente formal
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Convertir cliente potencial a formal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md space-y-3 rounded-lg border border-border bg-card p-5 shadow-lg"
          >
            <header>
              <h3 className="text-[14px] font-semibold">
                Convertir a cliente formal
              </h3>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {clienteNombre} · captura los datos fiscales para timbrar CFDI.
              </p>
            </header>

            <div className="space-y-1">
              <Label htmlFor="conv_rfc" className="text-[11.5px]">
                RFC *
              </Label>
              <Input
                id="conv_rfc"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                required
                maxLength={13}
                placeholder="ABC123456XY1"
                autoFocus
                className="h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="conv_regimen" className="text-[11.5px]">
                Régimen fiscal *
              </Label>
              <select
                id="conv_regimen"
                value={regimen}
                onChange={(e) => setRegimen(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">— Selecciona —</option>
                {REGIMENES_FISCALES.map((r) => (
                  <option key={r.codigo} value={r.codigo}>
                    {r.codigo} — {r.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="conv_cp" className="text-[11.5px]">
                CP fiscal *
              </Label>
              <Input
                id="conv_cp"
                value={cp}
                onChange={(e) =>
                  setCp(e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                required
                maxLength={5}
                placeholder="83000"
                className="h-9 w-32 font-mono"
              />
            </div>

            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Convirtiendo…" : "Convertir"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
