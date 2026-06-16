"use server";

import { headers } from "next/headers";

import {
  ETIQUETA_NATURALEZA,
  ETIQUETA_TIPO_AJUSTE,
  type TipoAjusteGerencial,
  type NaturalezaAjuste,
} from "@/lib/ajustes-gerenciales/state";
import { createClient } from "@/lib/supabase/server";

async function exigirPermiso(): Promise<{ userId: string; userEmail: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: puede } = await (supabase as any).rpc(
    "usuario_puede_ver_ajustes_gerenciales",
  );
  if (!puede) throw new Error("Sin permisos");
  return { userId: user.id, userEmail: user.email ?? "" };
}

async function registrarAuditoriaInterna(
  accion: string,
  ajusteId: string | null,
  detalles?: Record<string, unknown>,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const h = headers();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("ajustes_gerenciales_audit").insert({
    usuario_id: user.id,
    accion,
    ajuste_id: ajusteId,
    detalles: detalles ?? null,
    ip_address: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? null,
    user_agent: h.get("user-agent") ?? null,
  });
}

/** Registra que el usuario abrió la vista dual (server-only). */
export async function registrarVisualizacionDual(
  empresaId?: string,
): Promise<void> {
  await exigirPermiso();
  await registrarAuditoriaInterna("visualizacion_dual", null, {
    empresa_id: empresaId ?? "todas",
  });
}

/** Genera buffer Excel con marca INTERNO. */
export async function exportarVistaRealExcel(
  empresaId?: string,
): Promise<{ ok: true; buffer: ArrayBuffer; filename: string } | { ok: false; error: string }> {
  try {
    const { userEmail } = await exigirPermiso();
    const supabase = createClient();

    await registrarAuditoriaInterna("exportar_excel", null, {
      empresa_id: empresaId ?? "todas",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from("v_ajustes_gerenciales_enriquecido")
      .select("*")
      .eq("estado", "vigente")
      .order("naturaleza")
      .order("tipo");
    if (empresaId) q = q.eq("empresa_id", empresaId);
    const { data: ajustes } = (await q) as unknown as {
      data: Array<{
        codigo: string;
        empresa_codigo: string;
        tipo: string;
        naturaleza: string;
        descripcion: string;
        valor: number;
        valor_en_libros: number;
        fecha_adquisicion: string;
        justificacion: string;
        registrado_por_email: string | null;
      }> | null;
    };
    const filas = ajustes ?? [];

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "GECIAE ERP - INTERNO";
    wb.created = new Date();

    // Hoja Resumen
    const wsRes = wb.addWorksheet("Resumen");
    wsRes.mergeCells("A1:E1");
    const titulo = wsRes.getCell("A1");
    titulo.value =
      "AJUSTES GERENCIALES — INFORMACIÓN INTERNA — NO COMPARTIR EXTERNAMENTE";
    titulo.font = { name: "Arial", bold: true, size: 12, color: { argb: "FFFF0000" } };
    titulo.alignment = { horizontal: "center", vertical: "middle" };
    titulo.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFE699" },
    };
    wsRes.getRow(1).height = 30;

    wsRes.getCell("A2").value = `Generado: ${new Date().toLocaleString("es-MX")}`;
    wsRes.getCell("A2").font = { name: "Arial", size: 10, italic: true };
    wsRes.getCell("A3").value = `Por: ${userEmail}`;
    wsRes.getCell("A3").font = { name: "Arial", size: 10, italic: true };

    // Totales por naturaleza
    const totales = filas.reduce<
      Record<string, { num: number; total: number; libros: number }>
    >((acc, f) => {
      const k = f.naturaleza;
      if (!acc[k]) acc[k] = { num: 0, total: 0, libros: 0 };
      acc[k].num += 1;
      acc[k].total += Number(f.valor ?? 0);
      acc[k].libros += Number(f.valor_en_libros ?? f.valor ?? 0);
      return acc;
    }, {});

    const headerRow = wsRes.getRow(5);
    headerRow.values = [
      "Naturaleza",
      "Núm. ajustes",
      "Valor original",
      "Valor en libros",
    ];
    headerRow.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A2E" },
    };
    headerRow.alignment = { horizontal: "center" };

    let row = 6;
    for (const naturaleza of ["activo", "pasivo", "capital"] as NaturalezaAjuste[]) {
      const t = totales[naturaleza];
      if (!t) continue;
      wsRes.getRow(row).values = [
        ETIQUETA_NATURALEZA[naturaleza],
        t.num,
        t.total,
        t.libros,
      ];
      wsRes.getCell(row, 3).numFmt = '"$"#,##0.00';
      wsRes.getCell(row, 4).numFmt = '"$"#,##0.00';
      row++;
    }
    wsRes.columns = [
      { width: 28 },
      { width: 14 },
      { width: 18 },
      { width: 18 },
    ];

    // Hoja Detalle
    const wsDet = wb.addWorksheet("Detalle");
    wsDet.columns = [
      { header: "Código", key: "codigo", width: 15 },
      { header: "Empresa", key: "empresa_codigo", width: 10 },
      { header: "Naturaleza", key: "naturaleza", width: 12 },
      { header: "Tipo", key: "tipo_label", width: 36 },
      { header: "Descripción", key: "descripcion", width: 50 },
      { header: "Valor", key: "valor", width: 16 },
      { header: "En libros", key: "valor_en_libros", width: 16 },
      { header: "Fecha adq.", key: "fecha_adquisicion", width: 12 },
      { header: "Justificación", key: "justificacion", width: 60 },
      { header: "Registrado por", key: "registrado_por_email", width: 30 },
    ];
    for (const f of filas) {
      wsDet.addRow({
        codigo: f.codigo,
        empresa_codigo: f.empresa_codigo,
        naturaleza:
          ETIQUETA_NATURALEZA[f.naturaleza as NaturalezaAjuste] ?? f.naturaleza,
        tipo_label:
          ETIQUETA_TIPO_AJUSTE[f.tipo as TipoAjusteGerencial] ?? f.tipo,
        descripcion: f.descripcion,
        valor: Number(f.valor ?? 0),
        valor_en_libros: Number(f.valor_en_libros ?? f.valor ?? 0),
        fecha_adquisicion: f.fecha_adquisicion,
        justificacion: f.justificacion,
        registrado_por_email: f.registrado_por_email ?? "",
      });
    }
    wsDet.getColumn("valor").numFmt = '"$"#,##0.00';
    wsDet.getColumn("valor_en_libros").numFmt = '"$"#,##0.00';
    wsDet.getRow(1).font = {
      name: "Arial",
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    wsDet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A2E" },
    };

    // Footer
    const lastRow = wsDet.rowCount + 2;
    wsDet.mergeCells(`A${lastRow}:J${lastRow}`);
    const footer = wsDet.getCell(`A${lastRow}`);
    footer.value = `Generado ${new Date().toLocaleString("es-MX")} · Por ${userEmail} · INTERNO - NO COMPARTIR`;
    footer.font = {
      name: "Arial",
      italic: true,
      color: { argb: "FF888888" },
      size: 10,
    };

    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const filename = `vista-real-INTERNO-${new Date().toISOString().slice(0, 10)}.xlsx`;
    return { ok: true, buffer, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
