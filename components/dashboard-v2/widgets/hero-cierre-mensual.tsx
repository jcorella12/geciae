import { CheckCircle2 } from "lucide-react";

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export async function HeroCierreMensual() {
  // Versión simplificada: muestra el periodo actual y un check de progreso.
  // En un sprint futuro se podría integrar con una tabla cierres_periodo.
  const ahora = new Date();
  const mes = MESES[ahora.getMonth()];
  const anio = ahora.getFullYear();

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-ink-3" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Cierre mensual
        </span>
      </div>
      <div className="mt-3">
        <span className="font-mono text-[18px] font-semibold leading-none tnum">
          {mes} {anio}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-3">
        Periodo en curso. Estado del cierre se publicará al consolidar movimientos.
      </p>
    </div>
  );
}
