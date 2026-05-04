export type TipoDocumentoProveedor = {
  value: string;
  label: string;
  descripcion: string;
  /** Aplica a todos los proveedores. Si false, solo a los con `requiere_repse=true`. */
  general: boolean;
};

export const TIPOS_DOCUMENTO_PROVEEDOR: TipoDocumentoProveedor[] = [
  {
    value: "csf",
    label: "Constancia de Situación Fiscal (CSF)",
    descripcion: "Vigente del año en curso. Renovar al menos anual.",
    general: true,
  },
  {
    value: "opinion_32d",
    label: "Opinión positiva 32-D",
    descripcion: "Cumplimiento ante el SAT. Vigencia 30 días.",
    general: true,
  },
  {
    value: "identificacion_legal",
    label: "Acta constitutiva / Poder notarial",
    descripcion:
      "Solo personas morales o representante con poder. Sin vencimiento normalmente.",
    general: true,
  },
  {
    value: "comprobante_domicilio",
    label: "Comprobante de domicilio",
    descripcion: "Recibo no mayor a 3 meses (CFE, Telmex, predial).",
    general: true,
  },
  {
    value: "repse",
    label: "Padrón REPSE",
    descripcion:
      "Solo subcontratistas. Constancia vigente del Padrón Público de Especialización.",
    general: false,
  },
  {
    value: "imss",
    label: "Constancia IMSS de cumplimiento",
    descripcion:
      "Solo subcontratistas. Opinión positiva del IMSS, vigencia 30 días.",
    general: false,
  },
  {
    value: "lista_69b",
    label: "Validación lista 69-B (no listado)",
    descripcion:
      "Captura de pantalla o constancia de que el RFC NO aparece en la lista del SAT.",
    general: true,
  },
  {
    value: "otro",
    label: "Otro documento",
    descripcion: "Cualquier evidencia adicional relevante.",
    general: true,
  },
];

export function tipoDocumentoLabel(value: string | null): string {
  if (!value) return "—";
  return TIPOS_DOCUMENTO_PROVEEDOR.find((t) => t.value === value)?.label ?? value;
}

/**
 * Estado de vigencia de un doc según hoy.
 */
export type EstadoVigencia = "vigente" | "por_vencer" | "vencido" | "sin_fecha";

export function estadoVigencia(
  fechaVencimiento: string | null,
): EstadoVigencia {
  if (!fechaVencimiento) return "sin_fecha";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fv = new Date(fechaVencimiento);
  fv.setHours(0, 0, 0, 0);
  const diff = (fv.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return "vencido";
  if (diff <= 30) return "por_vencer";
  return "vigente";
}

export const VIGENCIA_BADGE: Record<EstadoVigencia, string> = {
  vigente: "bg-success/15 text-success",
  por_vencer: "bg-warning/15 text-foreground",
  vencido: "bg-destructive/15 text-destructive",
  sin_fecha: "bg-secondary text-secondary-foreground",
};

export const VIGENCIA_LABEL: Record<EstadoVigencia, string> = {
  vigente: "Vigente",
  por_vencer: "Por vencer",
  vencido: "Vencido",
  sin_fecha: "Sin fecha",
};

export type DocState = {
  ok: boolean;
  error: string | null;
};

export const initialDocState: DocState = { ok: false, error: null };
