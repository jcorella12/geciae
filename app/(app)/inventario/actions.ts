"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  initialItemState,
  initialMovimientoState,
  type ItemState,
  type MovimientoState,
} from "@/lib/inventario/state";
import { createClient } from "@/lib/supabase/server";

async function gateEmpresa(
  empresaId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (esCEO(v) || esRolEn(v, empresaId, ["director", "operativo"])) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "Sin permiso (requiere CEO, director u operativo).",
  };
}

// ============================================================================
// ITEMS (catalogo_productos extendido)
// ============================================================================

export async function crearItemInventario(
  _prev: ItemState,
  formData: FormData,
): Promise<ItemState> {
  const empresaId = formData.get("empresa_id") as string;
  const codigo = ((formData.get("codigo") as string) || "").trim().toUpperCase();
  const nombre = ((formData.get("nombre") as string) || "").trim();
  const descripcion = (formData.get("descripcion") as string) || null;
  const categoria = (formData.get("categoria") as string) || "otro";
  const subcategoria = (formData.get("subcategoria") as string) || null;
  const marca = (formData.get("marca") as string) || null;
  const modelo = (formData.get("modelo") as string) || null;
  const unidad_medida = (formData.get("unidad_medida") as string) || "pieza";
  const stock_minimo = parseFloat(
    (formData.get("stock_minimo") as string) || "0",
  );
  const stock_maximo = formData.get("stock_maximo")
    ? parseFloat(formData.get("stock_maximo") as string)
    : null;
  const valor_mercado = formData.get("valor_mercado")
    ? parseFloat(formData.get("valor_mercado") as string)
    : null;
  const fuente_valor = (formData.get("fuente_valor") as string) || null;
  const proveedor_preferido_id =
    (formData.get("proveedor_preferido_id") as string) || null;
  const observaciones = (formData.get("observaciones") as string) || null;

  if (!empresaId)
    return { ...initialItemState, error: "Empresa requerida" };
  if (codigo.length < 2)
    return { ...initialItemState, error: "Código (SKU) requerido" };
  if (nombre.length < 2)
    return { ...initialItemState, error: "Nombre requerido" };

  const g = await gateEmpresa(empresaId);
  if (!g.ok) return { ...initialItemState, error: g.error };

  const supabase = createClient();
  const { data: nuevo, error } = await supabase
    .from("catalogo_productos")
    .insert({
      empresa_id: empresaId,
      codigo,
      nombre,
      descripcion,
      categoria,
      subcategoria,
      marca,
      modelo,
      unidad_medida,
      stock_minimo: Number.isFinite(stock_minimo) ? stock_minimo : 0,
      stock_maximo:
        stock_maximo != null && Number.isFinite(stock_maximo)
          ? stock_maximo
          : null,
      valor_mercado:
        valor_mercado != null && Number.isFinite(valor_mercado)
          ? valor_mercado
          : null,
      fecha_actualizacion_valor: valor_mercado
        ? new Date().toISOString().slice(0, 10)
        : null,
      fuente_valor,
      proveedor_preferido_id,
      observaciones,
      activo: true,
    })
    .select("id")
    .single();

  if (error || !nuevo) {
    return {
      ...initialItemState,
      error: error?.message?.includes("duplicate")
        ? "Ya existe un item con ese código (SKU)."
        : `Error al crear: ${error?.message ?? "desconocido"}`,
    };
  }

  revalidatePath("/inventario");
  redirect(`/inventario/${nuevo.id}`);
}

