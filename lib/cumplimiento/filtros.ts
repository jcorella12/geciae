/**
 * Helpers compartidos para filtros del módulo de cumplimiento fiscal.
 *
 * Se usan en /finanzas/cumplimiento, /finanzas/obligaciones,
 * /finanzas/estados-financieros para mantener consistencia de
 * empresa/año entre las páginas.
 */

export type CumplimientoFiltros = {
  empresa: string; // empresa_id o ""
  anio: number;
};

export function leerFiltros(
  searchParams: { empresa?: string; anio?: string } | undefined,
): CumplimientoFiltros {
  return {
    empresa: searchParams?.empresa ?? "",
    anio: searchParams?.anio
      ? parseInt(searchParams.anio, 10)
      : new Date().getFullYear(),
  };
}

export function buildHrefFiltros(
  base: string,
  filtros: CumplimientoFiltros,
  extras?: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  if (filtros.empresa) params.set("empresa", filtros.empresa);
  if (filtros.anio !== new Date().getFullYear())
    params.set("anio", String(filtros.anio));
  if (extras) {
    for (const [k, v] of Object.entries(extras)) {
      if (v !== undefined && v !== null && v !== "")
        params.set(k, String(v));
    }
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
