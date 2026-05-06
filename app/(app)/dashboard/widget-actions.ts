"use server";

/**
 * Sprint Z.1.5.A — Server actions del dashboard configurable.
 *
 * Maneja CRUD del layout personalizado del usuario, aplicación de plantillas
 * predefinidas (CEO, Director, Contralor, Operativo) y toggles de modo
 * compacto/detallado.
 *
 * Tabla: widget_preferencias_usuario (extendida con vista_activa + modo_compacto)
 * Tabla: widget_plantillas (4 vistas con layout_default)
 */

import { revalidatePath } from "next/cache";

import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  CATALOGO_WIDGETS,
  obtenerWidget,
  plantillaAutomatica,
  type LayoutEntry,
  type TamanoWidget,
  type VistaPlantilla,
  type WidgetLayout,
} from "@/lib/dashboard-widgets/catalogo";
import { createClient } from "@/lib/supabase/server";

const PAGINA = "dashboard";

export type PreferenciasDashboard = {
  layout: WidgetLayout;
  vista_activa: VistaPlantilla;
  modo_compacto: boolean;
  isDefault: boolean;
};

// ============================================================================
// READ
// ============================================================================

/**
 * Obtiene preferencias del usuario para el dashboard.
 * Si no tiene preferencias guardadas, aplica la plantilla automática según
 * su rol/atributos (CEO → ceo, contralor → contralor, etc.).
 */
export async function obtenerPreferencias(): Promise<PreferenciasDashboard> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      layout: [],
      vista_activa: "personalizada",
      modo_compacto: false,
      isDefault: true,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("widget_preferencias_usuario")
    .select("layout, vista_activa, modo_compacto")
    .eq("usuario_id", user.id)
    .eq("pagina", PAGINA)
    .maybeSingle()) as unknown as {
    data: {
      layout: WidgetLayout | null;
      vista_activa: VistaPlantilla | null;
      modo_compacto: boolean | null;
    } | null;
  };

  if (data?.layout && Array.isArray(data.layout) && data.layout.length > 0) {
    return {
      layout: data.layout,
      vista_activa: data.vista_activa ?? "personalizada",
      modo_compacto: data.modo_compacto ?? false,
      isDefault: false,
    };
  }

  // Sin preferencias: usar plantilla automática
  const vinculos = await obtenerVinculos();
  const principal = vinculos[0];
  const vista = principal
    ? plantillaAutomatica(principal.rol, principal.atributos)
    : "operativo";

  const layoutDefault = await obtenerLayoutPlantilla(vista);

  return {
    layout: layoutDefault,
    vista_activa: vista,
    modo_compacto: false,
    isDefault: true,
  };
}

/** Lee el layout default de una plantilla específica desde widget_plantillas. */
export async function obtenerLayoutPlantilla(
  vista: Exclude<VistaPlantilla, "personalizada">,
): Promise<WidgetLayout> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("widget_plantillas")
    .select("layout_default")
    .eq("vista", vista)
    .eq("pagina", PAGINA)
    .maybeSingle()) as unknown as {
    data: { layout_default: WidgetLayout } | null;
  };

  return data?.layout_default ?? [];
}

// ============================================================================
// WRITE
// ============================================================================

async function upsertPreferencias(
  patch: Partial<{
    layout: WidgetLayout;
    vista_activa: VistaPlantilla;
    modo_compacto: boolean;
  }>,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  // Si no existe registro previo, hay que dar layout completo (NOT NULL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existente } = (await (supabase as any)
    .from("widget_preferencias_usuario")
    .select("id, layout")
    .eq("usuario_id", user.id)
    .eq("pagina", PAGINA)
    .maybeSingle()) as unknown as {
    data: { id: string; layout: WidgetLayout } | null;
  };

  const layoutFinal = patch.layout ?? existente?.layout ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("widget_preferencias_usuario")
    .upsert(
      {
        usuario_id: user.id,
        pagina: PAGINA,
        layout: layoutFinal,
        ...(patch.vista_activa !== undefined
          ? { vista_activa: patch.vista_activa }
          : {}),
        ...(patch.modo_compacto !== undefined
          ? { modo_compacto: patch.modo_compacto }
          : {}),
      },
      { onConflict: "usuario_id,pagina" },
    );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, error: null };
}

/** Guarda el layout completo (usado tras drag-drop). */
export async function guardarLayout(
  layout: WidgetLayout,
): Promise<{ ok: boolean; error: string | null }> {
  // Marcar vista como personalizada porque el usuario hizo cambios manuales
  return upsertPreferencias({ layout, vista_activa: "personalizada" });
}

