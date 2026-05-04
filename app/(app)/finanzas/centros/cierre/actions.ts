"use server";

import { revalidatePath } from "next/cache";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  CerrarMesSchema,
  ReabrirMesSchema,
} from "@/lib/centros/schemas";
import {
  initialSimpleCentroState,
  type SimpleCentroState,
} from "@/lib/centros/state";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierre mensual de centros (Sprint 5.5.4).
 *
 * Permisos: solo CEO o tesorero corporativo. El plan especifica que el
 * cierre tiene impacto financiero alto y afecta inter-co.
 */

async function gateCierre(): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (esCEO(v) || tieneAtributo(v, "tesorero_corporativo")) return { ok: true };
  return {
    ok: false,
    error: "Solo CEO o tesorero corporativo pueden cerrar/reabrir meses.",
  };
}

// ============================================================================
// Tipos compartidos
// ============================================================================

export type PreviewMovimiento = {
  centro_origen_id: string;
  centro_origen_codigo: string;
  centro_origen_nombre: string;
  empresa_destino_id: string;
  empresa_destino_codigo: string;
  centro_destino_id: string | null;
  centro_destino_codigo: string | null;
  metodo: string;
  valor: number | null;
  emision: string;
  monto_calculado: number;
  notas: string;
};

export type PreviewResultado = {
  ok: boolean;
  error: string | null;
  cerrado: boolean;
  totalesPorCC: Array<{
    centro_id: string;
    codigo: string;
    nombre: string;
    total: number;
    repartido: number;
    diferencia: number;
  }>;
  movimientos: PreviewMovimiento[];
  warnings: string[];
};

// ============================================================================
// previewCierreMes — calcula los movimientos sin guardarlos
// ============================================================================

