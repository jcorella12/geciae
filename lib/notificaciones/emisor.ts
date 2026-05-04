/**
 * Helpers para emitir notificaciones desde server actions.
 *
 * Patrón:
 * - Cada acción que requiere atención de otro usuario llama a `crearNotificaciones`.
 * - El destinatario las ve en la campana del topbar.
 * - RLS asegura que cada usuario solo lea las suyas.
 */
import { createClient } from "@/lib/supabase/server";

export type NuevaNotif = {
  usuario_id: string;
  empresa_id?: string | null;
  tipo: string;
  severidad?: "info" | "warning" | "danger" | "success";
  titulo: string;
  mensaje?: string | null;
  url?: string | null;
  entidad_tipo?: string | null;
  entidad_id?: string | null;
};

export async function crearNotificaciones(notifs: NuevaNotif[]): Promise<void> {
  if (notifs.length === 0) return;
  const supabase = createClient();
  const rows = notifs.map((n) => ({
    usuario_id: n.usuario_id,
    empresa_id: n.empresa_id ?? null,
    tipo: n.tipo,
    severidad: n.severidad ?? "info",
    titulo: n.titulo,
    mensaje: n.mensaje ?? null,
    url: n.url ?? null,
    entidad_tipo: n.entidad_tipo ?? null,
    entidad_id: n.entidad_id ?? null,
    leida: false,
  }));
  // Best effort: si falla, no bloquea la acción principal.
  await supabase.from("notificaciones").insert(rows);
}

/**
 * Devuelve los IDs de auth.users que pueden aprobar OC de un monto en una empresa.
 * Usado por `notificarOCPendienteAprobacion`.
 */
export async function aprobadoresOC(
  empresaId: string,
  monto: number,
): Promise<string[]> {
  const supabase = createClient();
  const { data: vinculos } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id, rol, atributos, configuracion_atributos")
    .eq("empresa_id", empresaId)
    .eq("activo", true);

  if (!vinculos) return [];

  const ids: string[] = [];
  for (const v of vinculos) {
    const rol = v.rol as string;
    const atributos = (v.atributos as string[] | null) ?? [];
    const cfg = (v.configuracion_atributos as Record<string, unknown> | null) ?? {};

    if (rol === "ceo") {
      ids.push(v.usuario_id);
      continue;
    }
    if (atributos.includes("aprobador_financiero")) {
      const af = (cfg["aprobador_financiero"] ?? {}) as {
        umbral_max_mxn_oc?: number | null;
      };
      const umbral = af.umbral_max_mxn_oc;
      if (umbral === null || umbral === undefined || monto <= umbral) {
        ids.push(v.usuario_id);
      }
    }
  }
  // Dedupe por si un usuario tiene múltiples rows (no debería, pero por defensa).
  return Array.from(new Set(ids));
}

/**
 * Devuelve los IDs de auth.users que pueden aprobar préstamos inter-co
 * en la empresa acreedora por un monto dado.
 */
export async function aprobadoresPrestamo(
  empresaAcreedoraId: string,
  monto: number,
): Promise<string[]> {
  const supabase = createClient();
  const { data: vinculos } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id, rol, atributos, configuracion_atributos")
    .eq("empresa_id", empresaAcreedoraId)
    .eq("activo", true);

  if (!vinculos) return [];

  const ids: string[] = [];
  for (const v of vinculos) {
    const rol = v.rol as string;
    const atributos = (v.atributos as string[] | null) ?? [];
    const cfg = (v.configuracion_atributos as Record<string, unknown> | null) ?? {};

    if (rol === "ceo") {
      ids.push(v.usuario_id);
      continue;
    }
    if (atributos.includes("tesorero_corporativo")) {
      ids.push(v.usuario_id);
      continue;
    }
    if (atributos.includes("aprobador_financiero")) {
      const af = (cfg["aprobador_financiero"] ?? {}) as {
        umbral_max_mxn_prestamo?: number | null;
      };
      const umbral = af.umbral_max_mxn_prestamo;
      if (umbral === null || umbral === undefined || monto <= umbral) {
        ids.push(v.usuario_id);
      }
    }
  }
  return Array.from(new Set(ids));
}

/**
 * Tesorero corporativo + CEO de cualquier empresa (notificación de ejecución).
 */
export async function tesorerosCorporativos(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("usuarios_empresas")
    .select("usuario_id, rol, atributos")
    .eq("activo", true);
  if (!data) return [];
  const ids: string[] = [];
  for (const v of data) {
    const rol = v.rol as string;
    const atributos = (v.atributos as string[] | null) ?? [];
    if (rol === "ceo" || atributos.includes("tesorero_corporativo")) {
      ids.push(v.usuario_id);
    }
  }
  return Array.from(new Set(ids));
}
