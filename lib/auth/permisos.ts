import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { EmpresaResumen } from "@/lib/empresa-activa";

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------

export type RolBase =
  | "ceo"
  | "director"
  | "operativo"
  | "empleado"
  | "cliente";

export type AtributoUsuario =
  | "aprobador_financiero"
  | "coordinador_calidad"
  | "tesorero_corporativo"
  | "auditor_interno"
  | "vendedor"
  | "supervisor_cuadrilla";

export type ConfigAprobadorFinanciero = {
  umbral_max_mxn_oc?: number | null;
  umbral_max_mxn_ot?: number | null;
  umbral_max_mxn_prestamo?: number | null;
};

export type Vinculo = {
  empresa_id: string;
  rol: RolBase;
  atributos: AtributoUsuario[];
  configuracion_atributos: Record<string, unknown>;
  puesto: string | null;
};

export type VinculoConEmpresa = Vinculo & {
  empresa: EmpresaResumen | null;
};

// ----------------------------------------------------------------------------
// Fetchers (memoizados por request via React `cache`)
// ----------------------------------------------------------------------------

/**
 * Vínculos del usuario autenticado actual con la información de cada empresa.
 * Si no hay sesión devuelve `[]`.
 *
 * Se memoiza por request: aunque varios server components lo llamen, dispara
 * una sola query a Supabase.
 */
export const obtenerVinculosConEmpresa = cache(
  async (): Promise<VinculoConEmpresa[]> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("usuarios_empresas")
      .select(
        "empresa_id, rol, atributos, configuracion_atributos, puesto, empresas(id, codigo, razon_social, nombre_comercial)",
      )
      .eq("usuario_id", user.id)
      .eq("activo", true);

    return (data ?? []).map((row: Record<string, unknown>) => ({
      empresa_id: row.empresa_id as string,
      rol: row.rol as RolBase,
      atributos: (row.atributos ?? []) as AtributoUsuario[],
      configuracion_atributos:
        (row.configuracion_atributos ?? {}) as Record<string, unknown>,
      puesto: (row.puesto as string | null) ?? null,
      empresa: (row.empresas as EmpresaResumen | null) ?? null,
    }));
  },
);

/**
 * Versión sin la información de empresa — útil para checks de permiso puros.
 */
export const obtenerVinculos = cache(async (): Promise<Vinculo[]> => {
  const completos = await obtenerVinculosConEmpresa();
  return completos.map(({ empresa: _empresa, ...rest }) => rest);
});

// ----------------------------------------------------------------------------
// Checks de rol
// ----------------------------------------------------------------------------

export function esCEO(vinculos: Vinculo[]): boolean {
  return vinculos.some((v) => v.rol === "ceo");
}

export function esRolEn(
  vinculos: Vinculo[],
  empresaId: string,
  roles: RolBase | RolBase[],
): boolean {
  const lista = Array.isArray(roles) ? roles : [roles];
  return vinculos.some(
    (v) => v.empresa_id === empresaId && lista.includes(v.rol),
  );
}

export function empresasConRol(
  vinculos: Vinculo[],
  roles: RolBase | RolBase[],
): string[] {
  const lista = Array.isArray(roles) ? roles : [roles];
  return vinculos.filter((v) => lista.includes(v.rol)).map((v) => v.empresa_id);
}

// ----------------------------------------------------------------------------
// Checks de atributos
// ----------------------------------------------------------------------------

export function tieneAtributo(
  vinculos: Vinculo[],
  atributo: AtributoUsuario,
  empresaId?: string,
): boolean {
  return vinculos.some(
    (v) =>
      (empresaId === undefined || v.empresa_id === empresaId) &&
      v.atributos.includes(atributo),
  );
}

export function empresasConAtributo(
  vinculos: Vinculo[],
  atributo: AtributoUsuario,
): string[] {
  return vinculos
    .filter((v) => v.atributos.includes(atributo))
    .map((v) => v.empresa_id);
}

// ----------------------------------------------------------------------------
// Checks financieros (con umbrales)
// ----------------------------------------------------------------------------

function umbralAprobador(
  vinculo: Vinculo,
  campo: keyof ConfigAprobadorFinanciero,
): number | null | undefined {
  const cfg = (vinculo.configuracion_atributos?.["aprobador_financiero"] ??
    {}) as ConfigAprobadorFinanciero;
  return cfg[campo];
}

function puedeAprobarPorCampo(
  vinculos: Vinculo[],
  empresaId: string,
  monto: number,
  campo: keyof ConfigAprobadorFinanciero,
): boolean {
  return vinculos.some((v) => {
    if (v.empresa_id !== empresaId) return false;
    // CEO: siempre puede aprobar (sin umbral).
    if (v.rol === "ceo") return true;
    // Resto: requiere atributo aprobador_financiero.
    if (!v.atributos.includes("aprobador_financiero")) return false;
    const umbral = umbralAprobador(v, campo);
    // Umbral null/undefined = sin límite.
    if (umbral === null || umbral === undefined) return true;
    return monto <= umbral;
  });
}

export function puedeAprobarOC(
  vinculos: Vinculo[],
  empresaId: string,
  monto: number,
): boolean {
  return puedeAprobarPorCampo(vinculos, empresaId, monto, "umbral_max_mxn_oc");
}

export function puedeAprobarOT(
  vinculos: Vinculo[],
  empresaId: string,
  monto: number,
): boolean {
  return puedeAprobarPorCampo(vinculos, empresaId, monto, "umbral_max_mxn_ot");
}

export function puedeAprobarPrestamo(
  vinculos: Vinculo[],
  empresaId: string,
  monto: number,
): boolean {
  return puedeAprobarPorCampo(
    vinculos,
    empresaId,
    monto,
    "umbral_max_mxn_prestamo",
  );
}

// ----------------------------------------------------------------------------
// Checks de acceso a espacios / pantallas
// ----------------------------------------------------------------------------

/**
 * Solo CEO accede a Configuración (panel admin).
 * El spec menciona también un "rol técnico admin" — se modelará como atributo
 * cuando se necesite, por ahora `esCEO` es suficiente.
 */
export function puedeAccederConfiguracion(vinculos: Vinculo[]): boolean {
  return esCEO(vinculos);
}

/**
 * Acceso al espacio Calidad. Spec: CEO, coordinador_calidad, auditor_interno.
 */
export function puedeAccederCalidad(vinculos: Vinculo[]): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "coordinador_calidad") ||
    tieneAtributo(vinculos, "auditor_interno")
  );
}

/**
 * Acceso a tesorería transversal del grupo.
 */
export function puedeVerTesoreriaConsolidada(vinculos: Vinculo[]): boolean {
  return esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo");
}
