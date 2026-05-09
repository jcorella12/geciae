"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
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

/**
 * Gate flexible para valor de mercado: cualquier vínculo válido del usuario
 * puede actualizar valor de mercado (no necesita rol específico).
 * Para productos del grupo (empresaId=null) basta con tener al menos un
 * vínculo activo.
 */
async function gateValorMercado(
  empresaId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const v = await obtenerVinculos();
  if (v.length === 0) {
    return { ok: false, error: "Sin vínculo activo." };
  }
  if (empresaId === null) return { ok: true };
  if (v.some((x) => x.empresa_id === empresaId)) return { ok: true };
  if (esCEO(v)) return { ok: true };
  return { ok: false, error: "Sin acceso a esa empresa." };
}

/**
 * Gate para ajustar cantidad de stock: solo CEO o usuarios con atributo
 * contralor. Es destructivo (cambia el stock real), por eso restringimos.
 */
async function gateAjusteCantidad(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const v = await obtenerVinculos();
  if (esCEO(v) || tieneAtributo(v, "contralor")) {
    return { ok: true };
  }
  return {
    ok: false,
    error: "Solo CEO o contralor pueden ajustar cantidad de stock.",
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

export type UnidadValorMercado = "mxn_unidad" | "usd_unidad" | "usd_watt";

/**
 * Actualiza el valor de mercado de un producto. Soporta 3 unidades de captura:
 *   mxn_unidad  → pesos por unidad (default)
 *   usd_unidad  → dólares por unidad (se convierte a MXN con TC del momento)
 *   usd_watt    → dólares por watt × capacidad del producto = USD/unidad → MXN
 *
 * Guarda el valor original (en su unidad de captura) + el TC del momento +
 * el equivalente MXN/unidad canónico para listings y totales.
 */
export async function actualizarValorMercado(
  itemId: string,
  empresaId: string | null,
  valor: number,
  fuente: string | null,
  unidad: UnidadValorMercado = "mxn_unidad",
): Promise<MovimientoState> {
  const g = await gateValorMercado(empresaId);
  if (!g.ok) return { ...initialMovimientoState, error: g.error };

  if (!Number.isFinite(valor) || valor <= 0) {
    return { ...initialMovimientoState, error: "Valor inválido" };
  }

  const supabase = createClient();

  // Si captura es USD, necesitamos TC actual para convertir a MXN canónico
  let tcActual: number | null = null;
  if (unidad === "usd_unidad" || unidad === "usd_watt") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tcData } = await (supabase as any).rpc(
      "tipo_cambio_actual",
      { p_par: "USD/MXN" },
    );
    tcActual = tcData ? Number(tcData) : null;
    if (!tcActual || tcActual <= 0) {
      return {
        ...initialMovimientoState,
        error:
          "No hay tipo de cambio USD/MXN disponible. Sincroniza Banxico primero.",
      };
    }
  }

  // Si captura es USD/watt, necesitamos capacidad del producto
  let capacidadW: number | null = null;
  if (unidad === "usd_watt") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prod } = await (supabase as any)
      .from("catalogo_productos")
      .select("capacidad, unidad_capacidad")
      .eq("id", itemId)
      .maybeSingle();
    if (!prod || !prod.capacidad) {
      return {
        ...initialMovimientoState,
        error:
          "El producto no tiene capacidad registrada (W o kW). Captura primero la capacidad para usar USD/watt.",
      };
    }
    const cap = Number(prod.capacidad);
    capacidadW =
      prod.unidad_capacidad === "kW" ? cap * 1000 : cap; // default W
  }

  // Calcular el valor MXN/unidad canónico
  let valorMxnUnidad: number;
  let valorUsdUnidad: number | null = null;
  let valorUsdWatt: number | null = null;

  if (unidad === "mxn_unidad") {
    valorMxnUnidad = valor;
  } else if (unidad === "usd_unidad") {
    valorUsdUnidad = valor;
    valorMxnUnidad = valor * (tcActual as number);
  } else {
    // usd_watt
    valorUsdWatt = valor;
    valorUsdUnidad = valor * (capacidadW as number);
    valorMxnUnidad = valorUsdUnidad * (tcActual as number);
  }

  const update: Record<string, unknown> = {
    valor_mercado: Math.round(valorMxnUnidad * 100) / 100,
    valor_mercado_unidad: unidad,
    valor_mercado_usd: valorUsdUnidad,
    valor_mercado_usd_watt: valorUsdWatt,
    valor_mercado_tc: tcActual,
    fecha_actualizacion_valor: new Date().toISOString().slice(0, 10),
    fuente_valor: fuente,
    updated_at: new Date().toISOString(),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("catalogo_productos")
    .update(update)
    .eq("id", itemId);

  if (error) return { ...initialMovimientoState, error: error.message };

  revalidatePath(`/inventario/${itemId}`);
  return { ok: true, error: null };
}

/**
 * Ajusta la cantidad de stock de un producto en un almacén específico.
 * Crea un movimiento entrada_ajuste o salida_ajuste por la diferencia,
 * preservando audit trail. Solo CEO + contralor.
 */
export async function ajustarCantidadStock(input: {
  productoId: string;
  almacenId: string;
  cantidadActual: number;
  cantidadNueva: number;
  motivo: string;
}): Promise<MovimientoState> {
  const g = await gateAjusteCantidad();
  if (!g.ok) return { ...initialMovimientoState, error: g.error };

  if (!input.motivo || input.motivo.trim().length < 10) {
    return {
      ...initialMovimientoState,
      error: "El motivo del ajuste debe tener al menos 10 caracteres.",
    };
  }
  if (!Number.isFinite(input.cantidadNueva) || input.cantidadNueva < 0) {
    return {
      ...initialMovimientoState,
      error: "La cantidad nueva debe ser >= 0.",
    };
  }
  const diff = input.cantidadNueva - input.cantidadActual;
  if (diff === 0) {
    return {
      ...initialMovimientoState,
      error: "La cantidad no cambia, no hay nada que ajustar.",
    };
  }

  const supabase = createClient();
  const { data: usr } = await supabase.auth.getUser();
  if (!usr.user) {
    return { ...initialMovimientoState, error: "Sesión expirada" };
  }
  const userMeta = usr.user.user_metadata as
    | { full_name?: string; nombre?: string }
    | undefined;
  const userNombre =
    userMeta?.full_name ?? userMeta?.nombre ?? usr.user.email ?? null;

  const tipo = diff > 0 ? "entrada_ajuste" : "salida_ajuste";
  const cantidadAbs = Math.abs(diff);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("inventario_movimientos")
    .insert({
      almacen_id: input.almacenId,
      producto_id: input.productoId,
      tipo,
      cantidad: cantidadAbs,
      capturado_por: usr.user.id,
      capturado_por_nombre: userNombre,
      motivo: `Ajuste manual: ${input.motivo}`,
      observaciones: `Cantidad anterior: ${input.cantidadActual}, nueva: ${input.cantidadNueva} (Δ ${diff > 0 ? "+" : ""}${diff})`,
      fecha: new Date().toISOString().slice(0, 10),
    });

  if (error) return { ...initialMovimientoState, error: error.message };

  revalidatePath(`/inventario/${input.productoId}`);
  revalidatePath("/inventario");
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