/** Aplica una plantilla predefinida al usuario actual. */
export async function aplicarPlantilla(
  vista: Exclude<VistaPlantilla, "personalizada">,
): Promise<{ ok: boolean; error: string | null }> {
  const layout = await obtenerLayoutPlantilla(vista);
  if (layout.length === 0) {
    return { ok: false, error: `Plantilla "${vista}" no encontrada.` };
  }
  return upsertPreferencias({ layout, vista_activa: vista });
}

/** Toggle entre modo compacto y detallado. */
export async function toggleModoCompacto(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const prefs = await obtenerPreferencias();
  return upsertPreferencias({ modo_compacto: !prefs.modo_compacto });
}

/** Marca un widget como visible=false. */
export async function ocultarWidget(
  widgetId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const prefs = await obtenerPreferencias();
  const nuevoLayout = prefs.layout.map((l) =>
    l.widget_id === widgetId ? { ...l, visible: false } : l,
  );
  return guardarLayout(nuevoLayout);
}

/** Activa un widget (lo agrega si no existe, o lo marca visible=true). */
export async function mostrarWidget(
  widgetId: string,
  tamano?: TamanoWidget,
): Promise<{ ok: boolean; error: string | null }> {
  const meta = obtenerWidget(widgetId);
  if (!meta) return { ok: false, error: `Widget "${widgetId}" no existe.` };

  const prefs = await obtenerPreferencias();
  const existe = prefs.layout.find((l) => l.widget_id === widgetId);

  let nuevoLayout: WidgetLayout;
  if (existe) {
    nuevoLayout = prefs.layout.map((l) =>
      l.widget_id === widgetId
        ? { ...l, visible: true, tamano: tamano ?? l.tamano }
        : l,
    );
  } else {
    const maxOrden = prefs.layout.reduce(
      (acc, l) => Math.max(acc, l.orden),
      0,
    );
    const nuevo: LayoutEntry = {
      widget_id: widgetId,
      orden: maxOrden + 1,
      visible: true,
      tamano: tamano ?? meta.tamanoDefault,
    };
    nuevoLayout = [...prefs.layout, nuevo];
  }

  return guardarLayout(nuevoLayout);
}

/** Cambia el tamaño de un widget concreto. */
export async function cambiarTamanoWidget(
  widgetId: string,
  tamano: TamanoWidget,
): Promise<{ ok: boolean; error: string | null }> {
  const meta = obtenerWidget(widgetId);
  if (!meta) return { ok: false, error: `Widget "${widgetId}" no existe.` };
  if (!meta.tamanosPermitidos.includes(tamano)) {
    return {
      ok: false,
      error: `Tamaño "${tamano}" no permitido para este widget.`,
    };
  }

  const prefs = await obtenerPreferencias();
  const nuevoLayout = prefs.layout.map((l) =>
    l.widget_id === widgetId ? { ...l, tamano } : l,
  );
  return guardarLayout(nuevoLayout);
}

/** Reordena el layout completo. */
export async function reordenarLayout(
  ordenIds: string[],
): Promise<{ ok: boolean; error: string | null }> {
  const prefs = await obtenerPreferencias();
  const map = new Map(prefs.layout.map((l) => [l.widget_id, l]));
  const nuevoLayout: WidgetLayout = ordenIds
    .map((id, idx) => {
      const original = map.get(id);
      if (!original) return null;
      return { ...original, orden: idx + 1 };
    })
    .filter((x): x is LayoutEntry => x !== null);

  // Mantener los que no estaban en el orden (por si acaso)
  for (const l of prefs.layout) {
    if (!ordenIds.includes(l.widget_id)) {
      nuevoLayout.push({ ...l, orden: nuevoLayout.length + 1 });
    }
  }

  return guardarLayout(nuevoLayout);
}

/** Borra preferencias del usuario, vuelve al default por rol. */
export async function restablecerLayout(): Promise<{
  ok: boolean;
  error: string | null;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("widget_preferencias_usuario")
    .delete()
    .eq("usuario_id", user.id)
    .eq("pagina", PAGINA);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, error: null };
}

/** Lista de IDs de widgets disponibles (para el picker). */
export async function obtenerCatalogoIds(): Promise<string[]> {
  return CATALOGO_WIDGETS.map((w) => w.id);
}