export async function actualizarValorMercado(
  itemId: string,
  empresaId: string,
  valor: number,
  fuente: string | null,
): Promise<MovimientoState> {
  const g = await gateEmpresa(empresaId);
  if (!g.ok) return { ...initialMovimientoState, error: g.error };

  const supabase = createClient();
  const { error } = await supabase
    .from("catalogo_productos")
    .update({
      valor_mercado: valor,
      fecha_actualizacion_valor: new Date().toISOString().slice(0, 10),
      fuente_valor: fuente,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) return { ...initialMovimientoState, error: error.message };

  revalidatePath(`/inventario/${itemId}`);
  return { ok: true, error: null };
}

// ============================================================================
// MOVIMIENTOS (kardex)
// ============================================================================

export async function registrarMovimiento(
  _prev: MovimientoState,
  formData: FormData,
): Promise<MovimientoState> {
  const empresaId = formData.get("empresa_id") as string;
  const productoId = formData.get("producto_id") as string;
  const almacenId = formData.get("almacen_id") as string;
  const tipo = formData.get("tipo") as string;
  const fecha =
    (formData.get("fecha") as string) ||
    new Date().toISOString().slice(0, 10);
  const cantidadStr = formData.get("cantidad") as string;
  const cantidad = parseFloat(cantidadStr);
  const costoUnitarioStr = formData.get("costo_unitario") as string;
  const costoUnitario = costoUnitarioStr ? parseFloat(costoUnitarioStr) : null;
  const proyectoId = (formData.get("proyecto_id") as string) || null;
  const ocId = (formData.get("oc_id") as string) || null;
  const proveedorId = (formData.get("proveedor_id") as string) || null;
  const numeroDocumento = (formData.get("numero_documento") as string) || null;
  const observaciones = (formData.get("observaciones") as string) || null;
  const almacenDestinoId =
    (formData.get("almacen_destino_id") as string) || null;

  if (!empresaId)
    return { ...initialMovimientoState, error: "Empresa requerida" };
  if (!productoId)
    return { ...initialMovimientoState, error: "Selecciona un producto" };
  if (!almacenId)
    return { ...initialMovimientoState, error: "Selecciona almacén" };
  if (!tipo)
    return { ...initialMovimientoState, error: "Tipo requerido" };
  if (!cantidad || cantidad <= 0)
    return { ...initialMovimientoState, error: "Cantidad debe ser positiva" };

  const g = await gateEmpresa(empresaId);
  if (!g.ok) return { ...initialMovimientoState, error: g.error };

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user)
    return { ...initialMovimientoState, error: "Sesión expirada" };
  const userMeta = usr.user.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const userNombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user.email ?? null;
  // Validar stock suficiente para salidas
  const esSalida = [
    "salida_obra",
    "salida_proyecto",
    "salida_venta",
    "salida_merma",
    "salida_ajuste",
    "traspaso_salida",
  ].includes(tipo);
  if (esSalida) {
    const { data: stockRow } = await supabase
      .from("v_inventario_stock_almacen")
      .select("stock")
      .eq("producto_id", productoId)
      .eq("almacen_id", almacenId)
      .maybeSingle();
    const stockAlmacen = Number(stockRow?.stock ?? 0);
    if (cantidad > stockAlmacen) {
      return {
        ...initialMovimientoState,
        error: `Stock insuficiente en almacén (${stockAlmacen} disponibles).`,
      };
    }
  }

  const { error } = await supabase.from("inventario_movimientos").insert({
    empresa_id: empresaId,
    producto_id: productoId,
    almacen_id: almacenId,
    tipo,
    fecha,
    cantidad,
    costo_unitario: costoUnitario,
    proyecto_id: proyectoId,
    oc_id: ocId,
    proveedor_id: proveedorId,
    almacen_destino_id: almacenDestinoId,
    numero_documento: numeroDocumento,
    motivo: observaciones,
    observaciones,
    capturado_por: usr.user.id,
    capturado_por_nombre: userNombre,
  });

  if (error) return { ...initialMovimientoState, error: error.message };

  // Si es traspaso_salida, crear automáticamente entrada en almacén destino
  if (tipo === "traspaso_salida" && almacenDestinoId) {
    await supabase.from("inventario_movimientos").insert({
      empresa_id: empresaId,
      producto_id: productoId,
      almacen_id: almacenDestinoId,
      tipo: "traspaso_entrada",
      fecha,
      cantidad,
      costo_unitario: costoUnitario,
      numero_documento: numeroDocumento,
      motivo: `Traspaso desde otro almacén · ${observaciones ?? ""}`,
      observaciones: `Traspaso desde otro almacén · ${observaciones ?? ""}`,
      capturado_por: usr.user.id,
      capturado_por_nombre: userNombre,
    });
  }

  revalidatePath("/inventario");
  revalidatePath(`/inventario/${productoId}`);
  if (proyectoId) revalidatePath(`/proyectos/${proyectoId}`);
  return { ok: true, error: null };
}
