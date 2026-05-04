// Tipos compartidos para el módulo CFDI (sin "use server").

export type EstadoCfdi =
  | "borrador"
  | "timbrado"
  | "enviado_cliente"
  | "pagado"
  | "cancelado";

export type TipoCfdi = "ingreso" | "egreso" | "traslado" | "pago" | "nomina";

export const ETIQUETA_TIPO_CFDI: Record<TipoCfdi, string> = {
  ingreso: "Ingreso",
  egreso: "Egreso (NC)",
  traslado: "Traslado",
  pago: "Pago",
  nomina: "Nómina",
};

export const ETIQUETA_ESTADO_CFDI: Record<EstadoCfdi, string> = {
  borrador: "Borrador",
  timbrado: "Timbrado",
  enviado_cliente: "Enviado",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

export const COLOR_ESTADO_CFDI: Record<EstadoCfdi, string> = {
  borrador: "bg-gray-100 text-gray-700",
  timbrado: "bg-emerald-100 text-emerald-700",
  enviado_cliente: "bg-blue-100 text-blue-700",
  pagado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-700",
};

export type CfdiUploadState = {
  ok: boolean;
  error: string | null;
  cfdiId: string | null;
};

export const initialCfdiUploadState: CfdiUploadState = {
  ok: false,
  error: null,
  cfdiId: null,
};
