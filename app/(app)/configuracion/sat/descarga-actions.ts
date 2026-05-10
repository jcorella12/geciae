"use server";

/**
 * Sprint 8.2 — Server actions para orquestar descargas SAT.
 *
 * Flujo:
 *   1. crearSolicitud      borrador → solicitada
 *   2. verificarSolicitud  solicitada → lista_descargar (cuando SAT termine)
 *   3. descargarYProcesar  lista_descargar → completada
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { interpretarErrorSat } from "@/lib/sat/errores";
import type { DescargaSat } from "@/lib/sat/state";
import { createClient } from "@/lib/supabase/server";

async function exigirPermiso(): Promise<{ userId: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puede } = await (supabase as any).rpc(
    "usuario_puede_gestionar_sat",
  );
  if (!puede) throw new Error("Sin permisos");
  return { userId: user.id };
}

const CrearDescargaSchema = z.object({
  empresa_id: z.string().uuid(),
  tipo_descarga: z.enum(["emitidos", "recibidos"]),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ResultadoCrear =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function crearSolicitud(formData: FormData): Promise<ResultadoCrear> {
  try {
    const { userId } = await exigirPermiso();
    const supabase = createClient();

    const datos = CrearDescargaSchema.parse({
      empresa_id: formData.get("empresa_id"),
      tipo_descarga: formData.get("tipo_descarga"),
      fecha_inicio: formData.get("fecha_inicio"),
      fecha_fin: formData.get("fecha_fin"),
    });

    // Período <= 12 meses
    const inicio = new Date(datos.fecha_inicio);
    const fin = new Date(datos.fecha_fin);
    if (fin < inicio) {
      return { ok: false, error: "Fecha fin debe ser posterior a fecha inicio" };
    }
    const diffMeses =
      (fin.getFullYear() - inicio.getFullYear()) * 12 +
      (fin.getMonth() - inicio.getMonth());
    if (diffMeses > 12) {
      return { ok: false, error: "Período máximo permitido por SAT: 12 meses" };
    }

    // Crear registro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: descarga, error: insErr } = (await (supabase as any)
      .from("sat_descargas")
      .insert({
        empresa_id: datos.empresa_id,
        tipo_descarga: datos.tipo_descarga,
        fecha_inicio: datos.fecha_inicio,
        fecha_fin: datos.fecha_fin,
        estado: "borrador",
        iniciada_por: userId,
      })
      .select("id")
      .single()) as unknown as {
      data: { id: string } | null;
      error: { message: string } | null;
    };

    if (insErr || !descarga) {
      return {
        ok: false,
        error: insErr?.message ?? "Error creando descarga",
      };
    }

    // Llamar al SAT
    try {
      const { presentarSolicitud } = await import("@/lib/sat/engine");
      const requestId = await presentarSolicitud({
        empresaId: datos.empresa_id,
        tipoDescarga: datos.tipo_descarga,
        fechaInicio: datos.fecha_inicio,
        fechaFin: datos.fecha_fin,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sat_descargas")
        .update({ sat_request_id: requestId, estado: "solicitada" })
        .eq("id", descarga.id);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error desconocido";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sat_descargas")
        .update({
          estado: "error",
          error_mensaje: interpretarErrorSat(mensaje),
          error_detalles: { etapa: "solicitar" },
        })
        .eq("id", descarga.id);
      return { ok: false, error: interpretarErrorSat(mensaje) };
    }

    revalidatePath("/configuracion/sat");
    revalidatePath(`/configuracion/sat/descargas/${descarga.id}`);
    return { ok: true, id: descarga.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

export async function verificarSolicitud(
  descargaId: string,
  opts: { autoProcesarSiListo?: boolean } = { autoProcesarSiListo: true },
): Promise<{
  ok: boolean;
  listo?: boolean;
  mensaje?: string;
  error?: string;
  /** Si se procesó automáticamente, métricas finales */
  procesado?: { importados: number; duplicados: number; errores: number };
}> {
  try {
    await exigirPermiso();
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: desc } = (await (supabase as any)
      .from("sat_descargas")
      .select("*")
      .eq("id", descargaId)
      .maybeSingle()) as unknown as { data: DescargaSat | null };

    if (!desc) return { ok: false, error: "Descarga no encontrada" };
    if (!desc.sat_request_id) {
      return { ok: false, error: "Descarga sin request_id; no se puede verificar" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("sat_descargas")
      .update({
        estado: "verificando",
        intentos_verificacion: (desc.intentos_verificacion ?? 0) + 1,
        ultima_verificacion_at: new Date().toISOString(),
      })
      .eq("id", descargaId);

    try {
      const { verificarEstadoSolicitud } = await import("@/lib/sat/engine");
      const verif = await verificarEstadoSolicitud({
        empresaId: desc.empresa_id,
        requestId: desc.sat_request_id,
      });

      const nuevoEstado = verif.listo ? "lista_descargar" : "solicitada";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sat_descargas")
        .update({
          estado: nuevoEstado,
          sat_package_ids: verif.listo ? verif.packageIds : null,
          numero_cfdis_estimados: verif.numeroCfdis,
        })
        .eq("id", descargaId);

      // Auto-procesar si está listo (UX mejorada: un solo click hace todo)
      if (verif.listo && (opts.autoProcesarSiListo ?? true)) {
        const proc = await descargarYProcesar(descargaId);
        revalidatePath("/configuracion/sat");
        revalidatePath(`/configuracion/sat/descargas/${descargaId}`);
        revalidatePath("/finanzas/cfdi");
        return {
          ok: true,
          listo: true,
          mensaje: verif.mensajeEstado,
          procesado: proc.ok
            ? {
                importados: proc.importados ?? 0,
                duplicados: proc.duplicados ?? 0,
                errores: proc.errores ?? 0,
              }
            : undefined,
          ...(proc.ok ? {} : { error: proc.error }),
        };
      }

      revalidatePath("/configuracion/sat");
      revalidatePath(`/configuracion/sat/descargas/${descargaId}`);

      return { ok: true, listo: verif.listo, mensaje: verif.mensajeEstado };
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error desconocido";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sat_descargas")
        .update({
          estado: "error",
          error_mensaje: interpretarErrorSat(mensaje),
          error_detalles: { etapa: "verificar" },
        })
        .eq("id", descargaId);
      return { ok: false, error: interpretarErrorSat(mensaje) };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

/**
 * Verifica + auto-descarga TODAS las descargas pendientes (solicitada,
 * verificando o lista_descargar) en una sola operación. Resiliente: si
 * una falla, continúa con las demás.
 */
export async function verificarPendientesEnBloque(): Promise<{
  ok: boolean;
  resumen: Array<{
    descarga_id: string;
    empresa_codigo: string;
    tipo: "emitidos" | "recibidos";
    estado_anterior: string;
    estado_final?: string;
    listo: boolean;
    procesado?: { importados: number; duplicados: number; errores: number };
    error?: string;
  }>;
}> {
  try {
    await exigirPermiso();
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pendientes } = (await (supabase as any)
      .from("sat_descargas")
      .select("id, empresa_id, tipo_descarga, estado, empresas(codigo)")
      .in("estado", ["solicitada", "verificando", "lista_descargar"])
      .order("created_at", { ascending: true })) as unknown as {
      data:
        | Array<{
            id: string;
            empresa_id: string;
            tipo_descarga: "emitidos" | "recibidos";
            estado: string;
            empresas: { codigo: string } | null;
          }>
        | null;
    };

    const lista = pendientes ?? [];
    const resumen: Array<{
      descarga_id: string;
      empresa_codigo: string;
      tipo: "emitidos" | "recibidos";
      estado_anterior: string;
      estado_final?: string;
      listo: boolean;
      procesado?: { importados: number; duplicados: number; errores: number };
      error?: string;
    }> = [];

    for (const d of lista) {
      const empresaCodigo = d.empresas?.codigo ?? "?";

      // Si ya estaba lista, solo procesar
      if (d.estado === "lista_descargar") {
        const proc = await descargarYProcesar(d.id);
        resumen.push({
          descarga_id: d.id,
          empresa_codigo: empresaCodigo,
          tipo: d.tipo_descarga,
          estado_anterior: d.estado,
          estado_final: proc.ok ? "completada" : "error",
          listo: true,
          procesado: proc.ok
            ? {
                importados: proc.importados ?? 0,
                duplicados: proc.duplicados ?? 0,
                errores: proc.errores ?? 0,
              }
            : undefined,
          error: proc.ok ? undefined : proc.error,
        });
        continue;
      }

      // Si está solicitada/verificando, verificar (con auto-procesar)
      const r = await verificarSolicitud(d.id, { autoProcesarSiListo: true });
      resumen.push({
        descarga_id: d.id,
        empresa_codigo: empresaCodigo,
        tipo: d.tipo_descarga,
        estado_anterior: d.estado,
        estado_final: r.procesado
          ? "completada"
          : r.listo
            ? "lista_descargar"
            : d.estado,
        listo: r.listo ?? false,
        procesado: r.procesado,
        error: r.ok ? undefined : r.error,
      });
    }

    revalidatePath("/configuracion/sat");
    revalidatePath("/finanzas/cfdi");

    return { ok: true, resumen };
  } catch {
    return {
      ok: false,
      resumen: [],
    };
  }
}

export async function descargarYProcesar(descargaId: string): Promise<{
  ok: boolean;
  importados?: number;
  duplicados?: number;
  errores?: number;
  error?: string;
}> {
  try {
    await exigirPermiso();
    const supabase = createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: desc } = (await (supabase as any)
      .from("sat_descargas")
      .select("*")
      .eq("id", descargaId)
      .maybeSingle()) as unknown as { data: DescargaSat | null };

    if (!desc) return { ok: false, error: "Descarga no encontrada" };
    if (desc.estado !== "lista_descargar") {
      return {
        ok: false,
        error: `Estado inválido: ${desc.estado}. Debe ser 'lista_descargar'.`,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("sat_descargas")
      .update({ estado: "descargando" })
      .eq("id", descargaId);

    let totalImportados = 0;
    let totalDuplicados = 0;
    let totalErrores = 0;
    const paquetesPaths: string[] = [];

    try {
      const { descargarPaquete } = await import("@/lib/sat/engine");
      const { extraerXmlsDePaquete } = await import("@/lib/sat/parser");
      const { importarXmlACfdi } = await import("@/lib/sat/importer");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: empresa } = (await (supabase as any)
        .from("empresas")
        .select("rfc")
        .eq("id", desc.empresa_id)
        .maybeSingle()) as unknown as { data: { rfc: string } | null };
      const rfcEmpresa = empresa?.rfc ?? "";

      for (const packageId of desc.sat_package_ids ?? []) {
        const zipBuffer = await descargarPaquete({
          empresaId: desc.empresa_id,
          packageId,
        });

        const paqPath = `${desc.empresa_id}/${descargaId}/${packageId}.zip`;
        await supabase.storage
          .from("sat-paquetes")
          .upload(paqPath, zipBuffer, {
            contentType: "application/zip",
            upsert: true,
          });
        paquetesPaths.push(paqPath);

        const xmls = await extraerXmlsDePaquete(zipBuffer);
        for (const xml of xmls) {
          const result = await importarXmlACfdi({
            xmlContent: xml.content,
            empresaId: desc.empresa_id,
            rfcEmpresa,
            origen: "sat_descarga",
          });
          if (result.estado === "importado") totalImportados++;
          else if (result.estado === "duplicado") totalDuplicados++;
          else totalErrores++;
        }
      }

      const completadaAt = new Date().toISOString();
      const duracion = Math.round(
        (new Date(completadaAt).getTime() -
          new Date(desc.iniciada_at).getTime()) /
          1000,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sat_descargas")
        .update({
          estado: "completada",
          cfdis_importados: totalImportados,
          cfdis_duplicados: totalDuplicados,
          cfdis_con_error: totalErrores,
          cfdis_descargados: totalImportados + totalDuplicados + totalErrores,
          paquetes_storage_paths: paquetesPaths,
          completada_at: completadaAt,
          duracion_segundos: duracion,
        })
        .eq("id", descargaId);

      revalidatePath("/configuracion/sat");
      revalidatePath(`/configuracion/sat/descargas/${descargaId}`);
      revalidatePath("/finanzas/cfdi");

      return {
        ok: true,
        importados: totalImportados,
        duplicados: totalDuplicados,
        errores: totalErrores,
      };
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error desconocido";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("sat_descargas")
        .update({
          estado: "error",
          error_mensaje: interpretarErrorSat(mensaje),
          error_detalles: { etapa: "descargar_procesar" },
          paquetes_storage_paths: paquetesPaths,
        })
        .eq("id", descargaId);
      return { ok: false, error: interpretarErrorSat(mensaje) };
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }
}

export async function listarDescargas(): Promise<DescargaSat[]> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("sat_descargas")
    .select("*, empresas(codigo, nombre_comercial)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as DescargaSat[];
}

export async function obtenerDescarga(id: string): Promise<DescargaSat | null> {
  await exigirPermiso();
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("sat_descargas")
    .select("*, empresas(codigo, nombre_comercial)")
    .eq("id", id)
    .maybeSingle();
  return data as DescargaSat | null;
}

export type ResumenBulkItem = {
  empresa_codigo: string;
  empresa_id: string;
  tipo: "emitidos" | "recibidos";
  ok: boolean;
  descarga_id?: string;
  error?: string;
};

/**
 * Crea solicitudes en bloque (Emitidos + Recibidos) para el mes en curso
 * (1° del mes → hoy) para TODAS las empresas con FIEL activa vigente.
 *
 * Cada empresa genera 2 solicitudes (emitidos + recibidos). No aborta si
 * una falla — continúa con las demás y retorna el resumen completo.
 */
export async function descargarMesActualTodasEmpresas(): Promise<{
  ok: boolean;
  resumen: ResumenBulkItem[];
}> {
  try {
    const { userId } = await exigirPermiso();
    const supabase = createClient();

    // Período: 1° del mes actual → hoy
    const ahora = new Date();
    const inicio = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1),
    );
    const fechaInicio = inicio.toISOString().slice(0, 10);
    const fechaFin = ahora.toISOString().slice(0, 10);

    // FIELs activas vigentes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fiels } = (await (supabase as any)
      .from("v_sat_credenciales_enriquecido")
      .select("empresa_id, empresa_codigo, estatus_vigencia, estado")
      .eq("estado", "activa")) as unknown as {
      data:
        | Array<{
            empresa_id: string;
            empresa_codigo: string;
            estatus_vigencia: string;
            estado: string;
          }>
        | null;
    };

    const empresas = (fiels ?? []).filter(
      (f) => f.estatus_vigencia !== "vencida",
    );

    if (empresas.length === 0) {
      return { ok: false, resumen: [] };
    }

    const { presentarSolicitud } = await import("@/lib/sat/engine");

    const resumen: ResumenBulkItem[] = [];

    for (const emp of empresas) {
      for (const tipo of ["emitidos", "recibidos"] as const) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: descarga, error: insErr } = (await (supabase as any)
          .from("sat_descargas")
          .insert({
            empresa_id: emp.empresa_id,
            tipo_descarga: tipo,
            fecha_inicio: fechaInicio,
            fecha_fin: fechaFin,
            estado: "borrador",
            iniciada_por: userId,
          })
          .select("id")
          .single()) as unknown as {
          data: { id: string } | null;
          error: { message: string } | null;
        };

        if (insErr || !descarga) {
          resumen.push({
            empresa_codigo: emp.empresa_codigo,
            empresa_id: emp.empresa_id,
            tipo,
            ok: false,
            error: insErr?.message ?? "Error creando descarga",
          });
          continue;
        }

        try {
          const requestId = await presentarSolicitud({
            empresaId: emp.empresa_id,
            tipoDescarga: tipo,
            fechaInicio,
            fechaFin,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("sat_descargas")
            .update({ sat_request_id: requestId, estado: "solicitada" })
            .eq("id", descarga.id);

          resumen.push({
            empresa_codigo: emp.empresa_codigo,
            empresa_id: emp.empresa_id,
            tipo,
            ok: true,
            descarga_id: descarga.id,
          });
        } catch (e) {
          const mensaje =
            e instanceof Error ? e.message : "Error desconocido";
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from("sat_descargas")
            .update({
              estado: "error",
              error_mensaje: interpretarErrorSat(mensaje),
              error_detalles: { etapa: "solicitar", bulk: true },
            })
            .eq("id", descarga.id);

          resumen.push({
            empresa_codigo: emp.empresa_codigo,
            empresa_id: emp.empresa_id,
            tipo,
            ok: false,
            descarga_id: descarga.id,
            error: interpretarErrorSat(mensaje),
          });
        }
      }
    }

    revalidatePath("/configuracion/sat");
    revalidatePath("/finanzas/cfdi");

    const totalOk = resumen.filter((r) => r.ok).length;
    return { ok: totalOk > 0, resumen };
  } catch {
    return { ok: false, resumen: [] };
  }
}

export async function cancelarDescarga(
  descargaId: string,
  motivo: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await exigirPermiso();
    if (!motivo || motivo.length < 10) {
      return { ok: false, error: "Motivo obligatorio (mín 10 caracteres)" };
    }
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("sat_descargas")
      .update({
        estado: "error",
        error_mensaje: `Cancelada por usuario: ${motivo}`,
      })
      .eq("id", descargaId)
      .in("estado", ["borrador", "solicitada", "verificando"]);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/configuracion/sat");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