export async function previewCierreMes(
  empresaId: string,
  anio: number,
  mes: number,
): Promise<PreviewResultado> {
  const empty: PreviewResultado = {
    ok: false,
    error: null,
    cerrado: false,
    totalesPorCC: [],
    movimientos: [],
    warnings: [],
  };

  const gate = await gateCierre();
  if (!gate.ok) return { ...empty, error: gate.error };

  const supabase = createClient();

  // Estado del cierre
  const { data: cierre } = await supabase
    .from("centros_cierres_mensuales")
    .select("cerrado")
    .eq("empresa_id", empresaId)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  const cerrado = Boolean(cierre?.cerrado);

  // CCs compartidos de la empresa
  const { data: ccs } = await supabase
    .from("centros")
    .select("id, codigo, nombre")
    .eq("empresa_id", empresaId)
    .eq("subtipo", "servicio_compartido")
    .eq("activo", true)
    .order("codigo");

  const totales: PreviewResultado["totalesPorCC"] = [];
  const movimientos: PreviewMovimiento[] = [];
  const warnings: string[] = [];

  for (const cc of ccs ?? []) {
    // Total mes del CC: gastos_directos + reparto_recibido
    const inicioMes = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const inicioSiguiente =
      mes === 12
        ? `${anio + 1}-01-01`
        : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;

    const { data: movs } = await supabase
      .from("centros_movimientos")
      .select("tipo, monto")
      .eq("centro_id", cc.id)
      .gte("fecha", inicioMes)
      .lt("fecha", inicioSiguiente);

    let total = 0;
    for (const m of movs ?? []) {
      const t = m.tipo as string;
      if (t === "gasto_directo" || t === "reparto_recibido")
        total += Number(m.monto);
    }

    if (total === 0) continue;

    // Reglas vigentes
    const { data: reglas } = await supabase
      .from("centros_reglas_reparto")
      .select(
        "id, empresa_destino_id, centro_destino_id, metodo, valor, emision, vigencia_desde, vigencia_hasta",
      )
      .eq("centro_origen_id", cc.id)
      .eq("activa", true);

    const ultimoDiaMes = mes === 12
      ? `${anio}-12-31`
      : new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
    const reglasVigentes = (reglas ?? []).filter((r) => {
      const desde = r.vigencia_desde as string;
      const hasta = (r.vigencia_hasta as string | null) ?? "9999-12-31";
      return desde <= ultimoDiaMes && hasta >= inicioMes;
    });

    if (reglasVigentes.length === 0) {
      warnings.push(
        `CC '${cc.codigo}' tiene total ${total.toFixed(2)} pero no hay reglas vigentes para ${anio}-${String(mes).padStart(2, "0")}.`,
      );
      totales.push({
        centro_id: cc.id,
        codigo: cc.codigo,
        nombre: cc.nombre,
        total,
        repartido: 0,
        diferencia: total,
      });
      continue;
    }

    // Empresas destino para etiquetas
    const empresasDestIds = Array.from(
      new Set(reglasVigentes.map((r) => r.empresa_destino_id as string)),
    );
    const { data: empresasDest } = await supabase
      .from("empresas")
      .select("id, codigo")
      .in("id", empresasDestIds);
    const empresaPorId = new Map(
      (empresasDest ?? []).map((e) => [e.id, e.codigo as string]),
    );

    // Centros destino para etiquetas
    const centrosDestIds = reglasVigentes
      .map((r) => r.centro_destino_id as string | null)
      .filter((v): v is string => Boolean(v));
    const { data: centrosDest } = centrosDestIds.length
      ? await supabase
          .from("centros")
          .select("id, codigo")
          .in("id", centrosDestIds)
      : { data: [] as Array<{ id: string; codigo: string }> };
    const centroPorId = new Map(
      (centrosDest ?? []).map((c) => [c.id, c.codigo as string]),
    );

    // Calcular reparto según método
    let repartido = 0;
    for (const r of reglasVigentes) {
      let monto = 0;
      let notas = "";
      const metodo = r.metodo as string;

      if (metodo === "porcentaje_fijo") {
        const pct = Number(r.valor ?? 0);
        monto = (total * pct) / 100;
        notas = `${pct.toFixed(2)}% de ${total.toFixed(2)}`;
      } else if (metodo === "por_empleados") {
        // base proporcional al # empleados de las empresas destino
        // RPC custom — el cast `as never` es porque la function se creó en
        // la migración 5.5.4 y los types se regenerarán después.
        const empResult = await supabase.rpc(
          "empleados_activos_empresa_mes" as never,
          {
            p_empresa_id: r.empresa_destino_id,
            p_anio: anio,
            p_mes: mes,
          } as never,
        );
        const empCount = (empResult.data as number | null) ?? 0;
        notas = `Por empleados activos (${empCount}). Pendiente: definir total grupo. Repartiendo proporcional simple.`;
        warnings.push(
          `Regla por_empleados aún no calcula proporciones grupo. Edita la regla a porcentaje_fijo para este cierre.`,
        );
      } else if (metodo === "por_proyectos") {
        notas = "Por proyectos activos. No implementado en preview.";
        warnings.push(
          `Método por_proyectos no implementado en este preview. Convertir a porcentaje_fijo.`,
        );
      } else if (metodo === "por_ingresos") {
        notas = "Por ingresos del periodo. No implementado en preview.";
        warnings.push(
          `Método por_ingresos no implementado en este preview. Convertir a porcentaje_fijo.`,
        );
      } else if (metodo === "por_horas") {
        notas = "Por horas registradas. Requiere integración de time-tracking.";
        warnings.push(
          `Método por_horas requiere time-tracking. Convertir a porcentaje_fijo.`,
        );
      }

      if (monto <= 0) continue;
      repartido += monto;
      movimientos.push({
        centro_origen_id: cc.id,
        centro_origen_codigo: cc.codigo,
        centro_origen_nombre: cc.nombre,
        empresa_destino_id: r.empresa_destino_id as string,
        empresa_destino_codigo:
          empresaPorId.get(r.empresa_destino_id as string) ?? "?",
        centro_destino_id: (r.centro_destino_id as string | null) ?? null,
        centro_destino_codigo: r.centro_destino_id
          ? centroPorId.get(r.centro_destino_id as string) ?? null
          : null,
        metodo,
        valor: r.valor != null ? Number(r.valor) : null,
        emision: r.emision as string,
        monto_calculado: Math.round(monto * 100) / 100,
        notas,
      });
    }

    totales.push({
      centro_id: cc.id,
      codigo: cc.codigo,
      nombre: cc.nombre,
      total,
      repartido: Math.round(repartido * 100) / 100,
      diferencia: Math.round((total - repartido) * 100) / 100,
    });

    if (Math.abs(total - repartido) > 0.01) {
      warnings.push(
        `CC '${cc.codigo}': diferencia de ${(total - repartido).toFixed(2)} entre total y repartido. Las reglas no cubren el 100% (o exceden).`,
      );
    }
  }

  return {
    ok: true,
    error: null,
    cerrado,
    totalesPorCC: totales,
    movimientos,
    warnings,
  };
}

