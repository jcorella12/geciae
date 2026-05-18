"use client";

import { useState } from "react";

import { VehiculoForm } from "../vehiculo-form";

import { type VehiculoDefaults } from "./ia-actions";
import { FacturaVehiculoIaUploader } from "./ia-uploader";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};
type GastoRec = { id: string; empresa_id: string; descripcion: string; monto: number };
type EmpleadoOpt = {
  id: string;
  empresa_id: string;
  nombre_completo: string;
  puesto: string | null;
};

/**
 * S3-T4 — Envuelve VehiculoForm con uploader IA. Cuando el usuario
 * sube una factura, la IA extrae los campos y forzamos un remount del
 * form (key) con los nuevos defaults — esto reseteea inputs uncontrolled.
 */
export function VehiculoFormConIa({
  empresas,
  gastosRecurrentes,
  empleados,
}: {
  empresas: Empresa[];
  gastosRecurrentes: GastoRec[];
  empleados: EmpleadoOpt[];
}) {
  const [defaults, setDefaults] = useState<VehiculoDefaults | null>(null);
  const [version, setVersion] = useState(0);

  function handleExtracted(d: VehiculoDefaults) {
    setDefaults(d);
    setVersion((v) => v + 1);
  }

  // Mapear VehiculoDefaults al shape que VehiculoForm acepta como
  // `defaults`. Los campos no extraídos quedan undefined y el form usa
  // sus propios placeholders/empty.
  const formDefaults = defaults
    ? {
        marca: defaults.marca ?? undefined,
        modelo: defaults.modelo ?? undefined,
        anio: defaults.anio ?? undefined,
        serie: defaults.serie ?? undefined,
        placa: defaults.placa ?? undefined,
        color: defaults.color ?? undefined,
        tipo: defaults.tipo ?? undefined,
        combustible: defaults.combustible ?? undefined,
        costo_adquisicion: defaults.costo_adquisicion ?? undefined,
        fecha_adquisicion: defaults.fecha_adquisicion ?? undefined,
      }
    : undefined;

  return (
    <div className="space-y-5">
      <FacturaVehiculoIaUploader onExtracted={handleExtracted} />
      <VehiculoForm
        key={version}
        empresas={empresas}
        gastosRecurrentes={gastosRecurrentes}
        empleados={empleados}
        defaults={formDefaults as never}
      />
    </div>
  );
}
