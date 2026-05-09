import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Edit3,
  Plus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_CATEGORIA_INV,
  COLOR_ESTADO_STOCK,
  COLOR_TIPO_MOV,
  ETIQUETA_CATEGORIA_INV,
  ETIQUETA_ESTADO_STOCK,
  ETIQUETA_TIPO_MOV,
  ICONO_CATEGORIA_INV,
  type CategoriaInventario,
  type EstadoStock,
  type TipoMovimiento,
} from "@/lib/inventario/state";
import { createClient } from "@/lib/supabase/server";

import { ActualizarValorBtn } from "./actualizar-valor-btn";
import { AjustarCantidadBtn } from "./ajustar-cantidad-btn";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const fmtMxnShort = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      })
    : "—";

export default async function ItemInventarioPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const { data: item } = await supabase
    .from("v_inventario_stock")
    .select("*")
    .eq("producto_id", params.id)
    .maybeSingle();

  // Productos compartidos del grupo tienen empresa_id = NULL (catálogo
  // consolidado). El detalle se muestra normal; solo CEO puede editarlo.
  if (!item || !item.producto_id) notFound();

  // Edición de valor de mercado: cualquier vínculo con visibilidad al producto
  const puedeEditarValorMercado =
    v.length > 0 &&
    (!item.empresa_id ||
      esCEO(v) ||
      v.some((x) => x.empresa_id === item.empresa_id));
  // Edición de cantidad de stock: solo CEO o atributo contralor (es destructivo)
  const puedeAjustarCantidad = esCEO(v) || tieneAtributo(v, "contralor");
  // Operaciones regulares (entrada/salida vía form de movimientos): rol activo
  // en la empresa del producto. Para productos del grupo solo CEO.
  const puedeEditar = item.empresa_id
    ? esCEO(v) || esRolEn(v, item.empresa_id, ["director", "operativo"])
    : esCEO(v);

  // Producto base — fuente_valor no está expuesta en la vista
  const { data: productoBase } = await supabase
    .from("catalogo_productos")
    .select("fuente_valor")
    .eq("id", params.id)
    .maybeSingle();
  const fuenteValor: string | null = productoBase?.fuente_valor ?? null;

  // Stock por almacén
  const { data: stockAlm } = await supabase
    .from("v_inventario_stock_almacen")
    .select("almacen_id, almacen_codigo, almacen_nombre, stock")
    .eq("producto_id", params.id);

  // Kardex (últimos 100 movimientos)
  const { data: movs } = await supabase
    .from("v_inventario_movimientos")
    .select(
      "id, fecha, tipo, cantidad, costo_unitario, monto_total, almacen_codigo, almacen_nombre, proyecto_id, proyecto_codigo, proyecto_nombre, proveedor_nombre, numero_documento, observaciones, capturado_por_nombre, created_at",
    )
    .eq("producto_id", params.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const cat = item.categoria as CategoriaInventario;
  const estado = item.estado_stock as EstadoStock;
  const valMercadoUnit =
    Number(item.valor_mercado ?? item.costo_promedio ?? 0);
  const costoProm = Number(item.costo_promedio ?? 0);
  const delta =
    costoProm > 0 ? ((valMercadoUnit - costoProm) / costoProm) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6">
        <Link
          href="/inventario"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Inventario
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[12px] text-ink-3">
                {item.sku}
              </code>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_CATEGORIA_INV[cat]}`}
              >
                {ICONO_CATEGORIA_INV[cat]} {ETIQUETA_CATEGORIA_INV[cat]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_STOCK[estado]}`}
              >
                {estado === "agotado" && (
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                )}
                {ETIQUETA_ESTADO_STOCK[estado]}
              </span>
            </div>
            <h1 className="mt-2 text-[24px] font-semibold leading-tight">
              {item.nombre}
            </h1>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {[item.marca, item.modelo].filter(Boolean).join(" · ")}
              {item.descripcion ? ` · ${item.descripcion}` : ""}
            </p>
          </div>
          {puedeEditar && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/inventario/movimientos/nuevo?producto=${item.producto_id}&tipo=salida_proyecto`}
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Salida
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link
                  href={`/inventario/movimientos/nuevo?producto=${item.producto_id}&tipo=entrada_compra`}
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Entrada
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Stock actual"
          value={`${Number(item.stock_actual).toLocaleString("es-MX", { maximumFractionDigits: 2 })} ${item.unidad_medida}`}
          sub={
            item.stock_minimo
              ? `mín: ${item.stock_minimo}`
              : "sin mínimo definido"
          }
          accent={
            estado === "agotado" ? "danger" : estado === "bajo" ? "warn" : "ok"
          }
        />
        <KpiCard
          label="Costo promedio"
          value={costoProm ? fmtMxn.format(costoProm) : "—"}
          sub={item.costo_ultimo ? `último: ${fmtMxnShort.format(Number(item.costo_ultimo))}` : "sin compras"}
        />
        <KpiCard
          label="Valor a mercado"
          value={valMercadoUnit ? fmtMxn.format(valMercadoUnit) : "—"}
          sub={
            costoProm > 0 && Math.abs(delta) >= 0.5
              ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}% vs costo`
              : "sin diferencia"
          }
          accent={delta > 5 ? "ok" : delta < -5 ? "danger" : "brand"}
        />
        <KpiCard
          label="Valor total stock"
          value={fmtMxnShort.format(Number(item.valor_mercado_total ?? 0))}
          sub={`a costo: ${fmtMxnShort.format(Number(item.valor_costo ?? 0))}`}
          accent="brand"
        />
      </div>

      {/* Costos histórico */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            Histórico de costos (compras)
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {puedeAjustarCantidad && (stockAlm ?? []).length > 0 && (
              <AjustarCantidadBtn
                productoId={item.producto_id}
                almacenes={(stockAlm ?? []).map((a) => ({
                  almacen_id: a.almacen_id as string,
                  almacen_codigo: a.almacen_codigo as string,
                  almacen_nombre: a.almacen_nombre as string,
                  stock: Number(a.stock ?? 0),
                }))}
              />
            )}
            {puedeEditarValorMercado && (
              <ActualizarValorBtn
                itemId={item.producto_id}
                empresaId={item.empresa_id ?? null}
                valorActual={item.valor_mercado}
                fuenteActual={fuenteValor}
              />
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Costo promedio"
            value={costoProm ? fmtMxn.format(costoProm) : "—"}
          />
          <Stat
            label="Costo último"
            value={item.costo_ultimo ? fmtMxn.format(Number(item.costo_ultimo)) : "—"}
          />
          <Stat
            label="Costo mínimo"
            value={item.costo_minimo ? fmtMxn.format(Number(item.costo_minimo)) : "—"}
          />
          <Stat
            label="Costo máximo"
            value={item.costo_maximo ? fmtMxn.format(Number(item.costo_maximo)) : "—"}
          />
        </div>
        {fuenteValor && (
          <p className="mt-3 text-[11.5px] text-ink-3">
            Valor a mercado actualizado el{" "}
            {fmtFecha(item.fecha_actualizacion_valor)} · Fuente:{" "}
            {fuenteValor}
          </p>
        )}
      </section>

      {/* Stock por almacén */}
      {stockAlm && stockAlm.length > 0 && (
        <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Stock por almacén</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {stockAlm
              .filter(
                (a): a is { almacen_id: string; almacen_codigo: string; almacen_nombre: string; stock: number } =>
                  a.almacen_id !== null,
              )
              .map(
              (a) => (
                <div
                  key={a.almacen_id}
                  className="rounded-md border border-divider bg-bg-2/40 p-3"
                >
                  <p className="font-mono text-[10.5px] text-ink-3">
                    {a.almacen_codigo}
                  </p>
                  <p className="text-[12.5px] font-medium">
                    {a.almacen_nombre}
                  </p>
                  <p className="mt-1 font-mono text-[14px] tnum">
                    {Number(a.stock).toLocaleString("es-MX", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    {item.unidad_medida}
                  </p>
                </div>
              ),
            )}
          </div>
        </section>
      )}

      {/* Kardex */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">
              Kardex ({movs?.length ?? 0})
            </h2>
            <p className="text-[11.5px] text-ink-3">
              Últimos 100 movimientos · entradas en verde · salidas en naranja
            </p>
          </div>
          {puedeEditar && (
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/inventario/movimientos/nuevo?producto=${item.producto_id}`}
              >
                <Plus className="h-4 w-4" />
                Nuevo movimiento
              </Link>
            </Button>
          )}
        </div>

        {(!movs || movs.length === 0) ? (
          <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
            Sin movimientos. Registra una entrada para comenzar el inventario.
          </p>
        ) : (
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead align="right">Cantidad</TableHead>
                  <TableHead align="right">Costo unit.</TableHead>
                  <TableHead align="right">Monto</TableHead>
                  <TableHead>Doc</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(movs as Array<{
                  id: string;
                  fecha: string;
                  tipo: TipoMovimiento;
                  cantidad: number;
                  costo_unitario: number | null;
                  monto_total: number | null;
                  almacen_codigo: string;
                  proyecto_id: string | null;
                  proyecto_codigo: string | null;
                  proyecto_nombre: string | null;
                  proveedor_nombre: string | null;
                  numero_documento: string | null;
                  observaciones: string | null;
                  capturado_por_nombre: string | null;
                }>).map((m) => {
                    const esEntrada = [
                      "entrada_compra",
                      "devolucion",
                      "entrada_ajuste",
                      "traspaso_entrada",
                    ].includes(m.tipo);
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs text-ink-3">
                          {fmtFecha(m.fecha)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_TIPO_MOV[m.tipo]}`}
                          >
                            {esEntrada ? (
                              <TrendingUp className="mr-1 inline h-3 w-3" />
                            ) : (
                              <TrendingDown className="mr-1 inline h-3 w-3" />
                            )}
                            {ETIQUETA_TIPO_MOV[m.tipo]}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {m.almacen_codigo}
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.proyecto_id ? (
                            <Link
                              href={`/proyectos/${m.proyecto_id}`}
                              className="text-brand hover:underline"
                            >
                              {m.proyecto_codigo}
                            </Link>
                          ) : m.proveedor_nombre ? (
                            <span className="text-ink-3">
                              {m.proveedor_nombre}
                            </span>
                          ) : (
                            "—"
                          )}
                          {m.observaciones && (
                            <p className="mt-0.5 line-clamp-1 text-[10px] text-ink-4">
                              {m.observaciones}
                            </p>
                          )}
                        </TableCell>
                        <TableCell align="right" mono className="text-xs">
                          {esEntrada ? "+" : "−"}
                          {Number(m.cantidad).toLocaleString("es-MX", {
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell align="right" mono className="text-xs">
                          {m.costo_unitario
                            ? fmtMxn.format(Number(m.costo_unitario))
                            : "—"}
                        </TableCell>
                        <TableCell align="right" mono className="text-xs">
                          {m.monto_total
                            ? fmtMxnShort.format(Number(m.monto_total))
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-[10.5px] text-ink-3">
                          {m.numero_documento ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )}
              </TableBody>
            </Table>
          </TableSurface>
        )}
      </section>

      {/* Edit */}
      {puedeEditar && (
        <div className="mt-8 flex justify-end print:hidden">
          <Link
            href={`/inventario`}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink-1"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Volver a la lista
          </Link>
        </div>
      )}
    </div>
  );
}