// ============================================================================
// ejecutarCierreMes — guarda movimientos y marca el cierre
// ============================================================================

export async function ejecutarCierreMes(
  _prev: SimpleCentroState,
  formData: FormData,
): Promise<SimpleCentroState> {
  const parsed = CerrarMesSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    anio: formData.get("anio"),
    mes: formData.get("mes"),
    observaciones: formData.get("observaciones") ?? "",
  });
  if (!parsed.success)
    return { ...initialSimpleCentroState, error: "Datos inválidos." };

  const gate = await gateCierre();
  if (!gate.ok) return { ...initialSimpleCentroState, error: gate.error };

  const { empresa_id, anio, mes, observaciones } = parsed.data;
  const supabase = createClient();

  // Validar que no esté ya cerrado
  const { data: existente } = await supabase
    .from("centros_cierres_mensuales")
    .select("id, cerrado")
    .eq("empresa_id", empresa_id)
    .eq("anio", anio)
    .eq("mes", mes)
    .maybeSingle();
  if (existente?.cerrado) {
    return {
      ...initialSimpleCentroState,
      error: "El mes ya está cerrado. Reabrir primero si quieres re-ejecutar.",
    };
  }

  // Obtener preview con cálculos
  const preview = await previewCierreMes(empresa_id, anio, mes);
  if (!preview.ok)
    return {
      ...initialSimpleCentroState,
      error: preview.error ?? "Error en preview.",
    };

  // Insertar movimientos en batch (reparto_emitido en origen + reparto_recibido en destino)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...initialSimpleCentroState, error: "Sin sesión." };

  const fechaCierre = `${anio}-${String(mes).padStart(2, "0")}-01`;
  let totalRepartosEmitidos = 0;
  let totalRepartosRecibidos = 0;

  for (const mv of preview.movimientos) {
    // 1) Movimiento origen (reparto_emitido)
    const { data: origen, error: errO } = await supabase
      .from("centros_movimientos")
      .insert({
        centro_id: mv.centro_origen_id,
        empresa_id,
        fecha: fechaCierre,
        tipo: "reparto_emitido" as never,
        concepto: `Reparto a ${mv.empresa_destino_codigo}${mv.centro_destino_codigo ? `/${mv.centro_destino_codigo}` : ""}`,
        monto: mv.monto_calculado,
        regla_reparto_id: null, // Sin acceso al ID exacto aquí, se podría enlazar después
        capturado_por: user.id,
        observaciones: `Cierre ${anio}-${String(mes).padStart(2, "0")}: ${mv.notas}`,
      })
      .select("id")
      .single();
    if (errO || !origen)
      return {
        ...initialSimpleCentroState,
        error: `Error registrando reparto emitido: ${errO?.message}`,
      };
    totalRepartosEmitidos += mv.monto_calculado;

    // 2) Movimiento destino (reparto_recibido)
    const { error: errD } = await supabase.from("centros_movimientos").insert({
      centro_id: mv.centro_destino_id ?? mv.centro_origen_id, // si no hay centro destino específico, fallback (no ideal pero coherente)
      empresa_id: mv.empresa_destino_id,
      fecha: fechaCierre,
      tipo: "reparto_recibido" as never,
      concepto: `Reparto recibido de ${mv.centro_origen_codigo}`,
      monto: mv.monto_calculado,
      origen_movimiento_id: origen.id,
      capturado_por: user.id,
      observaciones: `Cierre ${anio}-${String(mes).padStart(2, "0")}: ${mv.notas}`,
    });
    if (errD)
      return {
        ...initialSimpleCentroState,
        error: `Error registrando reparto recibido: ${errD.message}`,
      };
    totalRepartosRecibidos += mv.monto_calculado;
  }

  // Marcar cierre
  const ahora = new Date().toISOString();
  if (existente) {
    await supabase
      .from("centros_cierres_mensuales")
      .update({
        cerrado: true,
        cerrado_por: user.id,
        cerrado_at: ahora,
        total_repartos_emitidos: totalRepartosEmitidos,
        total_repartos_recibidos: totalRepartosRecibidos,
        observaciones,
      })
      .eq("id", existente.id);
  } else {
    await supabase.from("centros_cierres_mensuales").insert({
      empresa_id,
      anio,
      mes,
      cerrado: true,
      cerrado_por: user.id,
      cerrado_at: ahora,
      total_repartos_emitidos: totalRepartosEmitidos,
      total_repartos_recibidos: totalRepartosRecibidos,
      observaciones,
    });
  }

  revalidatePath("/finanzas/centros/cierre");
  revalidatePath("/configuracion/centros");
  return { ok: true, error: null };
}

