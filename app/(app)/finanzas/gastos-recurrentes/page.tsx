import { Plus } from "lucide-react";
import Link from "next/link";

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
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});
const fmtMxnShort = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const CATEGORIA_LABEL: Record<string, string> = {
  arrendamiento_vehiculo: "🚗 Arrendamiento vehículo",
  renta_inmueble: "🏢 Renta inmueble",
  telefonia_internet: "📞 Telefonía / Internet",
  software_saas: "💻 Software / SaaS",
  seguros: "🛡 Seguros",
  vigilancia: "👁 Vigilancia",
  mantenimiento: "🔧 Mantenimiento",
  limpieza: "🧹 Limpieza",
  servicios_publicos: "💡 Servicios públicos",
  membresia_camara: "🏛 Membresía / Cámara",
  asesoria_contable: "📊 Asesoría contable",
  asesoria_legal: "⚖️ Asesoría legal",
  otros_indirectos: "📋 Otros indirectos",
};

const FRECUENCIA_LABEL: Record<string, string> = {
  mensual: "Mensual",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

type SearchParams = {
  empresa?: string;
  categoria?: string;
  estado?: string;
};

export default async function GastosRecurrentesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  await obtenerVinculos();

  const sp = searchParams ?? {};
  const empresaId = sp.empresa ?? "";
  const categoria = sp.categoria ?? "";
  const soloActivos = (sp.estado ?? "activos") === "activos";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase as any)
    .from("v_gastos_recurrentes_lista")
    .select("*")
    .order("monto_mensualizado", { ascending: false });

  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (categoria) query = query.eq("categoria", categoria);
  if (soloActivos) query = query.eq("activo", true);

  const { data, error } = (await query) as {
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  };
  const lista = data ?? [];

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial")
    .eq("activa", true)
    .order("codigo");

  // KPIs
  const totalMensualizado = lista.reduce(
    (a, l) => a + Number(l.monto_mensualizado ?? 0),
    0,
  );
  const totalAnualizado = totalMensualizado * 12;
  const numActivos = lista.filter((l) => l.activo).length;

  // Por categoría
  const porCategoria = new Map<string, number>();
  for (const l of lista) {
    const cat = l.categoria as string;
    porCategoria.set(
      cat,
      (porCategoria.get(cat) ?? 0) + Number(l.monto_mensualizado ?? 0),
    );
  }
  const categoriasOrdenadas = Array.from(porCategoria.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  // Por empresa
  const porEmpresa = new Map<string, { codigo: string; total: number }>();
  for (const l of lista) {
    const codigo = (l.empresa_codigo as string) ?? "?";
    const cur = porEmpresa.get(codigo) ?? { codigo, total: 0 };
    cur.total += Number(l.monto_mensualizado ?? 0);
    porEmpresa.set(codigo, cur);
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Administración y Finanzas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Gastos recurrentes
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Arrendamientos, rentas, software, seguros y otros gastos periódicos
            del grupo. Sirve para calcular indirectos y planeación de flujo.
          </p>
        </div>
        <Link href="/finanzas/gastos-recurrentes/nuevo">
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo gasto recurrente
          </Button>
        </Link>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Indirectos mensualizados"
          value={fmtMxnShort.format(totalMensualizado)}
          sub={`${numActivos} activos`}
          accent="warn"
        />
        <KpiCard
          label="Indirectos anualizados"
          value={fmtMxnShort.format(totalAnualizado)}
          sub="Suma × 12"
        />
        <KpiCard
          label="Categoría top"
          value={
            categoriasOrdenadas[0]
              ? CATEGORIA_LABEL[categoriasOrdenadas[0][0]]?.split(" ").slice(1).join(" ") ??
                categoriasOrdenadas[0][0]
              : "—"
          }
          sub={
            categoriasOrdenadas[0]
              ? fmtMxnShort.format(categoriasOrdenadas[0][1])
              : "Sin datos"
          }
        />
        <KpiCard
          label="Empresas con gastos"
          value={String(porEmpresa.size)}
          sub={
            Array.from(porEmpresa.values())
              .sort((a, b) => b.total - a.total)
              .slice(0, 4)
              .map((e) => `${e.codigo} ${fmtMxnShort.format(e.total)}`)
              .join(" · ") || "—"
          }
        />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-2">
          Empresa
        </span>
        <Link
          href={`/finanzas/gastos-recurrentes${categoria ? `?categoria=${categoria}` : ""}`}
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!empresaId ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/finanzas/gastos-recurrentes?empresa=${e.id}${categoria ? `&categoria=${categoria}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ${empresaId === e.id ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"} ${empresaId === e.id ? "bg-white" : ""}`}
            />
            {e.codigo}
          </Link>
        ))}
      </div>

      {categoriasOrdenadas.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-1">
            Categoría
          </span>
          <Link
            href={`/finanzas/gastos-recurrentes${empresaId ? `?empresa=${empresaId}` : ""}`}
            className={`rounded-md px-2 py-1 text-[11px] font-medium ${!categoria ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            Todas
          </Link>
          {categoriasOrdenadas.map(([cat, monto]) => (
            <Link
              key={cat}
              href={`/finanzas/gastos-recurrentes?categoria=${cat}${empresaId ? `&empresa=${empresaId}` : ""}`}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${categoria === cat ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
              title={fmtMxn.format(monto)}
            >
              {CATEGORIA_LABEL[cat]?.split(" ").slice(0, 2).join(" ") ?? cat}
            </Link>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          Sin gastos recurrentes capturados.
          <br />
          <Link
            href="/finanzas/gastos-recurrentes/nuevo"
            className="mt-2 inline-block text-brand hover:underline"
          >
            Registrar el primero →
          </Link>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Empresa</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead align="right">Monto</TableHead>
                <TableHead>Frecuencia</TableHead>
                <TableHead align="right">Mensualizado</TableHead>
                <TableHead>Vigencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((g) => {
                const codigo = g.empresa_codigo as string;
                const cat = g.categoria as string;
                return (
                  <TableRow key={g.id as string}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${empresaCodigoColor[codigo] ?? "bg-muted-foreground"}`}
                        />
                        {codigo}
                      </span>
                    </TableCell>
                    <TableCell className="text-[12px]">
                      {CATEGORIA_LABEL[cat] ?? cat}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/finanzas/gastos-recurrentes/${g.id}`}
                        className="font-medium hover:text-brand hover:underline"
                      >
                        {g.descripcion as string}
                      </Link>
                      {Boolean(g.identificador) && (
                        <p className="font-mono text-[10px] text-ink-3">
                          {g.identificador as string}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      {(g.proveedor_display as string) ?? "—"}
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(Number(g.monto ?? 0))}
                      {g.moneda !== "MXN" && (
                        <span className="ml-1 text-[10px] text-ink-3">
                          {g.moneda as string}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {FRECUENCIA_LABEL[g.frecuencia as string] ??
                        (g.frecuencia as string)}
                      {Boolean(g.dia_pago) && (
                        <span className="ml-1 text-ink-3">
                          (día {g.dia_pago as number})
                        </span>
                      )}
                    </TableCell>
                    <TableCell align="right" mono>
                      <span
                        className={
                          (g.frecuencia as string) === "mensual"
                            ? ""
                            : "text-emerald-700"
                        }
                      >
                        {fmtMxnShort.format(
                          Number(g.monto_mensualizado ?? 0),
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-ink-3">
                      {Boolean(g.fecha_inicio) &&
                        new Date(g.fecha_inicio as string).toLocaleDateString(
                          "es-MX",
                          { day: "numeric", month: "short", year: "2-digit" },
                        )}
                      {Boolean(g.fecha_fin) && (
                        <>
                          {" → "}
                          {new Date(g.fecha_fin as string).toLocaleDateString(
                            "es-MX",
                            { day: "numeric", month: "short", year: "2-digit" },
                          )}
                        </>
                      )}
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
