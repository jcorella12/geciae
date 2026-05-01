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
