import Link from "next/link";

import { listarFiels } from "../fiel-actions";
import { FormNuevaDescarga } from "./form-nueva-descarga";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nueva descarga SAT" };

export default async function NuevaDescargaPage() {
  const fiels = await listarFiels();

  // Solo empresas con FIEL activa pueden descargar
  const empresasConFiel = fiels
    .filter((f) => f.estado === "activa" && f.estatus_vigencia !== "vencida")
    .map((f) => ({
      id: f.empresa_id,
      codigo: f.empresa_codigo,
      nombre: f.empresa_nombre,
      rfc: f.rfc,
      vigencia_hasta: f.vigencia_hasta,
    }));

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-7">
      <div className="mb-5">
        <p className="lbl-mini">
          <Link
            href="/configuracion/sat"
            className="text-ink-3 hover:underline"
          >
            ← Configuración SAT
          </Link>
        </p>
        <h1 className="mt-1.5 text-[24px] font-semibold leading-tight">
          Nueva descarga
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Solicita CFDIs emitidos o recibidos al SAT. El proceso es asíncrono:
          puede tardar de 30 minutos a 48 horas.
        </p>
      </div>

      {empresasConFiel.length === 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-[13px] text-amber-900">
          Ninguna empresa tiene FIEL activa vigente.{" "}
          <Link
            href="/configuracion/sat/nueva-fiel"
            className="underline hover:text-amber-700"
          >
            Sube una FIEL primero
          </Link>
          .
        </div>
      ) : (
        <FormNuevaDescarga empresas={empresasConFiel} />
      )}
    </div>
  );
}
