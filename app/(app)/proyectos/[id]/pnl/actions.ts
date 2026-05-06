"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  CostoImputadoSchema,
  HorasCampoSchema,
  HorasIngenieriaSchema,
  PresupuestoSchema,
} from "@/lib/proyecto-pnl/schemas";
import { createClient } from "@/lib/supabase/server";

async function gateProyectoPnl(empresaId: string): Promise<boolean> {
  const v = await obtenerVinculos();
  if (esCEO(v)) return true;
  if (esRolEn(v, empresaId, ["director"])) return true;
  return tieneAtributo(v, "contralor");
}

export async function guardarPresupuesto(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const obj: Record<string, unknown> = {};
  formData.forEach((v, k) => {
    obj[k] = v;
  });
  const parsed = PresupuestoSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  // Empresa del proyecto
  const { data: proy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id, estado")
    .eq("id", d.proyecto_id)
    .maybeSingle();
  if (!proy) return { ok: false, error: "Proyecto no encontrado." };
  if (!(await gateProyectoPnl(proy.empresa_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { error } = await (supabase as any)
    .from("proyecto_presupuesto")
    .upsert(
      {
        proyecto_id: d.proyecto_id,
        ingreso_total: d.ingreso_total,
        presupuesto_materiales: d.presupuesto_materiales,
        presupuesto_mano_obra_ingenieria: d.presupuesto_mano_obra_ingenieria,
        presupuesto_mano_obra_campo: d.presupuesto_mano_obra_campo,
        presupuesto_subcontratos: d.presupuesto_subcontratos,
        presupuesto_activos_compartidos: d.presupuesto_activos_compartidos,
        presupuesto_logistica: d.presupuesto_logistica,
        presupuesto_indirectos: d.presupuesto_indirectos,
        presupuesto_otros: d.presupuesto_otros,
        porcentaje_provision_garantia: d.porcentaje_provision_garantia,
        margen_objetivo_pct: d.margen_objetivo_pct,
        cotizacion_id: d.cotizacion_id,
        observaciones: d.observaciones,
        capturado_por: user.id,
      },
      { onConflict: "proyecto_id" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/proyectos/${d.proyecto_id}`);
  revalidatePath(`/proyectos/${d.proyecto_id}/pnl`);
  return { ok: true, error: null };
}

export async function cerrarPresupuesto(
  proyectoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: proy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proy) return { ok: false, error: "No encontrado." };
  if (!(await gateProyectoPnl(proy.empresa_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const { error } = await (supabase as any)
    .from("proyecto_presupuesto")
    .update({
      cerrado: true,
      cerrado_por: user.id,
      cerrado_at: new Date().toISOString(),
    })
    .eq("proyecto_id", proyectoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/proyectos/${proyectoId}/pnl`);
  return { ok: true, error: null };
}

export async function agregarCostoImputado(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const obj: Record<string, unknown> = {};
  formData.forEach((v, k) => {
    obj[k] = v;
  });
  const parsed = CostoImputadoSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  if (!(await gateProyectoPnl(d.empresa_id))) {
    return { ok: false, error: "Sin permiso." };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { error } = await (supabase as any)
    .from("proyecto_costos_imputados")
    .insert({
      proyecto_id: d.proyecto_id,
      empresa_id: d.empresa_id,
      fecha: d.fecha,
      tipo: d.tipo,
      categoria: d.categoria,
      concepto: d.concepto,
      monto: d.monto,
      centro_id: d.centro_id,
      comprobante_url: d.comprobante_url,
      justificacion: d.justificacion,
      capturado_por: user.id,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/proyectos/${d.proyecto_id}/pnl`);
  return { ok: true, error: null };
}

export async function generarProvisionGarantia(
  proyectoId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: proy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id")
    .eq("id", proyectoId)
    .maybeSingle();
  if (!proy) return { ok: false, error: "No encontrado." };
  if (!(await gateProyectoPnl(proy.empresa_id))) {
    return { ok: false, error: "Sin permiso." };
  }

  const { data: monto } = await (supabase as any).rpc(
    "calcular_provision_garantia",
    { p_proyecto_id: proyectoId },
  );
  const provision = Number(monto ?? 0);
  if (provision <= 0) {
    return { ok: false, error: "Sin presupuesto o provisión = 0." };
  }

  // Verificar si ya existe (única por proyecto)
  const { data: existing } = await (supabase as any)
    .from("proyecto_costos_imputados")
    .select("id")
    .eq("proyecto_id", proyectoId)
    .eq("tipo", "provision_garantia")
    .eq("activo", true)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "Ya existe provisión de garantía activa." };
  }

  const { error } = await (supabase as any)
    .from("proyecto_costos_imputados")
    .insert({
      proyecto_id: proyectoId,
      empresa_id: proy.empresa_id,
      fecha: new Date().toISOString().slice(0, 10),
      tipo: "provision_garantia",
      categoria: "garantia_provision",
      concepto: `Provisión automática de garantía`,
      monto: provision,
      justificacion:
        "Generación automática según porcentaje de provisión configurado en el presupuesto.",
      capturado_por: user.id,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/proyectos/${proyectoId}/pnl`);
  return { ok: true, error: null };
}

export async function registrarHorasIngenieria(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = HorasIngenieriaSchema.safeParse({
    proyecto_id: formData.get("proyecto_id"),
    semana_inicio: formData.get("semana_inicio"),
    horas: formData.get("horas"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: emp } = await (supabase as any)
    .from("empleados")
    .select("id, empresa_id")
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!emp) return { ok: false, error: "No estás vinculado a un empleado." };

  // Tarifa hora ingeniería de la empresa (si hay tarifas_internas)
  let tarifa = 0;
  const { data: t } = await (supabase as any)
    .from("tarifas_internas")
    .select("costo_unitario")
    .eq("empresa_id", emp.empresa_id)
    .eq("concepto", "hora_ingeniero")
    .eq("activa", true)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (t) tarifa = Number(t.costo_unitario);

  // Calcular semana_fin (lunes + 6 días)
  const inicio = new Date(d.semana_inicio);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);

  const { error } = await (supabase as any)
    .from("proyecto_horas_trabajadas")
    .upsert(
      {
        proyecto_id: d.proyecto_id,
        empleado_id: emp.id,
        registrado_por: user.id,
        tipo: "ingenieria_propia",
        semana_inicio: d.semana_inicio,
        semana_fin: fin.toISOString().slice(0, 10),
        horas: d.horas,
        tarifa_aplicada: tarifa,
      },
      { onConflict: "empleado_id,proyecto_id,semana_inicio" },
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/proyectos/${d.proyecto_id}/pnl`);
  revalidatePath("/personas/horas");
  return { ok: true, error: null };
}

export async function registrarHorasCampo(
  formData: FormData,
): Promise<{ ok: boolean; error: string | null }> {
  const parsed = HorasCampoSchema.safeParse({
    proyecto_id: formData.get("proyecto_id"),
    semana_inicio: formData.get("semana_inicio"),
    cuadrilla_descripcion: formData.get("cuadrilla_descripcion"),
    num_personas: formData.get("num_personas"),
    horas: formData.get("horas"),
    observaciones: formData.get("observaciones") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    };
  }
  const d = parsed.data;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sin sesión." };

  const { data: proy } = await (supabase as any)
    .from("proyectos")
    .select("empresa_id, pm_id")
    .eq("id", d.proyecto_id)
    .maybeSingle();
  if (!proy) return { ok: false, error: "Proyecto no encontrado." };

  const v = await obtenerVinculos();
  const puede =
    proy.pm_id === user.id ||
    esCEO(v) ||
    esRolEn(v, proy.empresa_id, ["director"]);
  if (!puede) return { ok: false, error: "Solo PM, director o CEO." };

  let tarifa = 0;
  const { data: t } = await (supabase as any)
    .from("tarifas_internas")
    .select("costo_unitario")
    .eq("empresa_id", proy.empresa_id)
    .eq("concepto", "hora_tecnico_obra")
    .eq("activa", true)
    .order("vigente_desde", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (t) tarifa = Number(t.costo_unitario);

  const inicio = new Date(d.semana_inicio);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 6);

  const { error } = await (supabase as any)
    .from("proyecto_horas_trabajadas")
    .insert({
      proyecto_id: d.proyecto_id,
      registrado_por: user.id,
      tipo: "campo_estimado",
      semana_inicio: d.semana_inicio,
      semana_fin: fin.toISOString().slice(0, 10),
      horas: d.horas * d.num_personas,
      cuadrilla_descripcion: d.cuadrilla_descripcion,
      num_personas: d.num_personas,
      tarifa_aplicada: tarifa,
      observaciones: d.observaciones,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/proyectos/${d.proyecto_id}/pnl`);
  return { ok: true, error: null };
}
