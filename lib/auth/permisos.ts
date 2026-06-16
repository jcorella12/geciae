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
  | "cliente"
  // Modelo de 3 roles (migración ROLES F2, 2026-07-08). Conviven con los
  // viejos: directivo = ceo/director fusionados (override global); administrativo
  // = operación + finanzas. Los helpers de abajo reconocen ambos modelos.
  | "directivo"
  | "administrativo";

export type AtributoUsuario =
  | "aprobador_financiero"
  | "coordinador_calidad"
  | "tesorero_corporativo"
  | "auditor_interno"
  | "vendedor"
  | "supervisor_cuadrilla"
  | "rh"
  | "contralor";

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
  // "directivo" es el nuevo ceo-equivalente (override global). Espeja la RLS
  // usuario_es_ceo() que reconoce ceo/director/directivo.
  return vinculos.some((v) => v.rol === "ceo" || v.rol === "directivo");
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
    if (v.rol === "ceo" || v.rol === "directivo") return true;
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

/**
 * Puede crear OC en una empresa específica.
 * Spec: CEO/Director/Operativo de esa empresa.
 */
export function puedeCrearOCEn(
  vinculos: Vinculo[],
  empresaId: string,
): boolean {
  return vinculos.some(
    (v) =>
      v.empresa_id === empresaId &&
      (["ceo", "director", "operativo", "directivo", "administrativo"] as RolBase[]).includes(v.rol),
  );
}

/** Empresas donde el usuario puede crear OC. */
export function empresasDondeCreaOC(vinculos: Vinculo[]): string[] {
  return vinculos
    .filter((v) =>
      (["ceo", "director", "operativo", "directivo", "administrativo"] as RolBase[]).includes(v.rol),
    )
    .map((v) => v.empresa_id);
}

/**
 * Puede crear/editar proyectos en una empresa específica.
 * Mismas reglas que OC: CEO/Director/Operativo de esa empresa.
 */
export function puedeGestionarProyectosEn(
  vinculos: Vinculo[],
  empresaId: string,
): boolean {
  return vinculos.some(
    (v) =>
      v.empresa_id === empresaId &&
      (["ceo", "director", "operativo", "directivo", "administrativo"] as RolBase[]).includes(v.rol),
  );
}

/** Empresas donde el usuario puede crear/editar proyectos. */
export function empresasDondeGestionaProyectos(vinculos: Vinculo[]): string[] {
  return vinculos
    .filter((v) =>
      (["ceo", "director", "operativo", "directivo", "administrativo"] as RolBase[]).includes(v.rol),
    )
    .map((v) => v.empresa_id);
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
 * Puede restablecer contraseñas de otros usuarios desde el panel admin.
 * CEO o contralor — soporte de primer nivel cuando alguien pierde acceso.
 *
 * NO incluye otras operaciones admin (invitar, vincular empresas, desactivar):
 * esas siguen siendo CEO-only.
 */
export function puedeRestablecerContrasenas(vinculos: Vinculo[]): boolean {
  return esCEO(vinculos) || tieneAtributo(vinculos, "contralor");
}

/**
 * Puede gestionar el catálogo global de capacitaciones (cursos disponibles).
 * CEO, atributo rh, o cualquier director (los directores arman cursos
 * propios para su empresa).
 */
export function puedeGestionarCatalogoCapacitaciones(
  vinculos: Vinculo[],
): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "rh") ||
    vinculos.some((v) => (v.rol === "director" || v.rol === "directivo"))
  );
}

/**
 * Puede asignar/editar capacitaciones de un empleado específico.
 * CEO, atributo rh, o director de la empresa del empleado.
 * Coincide con la RLS de `empleados_capacitaciones`.
 */
export function puedeAsignarCapacitacionEn(
  vinculos: Vinculo[],
  empleadoEmpresaId: string,
): boolean {
  if (esCEO(vinculos)) return true;
  if (tieneAtributo(vinculos, "rh")) return true;
  return vinculos.some(
    (v) =>
      v.empresa_id === empleadoEmpresaId &&
      (v.rol === "director" || v.rol === "directivo"),
  );
}

/**
 * Puede gestionar el catálogo de clientes (alta, edición, vinculación).
 * Spec: cualquier rol con función comercial/operativa.
 */
export function puedeGestionarClientes(vinculos: Vinculo[]): boolean {
  return vinculos.some((v) =>
    (["ceo", "director", "operativo", "directivo", "administrativo"] as RolBase[]).includes(v.rol),
  );
}

/**
 * Puede gestionar el catálogo de proveedores. Mismas reglas que clientes
 * para Sprint 2 — Sprint 4 agregará bloqueos finos por semáforo.
 */
export const puedeGestionarProveedores = puedeGestionarClientes;

