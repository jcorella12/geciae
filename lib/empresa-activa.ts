/**
 * Constantes y helpers para el manejo de "empresa activa" en sesión.
 */

export const EMPRESA_COOKIE = "pse_empresa_activa";

/**
 * Valor especial para indicar "ver datos consolidados de las 4 empresas del
 * grupo". Solo CEO y usuarios con atributo `tesorero_corporativo` lo ven.
 */
export const VISTA_CONSOLIDADA = "consolidated";

export type EmpresaActivaCookie = string; // UUID o VISTA_CONSOLIDADA

export type EmpresaResumen = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

/**
 * Determina si el usuario puede ver la vista consolidada.
 * Spec: rol `ceo` en cualquier empresa O atributo `tesorero_corporativo`.
 */
export function puedeVerConsolidado(
  vinculos: Array<{ rol: string; atributos: string[] | null }>,
): boolean {
  return vinculos.some(
    (v) =>
      v.rol === "ceo" ||
      (v.atributos ?? []).includes("tesorero_corporativo"),
  );
}

/**
 * Resuelve qué empresas debe mostrar el dashboard / página actual:
 * - Si la cookie tiene un UUID específico válido → solo esa empresa
 * - Si la cookie es 'consolidated' (y el user puede) → todas las empresas del user
 * - Si no hay cookie → todas las empresas del user (default consolidado para CEO/tesorero)
 *
 * Útil para que el switcher del topbar realmente filtre los datos.
 */
export function resolverEmpresasFiltro(input: {
  cookieValue: string | null;
  empresasUsuario: string[];
  puedeConsolidado: boolean;
}): { empresasIds: string[]; consolidada: boolean; activaId: string | null } {
  const { cookieValue, empresasUsuario, puedeConsolidado } = input;

  // Vista consolidada explícita
  if (cookieValue === VISTA_CONSOLIDADA && puedeConsolidado) {
    return {
      empresasIds: empresasUsuario,
      consolidada: true,
      activaId: VISTA_CONSOLIDADA,
    };
  }

  // Empresa específica (UUID válido entre las del user)
  if (cookieValue && empresasUsuario.includes(cookieValue)) {
    return {
      empresasIds: [cookieValue],
      consolidada: false,
      activaId: cookieValue,
    };
  }

  // Default: si puede consolidado → ve todas; si no → ve todas las del user (que es lo mismo).
  return {
    empresasIds: empresasUsuario,
    consolidada: puedeConsolidado,
    activaId: empresasUsuario[0] ?? null,
  };
}
