// Tipos compartidos para Inventario.

export type CategoriaInventario =
  | "panel_solar"
  | "inversor"
  | "estructura"
  | "cable"
  | "herraje"
  | "tablero"
  | "proteccion"
  | "monitoreo"
  | "baterias"
  | "herramienta"
  | "consumible"
  | "epp"
  | "otro";

export const ETIQUETA_CATEGORIA_INV: Record<CategoriaInventario, string> = {
  panel_solar: "Panel solar",
  inversor: "Inversor",
  estructura: "Estructura",
  cable: "Cable",
  herraje: "Herraje",
  tablero: "Tablero / centro",
  proteccion: "Protección eléctrica",
  monitoreo: "Monitoreo / datalogger",
  baterias: "Baterías",
  herramienta: "Herramienta",
  consumible: "Consumible",
  epp: "EPP / seguridad",
  otro: "Otro",
};

export const ICONO_CATEGORIA_INV: Record<CategoriaInventario, string> = {
  panel_solar: "☀️",
  inversor: "⚡",
  estructura: "🏗️",
  cable: "🔌",
  herraje: "🔩",
  tablero: "📦",
  proteccion: "🛡️",
  monitoreo: "📊",
  baterias: "🔋",
  herramienta: "🔧",
  consumible: "📎",
  epp: "🦺",
  otro: "📦",
};

export const COLOR_CATEGORIA_INV: Record<CategoriaInventario, string> = {
  panel_solar: "bg-amber-100 text-amber-700",
  inversor: "bg-blue-100 text-blue-700",
  estructura: "bg-zinc-100 text-zinc-700",
  cable: "bg-orange-100 text-orange-700",
  herraje: "bg-stone-100 text-stone-700",
  tablero: "bg-violet-100 text-violet-700",
  proteccion: "bg-emerald-100 text-emerald-700",
  monitoreo: "bg-cyan-100 text-cyan-700",
  baterias: "bg-yellow-100 text-yellow-700",
  herramienta: "bg-indigo-100 text-indigo-700",
  consumible: "bg-pink-100 text-pink-700",
  epp: "bg-red-100 text-red-700",
  otro: "bg-gray-100 text-gray-700",
};

export type EstadoStock = "agotado" | "bajo" | "normal";

export const COLOR_ESTADO_STOCK: Record<EstadoStock, string> = {
  agotado: "bg-red-100 text-red-700",
  bajo: "bg-amber-100 text-amber-700",
  normal: "bg-emerald-100 text-emerald-700",
};

export const ETIQUETA_ESTADO_STOCK: Record<EstadoStock, string> = {
  agotado: "Agotado",
  bajo: "Stock bajo",
  normal: "Stock OK",
};

export type TipoMovimiento =
  | "entrada_compra"
  | "devolucion"
  | "entrada_ajuste"
  | "salida_obra"
  | "salida_proyecto"
  | "salida_venta"
  | "salida_merma"
  | "salida_ajuste"
  | "ajuste"
  | "traspaso_salida"
  | "traspaso_entrada";

export const ETIQUETA_TIPO_MOV: Record<TipoMovimiento, string> = {
  entrada_compra: "Entrada · Compra",
  devolucion: "Entrada · Devolución",
  entrada_ajuste: "Entrada · Ajuste",
  salida_obra: "Salida · Obra",
  salida_proyecto: "Salida · Proyecto",
  salida_venta: "Salida · Venta",
  salida_merma: "Salida · Merma",
  salida_ajuste: "Salida · Ajuste",
  ajuste: "Ajuste",
  traspaso_salida: "Traspaso · Salida",
  traspaso_entrada: "Traspaso · Entrada",
};

export const COLOR_TIPO_MOV: Record<TipoMovimiento, string> = {
  entrada_compra: "bg-emerald-100 text-emerald-700",
  devolucion: "bg-emerald-100 text-emerald-700",
  entrada_ajuste: "bg-emerald-50 text-emerald-700",
  salida_obra: "bg-orange-100 text-orange-700",
  salida_proyecto: "bg-orange-100 text-orange-700",
  salida_venta: "bg-violet-100 text-violet-700",
  salida_merma: "bg-red-100 text-red-700",
  salida_ajuste: "bg-red-50 text-red-700",
  ajuste: "bg-amber-100 text-amber-700",
  traspaso_salida: "bg-blue-100 text-blue-700",
  traspaso_entrada: "bg-blue-100 text-blue-700",
};

export const ENTRADAS: TipoMovimiento[] = [
  "entrada_compra",
  "devolucion",
  "entrada_ajuste",
  "traspaso_entrada",
];

export const SALIDAS: TipoMovimiento[] = [
  "salida_obra",
  "salida_proyecto",
  "salida_venta",
  "salida_merma",
  "salida_ajuste",
  "ajuste",
  "traspaso_salida",
];

export type UnidadMedida =
  | "pieza"
  | "metro"
  | "kilogramo"
  | "litro"
  | "kit"
  | "juego"
  | "metro_cuadrado"
  | "metro_cubico"
  | "rollo"
  | "caja";

export const UNIDADES_MEDIDA: { value: UnidadMedida; label: string }[] = [
  { value: "pieza", label: "Pieza" },
  { value: "metro", label: "Metro" },
  { value: "kilogramo", label: "Kg" },
  { value: "litro", label: "Litro" },
  { value: "kit", label: "Kit" },
  { value: "juego", label: "Juego" },
  { value: "metro_cuadrado", label: "m²" },
  { value: "metro_cubico", label: "m³" },
  { value: "rollo", label: "Rollo" },
  { value: "caja", label: "Caja" },
];

// Estado de forms
export type ItemState = {
  ok: boolean;
  error: string | null;
  itemId: string | null;
};
export const initialItemState: ItemState = {
  ok: false,
  error: null,
  itemId: null,
};

export type MovimientoState = {
  ok: boolean;
  error: string | null;
};
export const initialMovimientoState: MovimientoState = {
  ok: false,
  error: null,
};
