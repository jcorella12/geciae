import { NextResponse, type NextRequest } from "next/server";

import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import { csvResponse, toCsv } from "@/lib/helpers/csv";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-MX") : "";

/**
 * GET /api/reportes/csv?reporte={tipo}&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 *
 * Tipos soportados:
 *   cfdi · oc · proyectos · oportunidades · tickets · vehiculos
 */
export async function GET(request: NextRequest) {
  const reporte = request.nextUrl.searchParams.get("reporte") ?? "";
  const desde = request.nextUrl.searchParams.get("desde") ?? "";
  const hasta = request.nextUrl.searchParams.get("hasta") ?? "";

  const supabase = createClient();
  const v = await obtenerVinculos();
  const filtro = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: v.map((x) => x.empresa_id),
    puedeConsolidado: puedeVerConsolidado(v),
  });

  const ts = new Date().toISOString().slice(0, 10);

  if (reporte === "cfdi") {
    let q = supabase
      .from("cfdi")
      .select(
        "fecha_emision, serie, folio, uuid_sat, tipo, es_emitido, rfc_emisor, nombre_emisor, rfc_receptor, nombre_receptor, total, monto_pagado, saldo_pendiente, estado, metodo_pago, forma_pago, empresas(codigo)",
      )
      .in("empresa_id", filtro.empresasIds)
      .order("fecha_emision", { ascending: false })
      .limit(10000);
    if (desde) q = q.gte("fecha_emision", desde);
    if (hasta) q = q.lte("fecha_emision", hasta);
    const { data, error } = await q;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "empresa", label: "Empresa", format: (r: { empresas?: { codigo: string } | null }) => r.empresas?.codigo ?? "" },
      { key: "fecha_emision", label: "Fecha", format: (r) => fmtDate(r.fecha_emision as string) },
      { key: "tipo", label: "Tipo" },
      { key: "es_emitido", label: "Dirección", format: (r) => r.es_emitido ? "Emitido" : "Recibido" },
      { key: "serie", label: "Serie" },
      { key: "folio", label: "Folio" },
      { key: "uuid_sat", label: "UUID SAT" },
      { key: "rfc_emisor", label: "RFC emisor" },
      { key: "nombre_emisor", label: "Nombre emisor" },
      { key: "rfc_receptor", label: "RFC receptor" },
      { key: "nombre_receptor", label: "Nombre receptor" },
      { key: "total", label: "Total" },
      { key: "monto_pagado", label: "Pagado" },
      { key: "saldo_pendiente", label: "Saldo" },
      { key: "estado", label: "Estado" },
      { key: "metodo_pago", label: "Método pago" },
      { key: "forma_pago", label: "Forma pago" },
    ]);
    return csvResponse(csv, `cfdi-${ts}.csv`);
  }

  if (reporte === "oc") {
    let q = supabase
      .from("ordenes_compra")
      .select(
        "numero, fecha_emision, total, estado, comentarios, empresas(codigo), proveedores(razon_social, rfc)",
      )
      .in("empresa_id", filtro.empresasIds)
      .order("fecha_emision", { ascending: false })
      .limit(10000);
    if (desde) q = q.gte("fecha_emision", desde);
    if (hasta) q = q.lte("fecha_emision", hasta);
    const { data, error } = await q;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "empresa", label: "Empresa", format: (r: { empresas?: { codigo: string } | null }) => r.empresas?.codigo ?? "" },
      { key: "numero", label: "Número OC" },
      { key: "fecha_emision", label: "Fecha", format: (r) => fmtDate(r.fecha_emision as string) },
      {
        key: "proveedor",
        label: "Proveedor",
        format: (r: { proveedores?: { razon_social: string } | null }) => r.proveedores?.razon_social ?? "",
      },
      {
        key: "rfc",
        label: "RFC proveedor",
        format: (r: { proveedores?: { rfc: string } | null }) => r.proveedores?.rfc ?? "",
      },
      { key: "total", label: "Total" },
      { key: "estado", label: "Estado" },
      { key: "comentarios", label: "Comentarios" },
    ]);
    return csvResponse(csv, `oc-${ts}.csv`);
  }

  if (reporte === "proyectos") {
    const { data, error } = await supabase
      .from("proyectos")
      .select(
        "codigo, nombre, tipo, estado, fecha_inicio_planeado, fecha_fin_planeado, monto_contratado, monto_facturado, monto_cobrado, presupuesto_costo, costo_real, semaforo, empresas(codigo), clientes(razon_social)",
      )
      .in("empresa_id", filtro.empresasIds)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "empresa", label: "Empresa", format: (r: { empresas?: { codigo: string } | null }) => r.empresas?.codigo ?? "" },
      { key: "codigo", label: "Código" },
      { key: "nombre", label: "Proyecto" },
      { key: "tipo", label: "Tipo" },
      {
        key: "cliente",
        label: "Cliente",
        format: (r: { clientes?: { razon_social: string } | null }) => r.clientes?.razon_social ?? "",
      },
      { key: "estado", label: "Estado" },
      { key: "semaforo", label: "Semáforo" },
      { key: "fecha_inicio_planeado", label: "Inicio", format: (r) => fmtDate(r.fecha_inicio_planeado as string) },
      { key: "fecha_fin_planeado", label: "Fin", format: (r) => fmtDate(r.fecha_fin_planeado as string) },
      { key: "monto_contratado", label: "Contratado" },
      { key: "monto_facturado", label: "Facturado" },
      { key: "monto_cobrado", label: "Cobrado" },
      { key: "presupuesto_costo", label: "Presupuesto" },
      { key: "costo_real", label: "Costo real" },
    ]);
    return csvResponse(csv, `proyectos-${ts}.csv`);
  }

  if (reporte === "oportunidades") {
    const { data, error } = await supabase
      .from("oportunidades")
      .select(
        "nombre, estado, monto_estimado, probabilidad, fuente, fecha_proxima_accion, proxima_accion, fecha_cierre_estimada, fecha_cierre_real, motivo_perdida, created_at, empresas(codigo), clientes(razon_social)",
      )
      .in("empresa_id", filtro.empresasIds)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "empresa", label: "Empresa", format: (r: { empresas?: { codigo: string } | null }) => r.empresas?.codigo ?? "" },
      { key: "nombre", label: "Oportunidad" },
      {
        key: "cliente",
        label: "Cliente",
        format: (r: { clientes?: { razon_social: string } | null }) => r.clientes?.razon_social ?? "",
      },
      { key: "estado", label: "Etapa" },
      { key: "monto_estimado", label: "Monto" },
      { key: "probabilidad", label: "Probabilidad" },
      { key: "fuente", label: "Fuente" },
      { key: "fecha_proxima_accion", label: "Próxima acción", format: (r) => fmtDate(r.fecha_proxima_accion as string) },
      { key: "proxima_accion", label: "Acción" },
      { key: "fecha_cierre_estimada", label: "Cierre estimado", format: (r) => fmtDate(r.fecha_cierre_estimada as string) },
      { key: "fecha_cierre_real", label: "Cierre real", format: (r) => fmtDate(r.fecha_cierre_real as string) },
      { key: "motivo_perdida", label: "Motivo pérdida" },
      { key: "created_at", label: "Creada", format: (r) => fmtDate(r.created_at as string) },
    ]);
    return csvResponse(csv, `oportunidades-${ts}.csv`);
  }

  if (reporte === "tickets") {
    const { data, error } = await supabase
      .from("tickets_soporte")
      .select(
        "numero, asunto, prioridad, estado, origen, sla_horas, fecha_resolucion, created_at, empresas(codigo), clientes(razon_social), proyectos(codigo, nombre)",
      )
      .in("empresa_id", filtro.empresasIds)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "empresa", label: "Empresa", format: (r: { empresas?: { codigo: string } | null }) => r.empresas?.codigo ?? "" },
      { key: "numero", label: "Número" },
      { key: "asunto", label: "Asunto" },
      {
        key: "cliente",
        label: "Cliente",
        format: (r: { clientes?: { razon_social: string } | null }) => r.clientes?.razon_social ?? "",
      },
      {
        key: "proyecto",
        label: "Proyecto",
        format: (r: { proyectos?: { codigo: string; nombre: string } | null }) =>
          r.proyectos ? `${r.proyectos.codigo} ${r.proyectos.nombre}` : "",
      },
      { key: "prioridad", label: "Prioridad" },
      { key: "estado", label: "Estado" },
      { key: "origen", label: "Origen" },
      { key: "sla_horas", label: "SLA hrs" },
      { key: "created_at", label: "Creado", format: (r) => fmtDate(r.created_at as string) },
      { key: "fecha_resolucion", label: "Resuelto", format: (r) => fmtDate(r.fecha_resolucion as string) },
    ]);
    return csvResponse(csv, `tickets-${ts}.csv`);
  }

  if (reporte === "inventario") {
    const { data, error } = await supabase
      .from("v_inventario_stock")
      .select(
        "sku, nombre, categoria, marca, modelo, unidad_medida, stock_actual, costo_promedio, costo_ultimo, valor_mercado, valor_costo, valor_mercado_total, ultimo_movimiento_fecha, estado_stock, empresa_id",
      )
      .in("empresa_id", filtro.empresasIds)
      .limit(5000);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "sku", label: "SKU" },
      { key: "nombre", label: "Producto" },
      { key: "categoria", label: "Categoría" },
      { key: "marca", label: "Marca" },
      { key: "modelo", label: "Modelo" },
      { key: "unidad_medida", label: "Unidad" },
      { key: "stock_actual", label: "Stock actual" },
      { key: "costo_promedio", label: "Costo promedio" },
      { key: "costo_ultimo", label: "Costo último" },
      { key: "valor_mercado", label: "Valor mercado unitario" },
      { key: "valor_costo", label: "Valor total a costo" },
      { key: "valor_mercado_total", label: "Valor total a mercado" },
      { key: "estado_stock", label: "Estado stock" },
      { key: "ultimo_movimiento_fecha", label: "Último movimiento", format: (r) => fmtDate(r.ultimo_movimiento_fecha as string) },
    ]);
    return csvResponse(csv, `inventario-${ts}.csv`);
  }

  if (reporte === "vehiculos") {
    const { data, error } = await supabase
      .from("v_vehiculos_lista")
      .select(
        "placa, numero_economico, marca, modelo, anio, tipo, tipo_propiedad, estatus, km_actual, gasto_12m, combustible_12m, fecha_vencimiento_seguro, empresa_id",
      )
      .in("empresa_id", filtro.empresasIds)
      .limit(5000);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const csv = toCsv(data ?? [], [
      { key: "placa", label: "Placa" },
      { key: "numero_economico", label: "Núm económico" },
      { key: "marca", label: "Marca" },
      { key: "modelo", label: "Modelo" },
      { key: "anio", label: "Año" },
      { key: "tipo", label: "Tipo" },
      { key: "tipo_propiedad", label: "Propiedad" },
      { key: "estatus", label: "Estatus" },
      { key: "km_actual", label: "Km actual" },
      { key: "gasto_12m", label: "Gasto 12m" },
      { key: "combustible_12m", label: "Combustible 12m" },
      { key: "fecha_vencimiento_seguro", label: "Vence seguro", format: (r) => fmtDate(r.fecha_vencimiento_seguro as string) },
    ]);
    return csvResponse(csv, `vehiculos-${ts}.csv`);
  }

  return NextResponse.json(
    { error: "Tipo de reporte inválido. Tipos: cfdi, oc, proyectos, oportunidades, tickets, vehiculos" },
    { status: 400 },
  );
}
