import ExcelJS from "exceljs";

type ColumnaExport = {
  header: string;
  key: string;
  width?: number;
  format?: "moneda" | "fecha" | "porcentaje";
};

type HojaExport = {
  nombre: string;
  columnas: ColumnaExport[];
  datos: Array<Record<string, unknown>>;
};

export type ExportarExcelOpciones = {
  nombre: string;
  hojas: HojaExport[];
};

export async function exportarExcel(
  opciones: ExportarExcelOpciones,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "GECIAE ERP";
  wb.created = new Date();

  for (const hoja of opciones.hojas) {
    const ws = wb.addWorksheet(hoja.nombre);
    ws.columns = hoja.columnas.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 15,
    }));
    ws.addRows(hoja.datos);

    // Header style
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };

    // Formatos por columna
    hoja.columnas.forEach((col, idx) => {
      const colRef = ws.getColumn(idx + 1);
      if (col.format === "moneda") {
        colRef.numFmt = '"$"#,##0.00';
      } else if (col.format === "fecha") {
        colRef.numFmt = "yyyy-mm-dd";
      } else if (col.format === "porcentaje") {
        colRef.numFmt = "0.00%";
      }
    });

    ws.views = [{ state: "frozen", ySplit: 1 }];
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
