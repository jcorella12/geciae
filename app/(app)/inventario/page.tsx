import { AlertTriangle, Plus, TrendingUp, Warehouse } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";
import { obtenerVinculos } from "@/lib/auth/permisos";
import {
  EMPRESA_COOKIE,
  puedeVerConsolidado,
  resolverEmpresasFiltro,
} from "@/lib/empresa-activa";
import {
  COLOR_CATEGORIA_INV,
  COLOR_ESTADO_STOCK,
  ETIQUETA_CATEGORIA_INV,
  ETIQUETA_ESTADO_STOCK,
  ICONO_CATEGORIA_INV,
  type CategoriaInventario,
  type EstadoStock,
} from "@/lib/inventario/state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const fmtNum = (n: number, decimals = 2) =>
  Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: { categoria?: string; estado?: string; q?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const filtro = resolverEmpresasFiltro({
    cookieValue: cookies().get(EMPRESA_COOKIE)?.value ?? null,
    empresasUsuario: v.map((x) => x.empresa_id),
    puedeConsolidado: puedeVerConsolidado(v),
  });
  let q = supabase
    .from("v_inventario_stock")
    .select(
      "producto_id, empresa_id, sku, nombre, categoria, marca, modelo, unidad_medida, stock_minimo, stock_actual, costo_promedio, costo_ultimo, valor_mercado, valor_costo, valor_mercado_total, ultimo_movimiento_fecha, estado_stock",
    )
    .in("empresa_id", filtro.empresasIds)
    .order("nombre");

  if (searchParams.categoria) q = q.eq("categoria", searchParams.categoria);
  if (searchParams.estado) q = q.eq("estado_stock", searchParams.estado);
  if (searchParams.q) {
    const s = searchParams.q.trim();
    q = q.or(`nombre.ilike.%${s}%,sku.ilike.%${s}%,marca.ilike.%${s}%`);
  }

  const { data: items } = await q;
  const lista = (items ?? []) as Array<{
    producto_id: string;
    sku: string;
    nombre: string;
    categoria: CategoriaInventario;
    marca: string | null;
    modelo: string | null;
    unidad_medida: string;
    stock_minimo: number | null;
    stock_actual: number;
    costo_promedio: number | null;
    costo_ultimo: number | null;
    valor_mercado: number | null;
    valor_costo: number;
    valor_mercado_total: number;
    ultimo_movimiento_fecha: string | null;
    estado_stock: EstadoStock;
  }>;

  // KPIs
  const totalItems = lista.length;
  const valorTotalCosto = lista.reduce(
    (a, i) => a + Number(i.valor_costo ?? 0),
    0,
  );
  const valorTotalMercado = lista.reduce(
    (a, i) => a + Number(i.valor_mercado_total ?? 0),
    0,
  );
  const enAlerta = lista.filter(
    (i) => i.estado_stock === "agotado" || i.estado_stock === "bajo",
  ).length;

  const categorias = Object.keys(
    ETIQUETA_CATEGORIA_INV,
  ) as CategoriaInventario[];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="lbl-mini">Operación</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight">
            Inventario
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Catálogo de productos · stock actual · valoración a costo y a
            mercado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton tipo="inventario" />
          <Link href="/inventario/almacenes">
            <Button variant="outline">
              <Warehouse className="h-4 w-4" />
              Almacenes
            </Button>
          </Link>
          <Link href="/inventario/movimientos/nuevo">
            <Button variant="outline">
              <TrendingUp className="h-4 w-4" />
              Registrar movimiento
            </Button>
          </Link>
          <Link href="/inventario/nuevo">
            <Button>
              <Plus className="h-4 w-4" />
              Nuevo item
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Items en catálogo"
          value={totalItems}
          sub="productos activos"
        />
        <KpiCard
          label="Valor a costo"
          value={fmtMxn.format(valorTotalCosto)}
          sub="stock × costo promedio"
        />
        <KpiCard
          label="Valor a mercado"
          value={fmtMxn.format(valorTotalMercado)}
          sub={
            valorTotalMercado > valorTotalCosto
              ? `+${fmtMxn.format(valorTotalMercado - valorTotalCosto)} potencial`
              : valorTotalMercado < valorTotalCosto
                ? `−${fmtMxn.format(valorTotalCosto - valorTotalMercado)} merma`
                : "sin diferencia"
          }
          accent={
            valorTotalMercado >= valorTotalCosto ? "ok" : "warn"
          }
        />
        <KpiCard
          label="Items en alerta"
          value={enAlerta}
          sub="agotados o stock bajo"
          accent={enAlerta > 0 ? "warn" : "ok"}
        />
      </div>

      {/* Filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-md border border-divider bg-bg-2/40 px-3 py-2">
        <span className="text-[11px] font-medium text-ink-3">Categoría:</span>
        <Link
          href="/inventario"
          className={`rounded-full px-2 py-0.5 text-[11px] ${!searchParams.categoria ? "bg-ink-1 text-bg-1" : "bg-card text-ink-2"}`}
        >
          Todas ({lista.length})
        </Link>
        {categorias
          .map((c) => ({
            cat: c,
            n: lista.filter((i) => i.categoria === c).length,
          }))
          .filter((x) => x.n > 0)
          .map(({ cat, n }) => (
            <Link
              key={cat}
              href={`/inventario?categoria=${cat}`}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                searchParams.categoria === cat
                  ? "bg-ink-1 text-bg-1"
                  : COLOR_CATEGORIA_INV[cat]
              }`}
            >
              {ICONO_CATEGORIA_INV[cat]} {ETIQUETA_CATEGORIA_INV[cat]} ({n})
            </Link>
          ))}
        <span className="ml-3 text-[11px] font-medium text-ink-3">Estado:</span>
        {(["agotado", "bajo", "normal"] as const).map((s) => (
          <Link
            key={s}
            href={`/inventario?estado=${s}${searchParams.categoria ? `&categoria=${searchParams.categoria}` : ""}`}
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
              searchParams.estado === s
                ? "bg-ink-1 text-bg-1"
                : COLOR_ESTADO_STOCK[s]
            }`}
          >
            {ETIQUETA_ESTADO_STOCK[s]}
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin items. <Link href="/inventario/nuevo" className="text-brand hover:underline">Crear el primero →</Link>
        </p>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead align="right">Stock</TableHead>
                <TableHead align="right">Costo prom.</TableHead>
                <TableHead align="right">Valor a mercado</TableHead>
                <TableHead align="right">Δ vs costo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((i) => {
                const cat = i.categoria as CategoriaInventario;
                const valMercadoUnit =
                  i.valor_mercado ?? i.costo_promedio ?? 0;
                const delta =
                  i.costo_promedio && Number(i.costo_promedio) > 0
                    ? ((Number(valMercadoUnit) - Number(i.costo_promedio)) /
                        Number(i.costo_promedio)) *
                      100
                    : 0;
                return (
                  <TableRow
                    key={i.producto_id}
                    href={`/inventario/${i.producto_id}`}
                    linkLabel={`Abrir producto ${i.sku ?? i.nombre}`}
                  >
                    <TableCell className="font-mono text-xs">
                      {i.sku}
                    </TableCell>
                    <TableCell>
                      <p className="text-[12.5px] font-medium leading-tight">
                        {i.nombre}
                      </p>
                      <p className="text-[10.5px] text-ink-3">
                        {[i.marca, i.modelo].filter(Boolean).join(" · ")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_CATEGORIA_INV[cat]}`}
                      >
                        {ICONO_CATEGORIA_INV[cat]}{" "}
                        {ETIQUETA_CATEGORIA_INV[cat]}
                      </span>
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {fmtNum(Number(i.stock_actual), 2)} {i.unidad_medida}
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {i.costo_promedio
                        ? fmtMxn.format(Number(i.costo_promedio))
                        : "—"}
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {valMercadoUnit
                        ? fmtMxn.format(Number(valMercadoUnit))
                        : "—"}
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {Math.abs(delta) < 0.5 ? (
                        "—"
                      ) : (
                        <span
                          className={
                            delta > 0
                              ? "text-emerald-700"
                              : "text-red-600 font-medium"
                          }
                        >
                          {delta > 0 ? "+" : ""}
                          {delta.toFixed(1)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${COLOR_ESTADO_STOCK[i.estado_stock]}`}
                      >
                        {i.estado_stock === "agotado" && (
                          <AlertTriangle className="mr-1 inline h-3 w-3" />
                        )}
                        {ETIQUETA_ESTADO_STOCK[i.estado_stock]}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableSurface>
      )}
    </div>
  );
}