/**
 * Puede crear/editar empleados de una empresa específica.
 * Spec: CEO o Director con acceso a esa empresa. RH (con atributo) en Sprint 7.
 */
export function puedeGestionarEmpleadosEn(
  vinculos: Vinculo[],
  empresaId: string,
): boolean {
  return vinculos.some(
    (v) =>
      v.empresa_id === empresaId &&
      (["ceo", "director", "directivo"] as RolBase[]).includes(v.rol),
  );
}

/** ¿Puede ver al menos algún empleado en alguna empresa? */
export function puedeVerEmpleados(vinculos: Vinculo[]): boolean {
  return vinculos.length > 0;
}

/** Empresas en las que puede dar de alta empleados. */
export function empresasDondeGestionaEmpleados(
  vinculos: Vinculo[],
): string[] {
  return vinculos
    .filter((v) => (["ceo", "director", "directivo"] as RolBase[]).includes(v.rol))
    .map((v) => v.empresa_id);
}

/* puedeAccederCalidad eliminada — el módulo SGC/ISO salió del ERP (sprint
   PODA, 2026-06). El SGC vivirá en app separada e integrará vía API. */

/**
 * Acceso a tesorería transversal del grupo.
 */
export function puedeVerTesoreriaConsolidada(vinculos: Vinculo[]): boolean {
  return esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo");
}

/**
 * Acceso al panel de Centros de costo y utilidad.
 * CEO, tesorero corporativo, auditor interno (lectura) o director de
 * cualquier empresa.
 */
export function puedeAccederCentros(vinculos: Vinculo[]): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    tieneAtributo(vinculos, "auditor_interno") ||
    vinculos.some((v) => (v.rol === "director" || v.rol === "directivo"))
  );
}

/**
 * Puede crear/editar/archivar centros de una empresa específica.
 */
export function puedeGestionarCentrosEn(
  vinculos: Vinculo[],
  empresaId: string,
): boolean {
  return (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    esRolEn(vinculos, empresaId, ["director", "directivo"])
  );
}

/**
 * Empresas en las que el usuario puede gestionar centros.
 */
export function empresasDondeGestionaCentros(vinculos: Vinculo[]): string[] {
  if (esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo")) {
    // CEO/tesorero ven todas: el caller decide cómo expandir esta lista
    return Array.from(new Set(vinculos.map((v) => v.empresa_id)));
  }
  return vinculos.filter((v) => (v.rol === "director" || v.rol === "directivo")).map((v) => v.empresa_id);
}

/**
 * Solo CEO o tesorero corporativo modifican reglas de reparto.
 */
export function puedeGestionarReglasReparto(vinculos: Vinculo[]): boolean {
  return esCEO(vinculos) || tieneAtributo(vinculos, "tesorero_corporativo");
}

/**
 * ¿Puede el usuario actual ver datos de nómina/compensación de un empleado
 * dado? Incluye:
 *   - CEO siempre
 *   - Director, operativo o RH de la empresa del empleado
 *   - Atributos transversales: rh, contralor, tesorero_corporativo,
 *     auditor_interno
 *   - El propio empleado (si su usuario_id coincide)
 *   - Su jefe directo (resuelto por el caller)
 */
export function puedeVerNominaEmpleado(
  vinculos: Vinculo[],
  opts: {
    empleadoEmpresaId: string;
    /** TRUE si el usuario actual es el dueño del registro empleado. */
    esDuenio?: boolean;
    /** TRUE si el usuario actual es jefe directo (resuelto por el caller). */
    esJefeDirecto?: boolean;
  },
): boolean {
  if (opts.esDuenio) return true;
  if (opts.esJefeDirecto) return true;
  if (esCEO(vinculos)) return true;
  if (tieneAtributo(vinculos, "rh")) return true;
  if (tieneAtributo(vinculos, "contralor")) return true;
  if (tieneAtributo(vinculos, "tesorero_corporativo")) return true;
  if (tieneAtributo(vinculos, "auditor_interno")) return true;
  if (esRolEn(vinculos, opts.empleadoEmpresaId, ["director", "directivo"]))
    return true;
  return false;
}

/**
 * Empresas donde el usuario puede ver nómina (sin condición empleado-específico).
 * Útil para filtros de UI consolidada.
 */
export function empresasConVisibilidadNomina(vinculos: Vinculo[]): string[] {
  if (
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "rh") ||
    tieneAtributo(vinculos, "contralor") ||
    tieneAtributo(vinculos, "tesorero_corporativo") ||
    tieneAtributo(vinculos, "auditor_interno")
  ) {
    return Array.from(new Set(vinculos.map((v) => v.empresa_id)));
  }
  // Director: solo de su empresa
  return vinculos.filter((v) => (v.rol === "director" || v.rol === "directivo")).map((v) => v.empresa_id);
}
