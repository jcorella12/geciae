import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";

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
  maximumFractionDigits: 0,
});

const TIPO_LABELS: Record<string, string> = {
  iva_mensual: "IVA mensual",
  isr_provisional: "ISR provisional",
  isr_retenciones: "Ret. ISR sueldos",
  diot: "DIOT",
  iva_retenciones: "Ret. IVA",
  declaracion_anual: "Declaración anual",
  iva_anual: "IVA anual",
  isn: "ISN estatal",
  icsoe: "ICSOE",
  sisub: "SISUB",
  aportacion_imss: "IMSS bimestral",
  pago_infonavit: "INFONAVIT",
  pago_fonacot: "FONACOT",
  estatales: "Estatales",
  otra: "Otra",
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: "bg-gray-100 text-gray-700",
  en_proceso: "bg-blue-100 text-blue-700",
  presentada: "bg-emerald-100 text-emerald-700",
  pagada: "bg-emerald-100 text-emerald-700",
  rechazada: "bg-red-100 text-red-700",
  fuera_plazo: "bg-amber-100 text-amber-700",
  extemporanea: "bg-amber-100 text-amber-700",
  no_aplica: "bg-gray-50 text-gray-500",
};

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  presentada: "Presentada",
  pagada: "Pagada",
  rechazada: "Rechazada",
  fuera_plazo: "Fuera de plazo",
  extemporanea: "Extemporánea",
  no_aplica: "No aplica",
};

type SearchParams = {
  empresa?: string;
  anio?: string;
  estado?: string;
  tipo?: string;
};