// ============================================================================
// reabrirMes — permite re-ejecutar
// ============================================================================

export async function reabrirMes(
  _prev: SimpleCentroState,
  formData: FormData,
): Promise<SimpleCentroState> {
  const parsed = ReabrirMesSchema.safeParse({
    empresa_id: formData.get("empresa_id"),
    anio: formData.get("anio"),
    mes: formData.get("mes"),
    motivo: formData.get("motivo"),
  });
  if (!parsed.success)
    return {
      ...initialSimpleCentroState,
      error: "Datos inválidos. El motivo debe tener al menos 10 caracteres.",
    };

  const gate = await gateCierre();
  if (!gate.ok) return { ...initialSimpleCentroState, error: gate.error };

  const { empresa_id, anio, mes, motivo } = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ...initialSimpleCentroState, error: "Sin sesión." };

  // Borrar movimientos generados por el cierre (reparto_emitido + reparto_recibido del mes)
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const fin =
    mes === 12
      ? `${anio + 1}-01-01`
      : `${anio}-${String(mes + 1).padStart(2, "0")}-01`;

  // Primero marcar reabierto (para que el trigger permita borrar)
  const { error: errUpd } = await supabase
    .from("centros_cierres_mensuales")
    .update({
      cerrado: false,
      reabierto_por: user.id,
      reabierto_at: new Date().toISOString(),
      reabierto_motivo: motivo,
    })
    .eq("empresa_id", empresa_id)
    .eq("anio", anio)
    .eq("mes", mes);
  if (errUpd) return { ...initialSimpleCentroState, error: errUpd.message };

  await supabase
    .from("centros_movimientos")
    .delete()
    .eq("empresa_id", empresa_id)
    .gte("fecha", inicio)
    .lt("fecha", fin)
    .in("tipo", ["reparto_emitido", "reparto_recibido"]);

  revalidatePath("/finanzas/centros/cierre");
  return { ok: true, error: null };
}
