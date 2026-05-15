/**
 * Cálculo asistido de conceptos de finiquito según LFT.
 *
 * Devuelve conceptos sugeridos basados en el camino de cierre (privada,
 * reforzada, ratificada) y la fecha de baja. El usuario los puede
 * editar o agregar manualmente en la UI.
 *
 * Fundamento legal:
 *   - Art. 79 LFT: vacaciones según años.
 *   - Art. 80 LFT: prima vacacional ≥ 25%.
 *   - Art. 87 LFT: aguinaldo ≥ 15 días al año, proporcional.
 *   - Art. 50 LFT: indemnización (3 meses + 20 días/año + 12 días/año) en
 *     despido injustificado. Aquí asumimos topes de 2 SM para los días
 *     según Art. 162 (prima de antigüedad).
 */

import type { FiniquitoConcepto } from "@/app/(app)/personas/finiquitos/state";

const MS_DIA = 1000 * 60 * 60 * 24;

/**
 * Días de vacaciones según LFT vigente (reforma 2022, 12 días al primer año
 * y +2 por año hasta el 5, luego +2 cada 5 años).
 */
export function diasVacacionesPorAnio(aniosCumplidos: number): number {
  if (aniosCumplidos < 1) return 0;
  if (aniosCumplidos === 1) return 12;
  if (aniosCumplidos === 2) return 14;
  if (aniosCumplidos === 3) return 16;
  if (aniosCumplidos === 4) return 18;
  if (aniosCumplidos === 5) return 20;
  // 6-10: +0 (queda en 20); del 6 al 10 se incrementa cada bloque de 5
  // según LFT: del año 6 al 10 → 22; 11-15 → 24; etc.
  if (aniosCumplidos <= 10) return 22;
  if (aniosCumplidos <= 15) return 24;
  if (aniosCumplidos <= 20) return 26;
  if (aniosCumplidos <= 25) return 28;
  if (aniosCumplidos <= 30) return 30;
  return 32;
}

export type EntradaCalculo = {
  fechaIngreso: string; // YYYY-MM-DD
  fechaBaja: string; // YYYY-MM-DD
  salarioBaseMensual: number; // bruto mensual
  diasVacacionesDisfrutadas?: number;
  ultimoPagoFecha?: string | null;
  caminoCierre: "privada" | "reforzada" | "ratificada";
  motivoBaja: string;
  /** Si se otorga, agrega indemnización de 3 meses (90 días). */
  pagaIndemnizacion3Meses?: boolean;
  /** Si se otorga, agrega 20 días por año trabajado. */
  paga20DiasPorAnio?: boolean;
  /** Si se otorga (Art. 162 LFT), 12 días por año tope 2 SM. */
  pagaPrimaAntiguedad?: boolean;
};

function parseISO(s: string): Date {
  return new Date(s + "T00:00:00");
}

function aniosCumplidos(ingreso: Date, baja: Date): number {
  let anios = baja.getFullYear() - ingreso.getFullYear();
  const mesIngreso = ingreso.getMonth();
  const mesBaja = baja.getMonth();
  if (
    mesBaja < mesIngreso ||
    (mesBaja === mesIngreso && baja.getDate() < ingreso.getDate())
  ) {
    anios--;
  }
  return Math.max(0, anios);
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcularConceptosFiniquito(
  entrada: EntradaCalculo,
): FiniquitoConcepto[] {
  const ingreso = parseISO(entrada.fechaIngreso);
  const baja = parseISO(entrada.fechaBaja);
  const salarioDiario = entrada.salarioBaseMensual / 30;
  const anios = aniosCumplidos(ingreso, baja);

  // Día base del año en curso
  const inicioAnio = new Date(baja.getFullYear(), 0, 1);
  const diasAnioCorridos =
    Math.floor((baja.getTime() - inicioAnio.getTime()) / MS_DIA) + 1;

  const conceptos: FiniquitoConcepto[] = [];

  // 1) Sueldo pendiente desde último pago
  if (entrada.ultimoPagoFecha) {
    const ultimoPago = parseISO(entrada.ultimoPagoFecha);
    const diasPendientes = Math.max(
      0,
      Math.round((baja.getTime() - ultimoPago.getTime()) / MS_DIA),
    );
    if (diasPendientes > 0) {
      conceptos.push({
        key: "sueldo_pendiente",
        label: "Sueldo pendiente",
        monto: r2(diasPendientes * salarioDiario),
        detalle: `${diasPendientes} días × $${r2(salarioDiario)}`,
      });
    }
  }

  // 2) Aguinaldo proporcional (15 días al año)
  const aguinaldoProp = r2((15 * diasAnioCorridos * salarioDiario) / 365);
  conceptos.push({
    key: "aguinaldo_prop",
    label: "Aguinaldo proporcional",
    monto: aguinaldoProp,
    detalle: `15 días × ${diasAnioCorridos}/365 × $${r2(salarioDiario)}`,
  });

  // 3) Vacaciones pendientes proporcionales del año en curso
  const diasVacAnio = diasVacacionesPorAnio(Math.max(1, anios));
  // Aniversario más reciente
  const aniversario = new Date(
    baja.getFullYear(),
    ingreso.getMonth(),
    ingreso.getDate(),
  );
  if (aniversario > baja) aniversario.setFullYear(baja.getFullYear() - 1);
  const diasDesdeAniversario = Math.max(
    0,
    Math.round((baja.getTime() - aniversario.getTime()) / MS_DIA),
  );
  const vacPropDias = r2(
    Math.min(diasVacAnio, (diasVacAnio * diasDesdeAniversario) / 365),
  );
  const vacPropDisfrutadas = entrada.diasVacacionesDisfrutadas ?? 0;
  const vacPropPagar = Math.max(0, vacPropDias - vacPropDisfrutadas);
  if (vacPropPagar > 0) {
    conceptos.push({
      key: "vacaciones_pendientes",
      label: "Vacaciones pendientes",
      monto: r2(vacPropPagar * salarioDiario),
      detalle: `${vacPropPagar} días × $${r2(salarioDiario)}`,
    });
    conceptos.push({
      key: "prima_vacacional",
      label: "Prima vacacional (25%)",
      monto: r2(0.25 * vacPropPagar * salarioDiario),
      detalle: `25% × ${vacPropPagar} días × $${r2(salarioDiario)}`,
    });
  }

  // 4) Indemnización (solo si camino reforzada/ratificada lo otorga)
  if (entrada.caminoCierre !== "privada") {
    if (entrada.pagaIndemnizacion3Meses) {
      conceptos.push({
        key: "indemnizacion_3_meses",
        label: "Indemnización 3 meses (Art. 50 LFT)",
        monto: r2(90 * salarioDiario),
        detalle: `90 días × $${r2(salarioDiario)}`,
      });
    }
    if (entrada.paga20DiasPorAnio) {
      conceptos.push({
        key: "veinte_dias_anio",
        label: "20 días por año (Art. 50 LFT)",
        monto: r2(20 * anios * salarioDiario),
        detalle: `20 × ${anios} años × $${r2(salarioDiario)}`,
      });
    }
    if (entrada.pagaPrimaAntiguedad) {
      conceptos.push({
        key: "prima_antiguedad",
        label: "Prima de antigüedad (Art. 162 LFT)",
        monto: r2(12 * anios * salarioDiario),
        detalle: `12 días × ${anios} años × $${r2(salarioDiario)} (revisar tope 2 SM)`,
      });
    }
  }

  return conceptos;
}

export function sumarConceptos(conceptos: FiniquitoConcepto[]): number {
  return r2(conceptos.reduce((acc, c) => acc + Number(c.monto || 0), 0));
}
