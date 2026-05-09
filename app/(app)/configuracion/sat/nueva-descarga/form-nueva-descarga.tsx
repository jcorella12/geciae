"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { crearSolicitud } from "../descarga-actions";

export function FormNuevaDescarga({
  empresas,
}: {
  empresas: Array<{
    id: string;
    codigo: string;
    nombre: string | null;
    rfc: string;
    vigencia_hasta: string;
  }>;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<"emitidos" | "recibidos">("recibidos");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Default: último mes completo
  const ahora = new Date();
  const ultimoDiaMesAnterior = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    0,
  );
  const primerDiaMesAnterior = new Date(
    ultimoDiaMesAnterior.getFullYear(),
    ultimoDiaMesAnterior.getMonth(),
    1,
  );
  const fechaIniDefault = primerDiaMesAnterior.toISOString().slice(0, 10);
  const fechaFinDefault = ultimoDiaMesAnterior.toISOString().slice(0, 10);

  function handleSubmit(formData: FormData) {
    setError(null);
    formData.set("tipo_descarga", tipo);
    startTransition(async () => {
      const r = await crearSolicitud(formData);
      if (r.ok) {
        router.push(`/configuracion/sat/descargas/${r.id}`);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-[12.5px] font-medium">Empresa</label>
        <select
          name="empresa_id"
          required
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
        >
          <option value="">Selecciona…</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} — {e.rfc}{" "}
              {e.nombre ? `(${e.nombre})` : ""}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-medium">
          Tipo de descarga
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              tipo === "emitidos"
                ? "border-brand bg-brand/5"
                : "border-border hover:border-brand/40"
            }`}
          >
            <input
              type="radio"
              checked={tipo === "emitidos"}
              onChange={() => setTipo("emitidos")}
              className="mt-1"
            />
            <div>
              <div className="text-[12.5px] font-medium">Emitidos</div>
              <div className="text-[11px] text-ink-3">
                Facturas que tu empresa expidió a clientes
              </div>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
              tipo === "recibidos"
                ? "border-brand bg-brand/5"
                : "border-border hover:border-brand/40"
            }`}
          >
            <input
              type="radio"
              checked={tipo === "recibidos"}
              onChange={() => setTipo("recibidos")}
              className="mt-1"
            />
            <div>
              <div className="text-[12.5px] font-medium">Recibidos</div>
              <div className="text-[11px] text-ink-3">
                Facturas que tu empresa recibió de proveedores
              </div>
            </div>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium">
            Fecha inicio
          </label>
          <Input
            type="date"
            name="fecha_inicio"
            required
            defaultValue={fechaIniDefault}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium">
            Fecha fin
          </label>
          <Input
            type="date"
            name="fecha_fin"
            required
            defaultValue={fechaFinDefault}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-[11.5px] text-sky-900">
        <strong>Importante:</strong> el período máximo es 12 meses. La cuota
        diaria del SAT es de 2,000 XMLs por contribuyente. El SAT puede tardar
        de 30 minutos a 48 horas en preparar el paquete.
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger-deep">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Solicitando al SAT…" : "Solicitar al SAT"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
