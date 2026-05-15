// Tipos compartidos para el módulo de finiquitos. Vive separado de
// `actions.ts` porque "use server" solo permite exportar funciones async.

export type FiniquitoConcepto = {
  /** Identificador estable (`sueldo_pendiente`, `aguinaldo_prop`, `bono_despedida`, ...). */
  key: string;
  label: string;
  /** Monto absoluto en MXN. Positivo suma, negativo resta. */
  monto: number;
  /** Detalle libre: días, fórmula aplicada, base, etc. */
  detalle?: string;
};

export type EstadoFiniquito =
  | "borrador"
  | "aprobado"
  | "pagado"
  | "ratificado";

export type CaminoCierre = "privada" | "reforzada" | "ratificada";

export const ESTADOS_FINIQUITO: Array<{
  value: EstadoFiniquito;
  label: string;
}> = [
  { value: "borrador", label: "Borrador" },
  { value: "aprobado", label: "Aprobado" },
  { value: "pagado", label: "Pagado" },
  { value: "ratificado", label: "Ratificado" },
];

export const CAMINOS_CIERRE: Array<{
  value: CaminoCierre;
  label: string;
  ayuda: string;
}> = [
  {
    value: "privada",
    label: "Privada (renuncia voluntaria)",
    ayuda:
      "Solo conceptos proporcionales. El empleado firma renuncia y recibo.",
  },
  {
    value: "reforzada",
    label: "Reforzada (despido con convenio)",
    ayuda:
      "Convenio de terminación firmado ante notario o testigos. Incluye típicamente indemnización.",
  },
  {
    value: "ratificada",
    label: "Ratificada ante CCL",
    ayuda:
      "El convenio se ratificó ante Centro de Conciliación Laboral. Máxima protección legal.",
  },
];

export const MOTIVOS_BAJA: Array<{ value: string; label: string }> = [
  { value: "renuncia_voluntaria", label: "Renuncia voluntaria" },
  { value: "termino_contrato", label: "Término de contrato" },
  { value: "despido_justificado", label: "Despido justificado" },
  { value: "despido_injustificado", label: "Despido injustificado" },
  { value: "mutuo_acuerdo", label: "Mutuo acuerdo" },
  { value: "jubilacion", label: "Jubilación" },
  { value: "incapacidad", label: "Incapacidad permanente" },
  { value: "fallecimiento", label: "Fallecimiento" },
];

export type FiniquitoResult = {
  ok: boolean;
  error: string | null;
  id?: string;
};
