// Tipos compartidos para Documentos de vehículos.

export type CategoriaDocVehiculo =
  | "factura"
  | "seguro"
  | "tarjeta_circulacion"
  | "verificacion"
  | "tenencia"
  | "permiso_carga"
  | "permiso_federal"
  | "manual"
  | "contrato_arrendamiento"
  | "foto"
  | "placas"
  | "tarjeton_acceso"
  | "otro";

export const ETIQUETA_CATEGORIA_VH: Record<CategoriaDocVehiculo, string> = {
  factura: "Factura",
  seguro: "Póliza de seguro",
  tarjeta_circulacion: "Tarjeta de circulación",
  verificacion: "Verificación vehicular",
  tenencia: "Tenencia / refrendo",
  permiso_carga: "Permiso de carga",
  permiso_federal: "Permiso federal SCT",
  manual: "Manual / ficha técnica",
  contrato_arrendamiento: "Contrato arrendamiento",
  foto: "Foto",
  placas: "Comprobante placas",
  tarjeton_acceso: "Tarjetón de acceso",
  otro: "Otro",
};

export const ICONO_CATEGORIA_VH: Record<CategoriaDocVehiculo, string> = {
  factura: "🧾",
  seguro: "🛡️",
  tarjeta_circulacion: "🪪",
  verificacion: "✅",
  tenencia: "💵",
  permiso_carga: "📦",
  permiso_federal: "🚛",
  manual: "📖",
  contrato_arrendamiento: "📜",
  foto: "📸",
  placas: "🔢",
  tarjeton_acceso: "🎫",
  otro: "📄",
};

export const COLOR_CATEGORIA_VH: Record<CategoriaDocVehiculo, string> = {
  factura: "bg-violet-100 text-violet-700",
  seguro: "bg-blue-100 text-blue-700",
  tarjeta_circulacion: "bg-amber-100 text-amber-700",
  verificacion: "bg-emerald-100 text-emerald-700",
  tenencia: "bg-orange-100 text-orange-700",
  permiso_carga: "bg-cyan-100 text-cyan-700",
  permiso_federal: "bg-indigo-100 text-indigo-700",
  manual: "bg-zinc-100 text-zinc-700",
  contrato_arrendamiento: "bg-violet-100 text-violet-800",
  foto: "bg-sky-100 text-sky-700",
  placas: "bg-yellow-100 text-yellow-700",
  tarjeton_acceso: "bg-pink-100 text-pink-700",
  otro: "bg-gray-100 text-gray-700",
};

// Categorías que típicamente requieren fecha de vencimiento
export const CATEGORIAS_CON_VENCIMIENTO: CategoriaDocVehiculo[] = [
  "seguro",
  "tarjeta_circulacion",
  "verificacion",
  "tenencia",
  "permiso_carga",
  "permiso_federal",
  "tarjeton_acceso",
];

// Categorías que típicamente tienen monto
export const CATEGORIAS_CON_MONTO: CategoriaDocVehiculo[] = [
  "factura",
  "seguro",
  "tenencia",
  "verificacion",
];

export type EstadoVencimientoDoc =
  | "sin_vencimiento"
  | "vigente"
  | "proximo"
  | "urgente"
  | "vencido";

export const COLOR_VENCIMIENTO: Record<EstadoVencimientoDoc, string> = {
  sin_vencimiento: "text-ink-3",
  vigente: "text-emerald-700",
  proximo: "text-amber-700",
  urgente: "text-orange-700",
  vencido: "text-red-700",
};

export const ETIQUETA_VENCIMIENTO: Record<EstadoVencimientoDoc, string> = {
  sin_vencimiento: "Sin vencimiento",
  vigente: "Vigente",
  proximo: "Por vencer",
  urgente: "Urgente",
  vencido: "Vencido",
};

export type SimpleVehDocState = { ok: boolean; error: string | null };
export const initialSimpleVehDocState: SimpleVehDocState = {
  ok: false,
  error: null,
};