export default async function ObligacionesSatPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  await obtenerVinculos();

  const sp = searchParams ?? {};
  const empresaId = sp.empresa ?? "";
  const anio = sp.anio ? parseInt(sp.anio, 10) : new Date().getFullYear();
  const estado = sp.estado ?? "";
  const tipo = sp.tipo ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = (supabase as any)
    .from("v_obligaciones_lista")
    .select("*")
    .eq("periodo_anio", anio)
    .order("fecha_vencimiento", { ascending: true });

  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (estado) query = query.eq("estado_efectivo", estado);
  if (tipo) query = query.eq("tipo", tipo);

  const { data, error } = (await query) as {
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  };
  const lista = data ?? [];

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  // Stats
  const _hoy = new Date().toISOString().slice(0, 10);
  const pendientes = lista.filter(
    (l) => l.estado_efectivo === "pendiente" || l.estado_efectivo === "en_proceso",
  );
  const fueraPlazo = lista.filter((l) => l.estado_efectivo === "fuera_plazo");
  const proximas7d = lista.filter((l) => {
    const dias = l.dias_al_vencer as number;
    return (
      (l.estado_efectivo === "pendiente" ||
        l.estado_efectivo === "en_proceso") &&
      dias != null &&
      dias >= 0 &&
      dias <= 7
    );
  });
  const presentadas = lista.filter((l) =>
    ["presentada", "pagada"].includes(l.estado_efectivo as string),
  );
  const totalCalculado = lista.reduce(
    (a, l) => a + Number(l.monto_calculado ?? 0),
    0,
  );

  // Tipos disponibles para filtro (los que estén en la lista del año)
  const tiposEnLista = Array.from(new Set(lista.map((l) => l.tipo as string)));

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Administración y Finanzas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Obligaciones SAT
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Calendario fiscal del grupo — IVA, ISR, DIOT, REPSE, anuales. Marca
            cada obligación como presentada cuando subas el acuse.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Pendientes ${anio}`}
          value={String(pendientes.length)}
          sub={`${lista.length} obligaciones totales`}
          accent={pendientes.length > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="Próximas 7 días"
          value={String(proximas7d.length)}
          sub="Vencen esta semana"
          accent={proximas7d.length > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="Fuera de plazo"
          value={String(fueraPlazo.length)}
          sub="Atención inmediata"
          accent={fueraPlazo.length > 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="Presentadas"
          value={String(presentadas.length)}
          sub={fmtMxn.format(totalCalculado)}
          accent="ok"
        />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-2">
          Año
        </span>
        {[2025, 2026, 2027].map((a) => (
          <Link
            key={a}
            href={`/finanzas/obligaciones?anio=${a}${empresaId ? `&empresa=${empresaId}` : ""}${estado ? `&estado=${estado}` : ""}${tipo ? `&tipo=${tipo}` : ""}`}
            className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${anio === a ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            {a}
          </Link>
        ))}

        <span className="ml-3 text-ink-5">·</span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Empresa
        </span>
        <Link
          href={`/finanzas/obligaciones?anio=${anio}${estado ? `&estado=${estado}` : ""}${tipo ? `&tipo=${tipo}` : ""}`}
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!empresaId ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/finanzas/obligaciones?anio=${anio}&empresa=${e.id}${estado ? `&estado=${estado}` : ""}${tipo ? `&tipo=${tipo}` : ""}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium ${empresaId === e.id ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
              } ${empresaId === e.id ? "bg-white" : ""}`}
            />
            {e.codigo}
          </Link>
        ))}

        {tiposEnLista.length > 0 && (
          <>
            <span className="ml-3 text-ink-5">·</span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Tipo
            </span>
            <Link
              href={`/finanzas/obligaciones?anio=${anio}${empresaId ? `&empresa=${empresaId}` : ""}${estado ? `&estado=${estado}` : ""}`}
              className={`rounded-md px-2 py-1 text-[11px] font-medium ${!tipo ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
            >
              Todos
            </Link>
            {tiposEnLista.map((t) => (
              <Link
                key={t}
                href={`/finanzas/obligaciones?anio=${anio}${empresaId ? `&empresa=${empresaId}` : ""}&tipo=${t}${estado ? `&estado=${estado}` : ""}`}
                className={`rounded-md px-2 py-1 text-[11px] font-medium ${tipo === t ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
              >
                {TIPO_LABELS[t]?.replace(" estatal", "").replace(" mensual", "") ?? t}
              </Link>
            ))}
          </>
        )}

        <Link
          href={`/finanzas/obligaciones?anio=${anio}${empresaId ? `&empresa=${empresaId}` : ""}${tipo ? `&tipo=${tipo}` : ""}`}
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!estado ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todos
        </Link>
        {["pendiente", "fuera_plazo", "presentada", "pagada"].map((e) => (
          <Link
            key={e}
            href={`/finanzas/obligaciones?anio=${anio}${empresaId ? `&empresa=${empresaId}` : ""}&estado=${e}${tipo ? `&tipo=${tipo}` : ""}`}
            className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${estado === e ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
          >
            {ESTADO_LABEL[e] ?? e}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      <TableSurface>
        <Table>
          <TableHeader>
            <TableRow interactive={false}>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead align="right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow interactive={false}>
                <TableCell className="text-center text-sm text-ink-3" align="center">
                  Sin obligaciones para los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((r) => {
                const codigo = r.empresa_codigo as string;
                const dias = r.dias_al_vencer as number;
                const estadoEf = r.estado_efectivo as string;
                const venc = r.fecha_vencimiento as string;
                return (
                  <TableRow key={r.id as string}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            empresaCodigoColor[codigo] ?? "bg-muted-foreground"
                          }`}
                        />
                        {codigo}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {TIPO_LABELS[r.tipo as string] ?? (r.tipo as string)}
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      {(r.periodo_label as string) ??
                        `${r.periodo_anio}${r.periodo_mes ? `-${String(r.periodo_mes).padStart(2, "0")}` : ""}`}
                    </TableCell>
                    <TableCell className="text-xs">
                      <p>
                        {new Date(venc).toLocaleDateString("es-MX", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {dias != null &&
                        ["pendiente", "en_proceso"].includes(estadoEf) && (
                          <p
                            className={`mt-0.5 inline-flex items-center gap-0.5 text-[10px] ${
                              dias < 0
                                ? "text-red-700"
                                : dias <= 7
                                  ? "text-amber-700"
                                  : "text-ink-4"
                            }`}
                          >
                            {dias < 0 ? (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            ) : (
                              <Clock className="h-2.5 w-2.5" />
                            )}
                            {dias < 0
                              ? `Hace ${Math.abs(dias)} días`
                              : dias === 0
                                ? "Hoy"
                                : `En ${dias} días`}
                          </p>
                        )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          ESTADO_BADGE[estadoEf] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {estadoEf === "presentada" || estadoEf === "pagada" ? (
                          <CheckCircle2 className="mr-1 inline-block h-2.5 w-2.5" />
                        ) : null}
                        {ESTADO_LABEL[estadoEf] ?? estadoEf}
                      </span>
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {r.monto_calculado != null
                        ? fmtMxn.format(Number(r.monto_calculado))
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableSurface>
    </div>
  );
}
