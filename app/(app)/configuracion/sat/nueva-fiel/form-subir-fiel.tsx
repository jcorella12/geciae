"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { subirFiel } from "../fiel-actions";

export function FormSubirFiel({
  empresas,
  empresaIdInicial,
}: {
  empresas: Array<{
    id: string;
    codigo: string;
    rfc: string;
    nombre_comercial: string | null;
  }>;
  empresaIdInicial?: string;
}) {
  const router = useRouter();
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<{
    rfc: string;
    razonSocial: string | null;
    vigenciaHasta: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setExito(null);
    startTransition(async () => {
      const r = await subirFiel(formData);
      if (r.ok) {
        setExito({
          rfc: r.rfc,
          razonSocial: r.razonSocial,
          vigenciaHasta: r.vigenciaHasta,
        });
        setTimeout(() => router.push("/configuracion/sat"), 2000);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-[12.5px] text-amber-900">
        <strong>Importante:</strong> la FIEL es información extremadamente
        sensible. Asegúrate de subir los archivos correctos (.cer y .key) y la
        contraseña correcta. Los archivos se almacenan encriptados y solo
        CEO/contralor pueden acceder.
      </div>

      <div>
        <label className="mb-1 block text-[12.5px] font-medium">Empresa</label>
        <select
          name="empresa_id"
          required
          defaultValue={empresaIdInicial}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
        >
          <option value="">Selecciona…</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.codigo} — {e.rfc}{" "}
              {e.nombre_comercial ? `(${e.nombre_comercial})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[12.5px] font-medium">
          Archivo .cer (Certificado público)
        </label>
        <input
          type="file"
          name="cer"
          accept=".cer"
          required
          className="block w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-bg-2 file:px-3 file:py-1 file:text-[12px]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12.5px] font-medium">
          Archivo .key (Llave privada)
        </label>
        <input
          type="file"
          name="key"
          accept=".key"
          required
          className="block w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] file:mr-3 file:rounded file:border-0 file:bg-bg-2 file:px-3 file:py-1 file:text-[12px]"
        />
      </div>

      <div>
        <label className="mb-1 block text-[12.5px] font-medium">
          Contraseña de la llave
        </label>
        <div className="relative">
          <Input
            type={mostrarPassword ? "text" : "password"}
            name="password"
            required
            minLength={4}
            autoComplete="off"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setMostrarPassword(!mostrarPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
            aria-label="Mostrar/ocultar contraseña"
          >
            {mostrarPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-ink-3">
          Se almacena encriptada con AES-256-GCM
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-[12.5px] text-danger-deep">
          {error}
        </div>
      )}

      {exito && (
        <div className="rounded-md border border-ok/30 bg-ok/5 p-3 text-[12.5px] text-ok-deep">
          ✓ FIEL guardada correctamente.
          <br />
          RFC: <span className="font-mono">{exito.rfc}</span>
          <br />
          Razón social: {exito.razonSocial ?? "—"}
          <br />
          Vigencia hasta:{" "}
          <span className="font-mono">{exito.vigenciaHasta}</span>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Validando con SAT…" : "Subir FIEL"}
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
