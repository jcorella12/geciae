// Tipos compartidos del módulo de series. Vive separado de `actions.ts`
// porque `"use server"` solo permite exportar funciones async.

export type EstadoSerie =
  | "en_almacen"
  | "asignado_proyecto"
  | "instalado"
  | "dado_baja"
  | "en_garantia";

export const ESTADOS_SERIE: Array<{
  value: EstadoSerie;
  label: string;
  badge: string;
}> = [
  { value: "en_almacen", label: "En almacén", badge: "bg-sky-100 text-sky-800" },
  {
    value: "asignado_proyecto",
    label: "Asignado a proyecto",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    value: "instalado",
    label: "Instalado",
    badge: "bg-emerald-100 text-emerald-800",
  },
  {
    value: "en_garantia",
    label: "En reclamo de garantía",
    badge: "bg-purple-100 text-purple-800",
  },
  {
    value: "dado_baja",
    label: "Dado de baja",
    badge: "bg-slate-100 text-slate-700",
  },
];

export type EstadoGarantia =
  | "sin_garantia"
  | "vigente"
  | "por_vencer"
  | "vencida";

export type SerieResult = {
  ok: boolean;
  error: string | null;
};
