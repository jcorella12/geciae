// Tipos del importador masivo de CFDIs desde ZIP. Vive fuera de actions.ts
// porque archivos con "use server" SOLO pueden exportar funciones async.

export type ImportarZipStatus =
  | "creado"
  | "duplicado"
  | "sin_empresa"
  | "saltado"
  | "error";

export type ImportarZipDetalle = {
  filename: string;
  uuid: string | null;
  status: ImportarZipStatus;
  cfdi_id: string | null;
  empresa_codigo: string | null;
  tipo: string | null;
  total: number | null;
  es_emitido: boolean | null;
  rfc_contraparte: string | null;
  con_pdf: boolean;
  error: string | null;
};

export type ImportarZipResumen = {
  total_archivos: number;
  total_xmls: number;
  creados: number;
  duplicados: number;
  sin_empresa: number;
  saltados: number;
  errores: number;
};

export type ImportarZipState = {
  ok: boolean;
  error: string | null;
  resumen: ImportarZipResumen | null;
  detalle: ImportarZipDetalle[];
};

export const initialImportarZipState: ImportarZipState = {
  ok: false,
  error: null,
  resumen: null,
  detalle: [],
};
