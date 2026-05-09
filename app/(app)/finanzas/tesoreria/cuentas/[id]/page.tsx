import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProyectoTabs } from "@/app/(app)/proyectos/[id]/proyecto-tabs";
import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import { StatusDot } from "@/components/ui/status-dot";
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
import { fmtFechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/server";

import { AutoConciliarButton } from "./auto-conciliar-button";
import { EdoctaBulkIA } from "./edocta-bulk-ia";
import { EdoctaIAButton } from "./edocta-ia-button";
import { EdoctaUploader } from "./edocta-uploader";
import {
  MovimientoAcciones,
  type Sugerencia,
} from "./movimiento-acciones";
import { MovimientoManualAcciones } from "./movimiento-manual-acciones";
import { NuevoMovimientoButton } from "./nuevo-movimiento";
import {
  COLOR_ORIGEN,
  ETIQUETA_ORIGEN,
  esOrigenEditable,
} from "@/lib/bancos-movimientos/state";

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

// Para columnas DATE de Postgres (YYYY-MM-DD) NO usar `new Date(d)` directo
// porque parsea como UTC y al renderizar en TZ local (México UTC-7) muestra
// el día anterior. Helper de @/lib/fechas parsea sin TZ shift.
const fmtFecha = (d: string) => fmtFechaCorta(d);

const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function CuentaDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { mes?: string; estado?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: cuenta } = await supabase
    .from("bancos_cuentas")
    .select(
      "*, empresas(id, codigo, razon_social, nombre_comercial, rfc)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!cuenta) notFound();

  const empresa = cuenta.empresas as
    | {
        id: string;
        codigo: string;
        razon_social: string;
        nombre_comercial: string | null;
        rfc: string;
      }
    | null;
  const puedeConciliar =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    (empresa?.id ? esRolEn(v, empresa.id, "director") : false);

  // Filtros: mes (YYYY-MM), default = mes actual
  const ahora = new Date();
  const mesParam =
    searchParams?.mes ??
    `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mesParam.split("-").map(Number);
  const desde = `${year}-${String(month).padStart(2, "0")}-01`;
  const hastaDate = new Date(year, month, 1);
  const hasta = hastaDate.toISOString().slice(0, 10);

  // Estado conciliación filter
  const estadoFiltro = searchParams?.estado as
    | "pendientes"
    | "conciliados"
    | undefined;

  // Movimientos del mes
  let movsQuery = supabase
    .from("bancos_movimientos")
    .select(
      "id, fecha, fecha_aplicacion, concepto, referencia, monto, tipo, saldo_resultante, conciliado, cfdi_relacionado_id, oc_relacionada_id, conciliacion_notas, observaciones, origen",
    )
    .eq("cuenta_id", params.id)
    .gte("fecha", desde)
    .lt("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (estadoFiltro === "pendientes") movsQuery = movsQuery.eq("conciliado", false);
  if (estadoFiltro === "conciliados")
    movsQuery = movsQuery.eq("conciliado", true);

  const { data: movsRaw } = await movsQuery;
  const movs = movsRaw ?? [];

  // CFDI / OC info para movimientos ya conciliados
  const cfdiIds = movs
    .filter((m) => m.cfdi_relacionado_id)
    .map((m) => m.cfdi_relacionado_id as string);
  const ocIds = movs
    .filter((m) => m.oc_relacionada_id)
    .map((m) => m.oc_relacionada_id as string);

  const [{ data: cfdisVinc }, { data: ocsVinc }] = await Promise.all([
    cfdiIds.length > 0
      ? supabase
          .from("cfdi")
          .select("id, serie, folio")
          .in("id", cfdiIds)
      : Promise.resolve({ data: [] as never[] }),
    ocIds.length > 0
      ? supabase
          .from("ordenes_compra")
          .select("id, numero")
          .in("id", ocIds)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const cfdiMap = new Map(
    (cfdisVinc ?? []).map((c) => [c.id, { serie: c.serie, folio: c.folio }]),
  );
  const ocMap = new Map(
    (ocsVinc ?? []).map((o) => [o.id, { numero: o.numero }]),
  );

  // Sugerencias para movimientos NO conciliados (call function por cada uno — limitamos a primeros 50)
  const sugerenciasMap = new Map<string, Sugerencia[]>();
  const movsParaSugerir = movs
    .filter((m) => !m.conciliado)
    .slice(0, 50);
  await Promise.all(
    movsParaSugerir.map(async (m) => {
      const { data } = await supabase.rpc("sugerir_match_movimiento", {
        p_movimiento_id: m.id,
      });
      if (data) sugerenciasMap.set(m.id, data as Sugerencia[]);
    }),
  );

  // Estados de cuenta archivados
  const { data: edoctas } = await supabase
    .from("estados_cuenta_bancarios")
    .select(
      "id, periodo_inicio, periodo_fin, saldo_inicial, saldo_final, total_abonos, total_cargos, num_abonos, num_cargos, formato, url_archivo, movimientos_cargados, created_at",
    )
    .eq("cuenta_id", params.id)
    .order("periodo_fin", { ascending: false });

  // URLs firmadas para descarga
  const edoctaUrls: Record<string, string | null> = {};
  await Promise.all(
    (edoctas ?? []).map(async (e) => {
      if (e.url_archivo) {
        const { data } = await supabase.storage
          .from("estados-cuenta")
          .createSignedUrl(e.url_archivo, 60 * 60);
        edoctaUrls[e.id] = data?.signedUrl ?? null;
      }
    }),
  );

  // Resumen mensual de conciliación (todos los meses)
  const { data: resumenMensual } = await supabase
    .from("v_conciliacion_mensual")
    .select("*")
    .eq("cuenta_id", params.id)
    .order("mes", { ascending: false });

  // KPIs del mes seleccionado
  const totalAbonosMes = movs
    .filter((m) => m.tipo === "abono")
    .reduce((a, m) => a + Number(m.monto), 0);
  const totalCargosMes = movs
    .filter((m) => m.tipo === "cargo")
    .reduce((a, m) => a + Math.abs(Number(m.monto)), 0);
  const conciliadosMes = movs.filter((m) => m.conciliado).length;
  const pctConciliacion =
    movs.length > 0 ? (conciliadosMes / movs.length) * 100 : 0;

  // Mes anterior/siguiente
  const prev = new Date(year, month - 2, 1);
  const next = new Date(year, month, 1);
  const prevMes = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const nextMes = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6">
        <Link
          href="/finanzas/tesoreria/cuentas"
          className="text-[12px] text-ink-3 hover:text-ink-1"
        >
          ← Cuentas bancarias
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
              {cuenta.banco} · {cuenta.numero_cuenta}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-3">
              {cuenta.alias && <span>{cuenta.alias} ·</span>}
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    empresaCodigoColor[empresa?.codigo ?? ""] ??
                    "bg-muted-foreground"
                  }`}
                />
                {empresa?.nombre_comercial ?? empresa?.razon_social}
              </span>
              <span>·</span>
              <code className="font-mono text-[11px]">
                CLABE {cuenta.clabe ?? "—"}
              </code>
              {cuenta.tipo && (
                <>
                  <span>·</span>
                  <span className="capitalize">{cuenta.tipo}</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cuenta.tipo === "credito" ? (
          <>
            <KpiCard
              label="Saldo dispuesto (debe)"
              value={`− ${fmtMxn.format(Number(cuenta.linea_credito_dispuesto ?? cuenta.saldo_actual ?? 0))}`}
              sub="Pasivo · monto utilizado"
              accent="warn"
            />
            <KpiCard
              label="Disponible"
              value={fmtMxn.format(
                Number(cuenta.linea_credito_monto_aprobado ?? 0) -
                  Number(
                    cuenta.linea_credito_dispuesto ?? cuenta.saldo_actual ?? 0,
                  ),
              )}
              sub={`Aprobado ${fmtMxnShort.format(Number(cuenta.linea_credito_monto_aprobado ?? 0))}`}
              accent="ok"
            />
            <KpiCard
              label="Próximo pago"
              value={fmtMxn.format(
                Number(cuenta.linea_credito_proximo_pago_monto ?? 0),
              )}
              sub={
                cuenta.linea_credito_proximo_pago_fecha
                  ? fmtFecha(cuenta.linea_credito_proximo_pago_fecha)
                  : "—"
              }
            />
            <KpiCard
              label="Tasa anual"
              value={`${Number(cuenta.linea_credito_tasa_efectiva ?? 0).toFixed(2)}%`}
              sub={
                cuenta.linea_credito_tasa_referencia
                  ? `${cuenta.linea_credito_tasa_referencia} + ${Number(cuenta.linea_credito_tasa_spread ?? 0).toFixed(2)}%`
                  : "—"
              }
            />
          </>
        ) : cuenta.tipo === "inversion" ? (
          <>
            <KpiCard
              label="Valor inversión"
              value={fmtMxn.format(Number(cuenta.saldo_actual ?? 0))}
              sub={
                cuenta.fecha_actualizacion_saldo
                  ? `Al ${new Date(cuenta.fecha_actualizacion_saldo).toLocaleDateString("es-MX")}`
                  : "—"
              }
              accent="ok"
            />
            <KpiCard
              label="Títulos"
              value={
                cuenta.inversion_titulos != null
                  ? Number(cuenta.inversion_titulos).toLocaleString("es-MX")
                  : "—"
              }
              sub={cuenta.inversion_emisora ?? "—"}
            />
            <KpiCard
              label="Rendimiento mensual"
              value={`${Number(cuenta.inversion_rendimiento_mensual_pct ?? 0).toFixed(2)}%`}
              sub="Tasa directa"
            />
            <KpiCard
              label="Garantía"
              value={cuenta.inversion_es_garantia ? "Sí" : "No"}
              sub={
                cuenta.inversion_es_garantia
                  ? "Respalda línea de crédito"
                  : "Liquidez disponible"
              }
              accent={cuenta.inversion_es_garantia ? "warn" : "ok"}
            />
          </>
        ) : (
          <KpiCard
            label="Saldo actual"
            value={fmtMxn.format(Number(cuenta.saldo_actual ?? 0))}
            sub={
              cuenta.fecha_actualizacion_saldo
                ? `Al ${new Date(cuenta.fecha_actualizacion_saldo).toLocaleDateString("es-MX")}`
                : "—"
            }
            accent="ok"
          />
        )}
        {cuenta.tipo !== "credito" && cuenta.tipo !== "inversion" && (
          <>
            <KpiCard
              label={`Abonos ${MESES_ES[month - 1]}`}
              value={fmtMxnShort.format(totalAbonosMes)}
              sub={`${movs.filter((m) => m.tipo === "abono").length} mov`}
            />
            <KpiCard
              label={`Cargos ${MESES_ES[month - 1]}`}
              value={fmtMxnShort.format(totalCargosMes)}
              sub={`${movs.filter((m) => m.tipo === "cargo").length} mov`}
              accent="warn"
            />
            <KpiCard
              label="Conciliación"
              value={`${pctConciliacion.toFixed(0)}`}
              unit="%"
              sub={`${conciliadosMes}/${movs.length} movs del mes`}
              accent={
                pctConciliacion >= 80
                  ? "ok"
                  : pctConciliacion >= 50
                    ? "warn"
                    : "danger"
              }
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <ProyectoTabs
        tabs={[
          {
            key: "resumen",
            label: "Movimientos",
            count: movs.length,
          },
          {
            key: "oc",
            label: "Estados de cuenta",
            count: edoctas?.length ?? 0,
          },
          {
            key: "etapas",
            label: "Conciliación mensual",
          },
        ]}
        panels={{
          resumen: (
            <div className="space-y-4">
              {/* Toolbar de filtros */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <Link href={`/finanzas/tesoreria/cuentas/${params.id}?mes=${prevMes}`}>
                    <button className="rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-bg-2">
                      ← {prevMes}
                    </button>
                  </Link>
                  <span className="rounded-md bg-brand px-3 py-1 text-[12px] font-medium text-brand-fg">
                    {MESES_ES[month - 1]} {year}
                  </span>
                  <Link href={`/finanzas/tesoreria/cuentas/${params.id}?mes=${nextMes}`}>
                    <button className="rounded-md border border-border bg-card px-2 py-1 text-[12px] hover:bg-bg-2">
                      {nextMes} →
                    </button>
                  </Link>
                </div>
                <div className="ml-auto flex gap-1">
                  <Link
                    href={`/finanzas/tesoreria/cuentas/${params.id}?mes=${mesParam}`}
                  >
                    <button
                      className={`rounded-md px-3 py-1 text-[11px] font-medium ${
                        !estadoFiltro
                          ? "bg-brand text-brand-fg"
                          : "bg-bg-2 text-ink-2 hover:bg-bg-3"
                      }`}
                    >
                      Todos
                    </button>
                  </Link>
                  <Link
                    href={`/finanzas/tesoreria/cuentas/${params.id}?mes=${mesParam}&estado=pendientes`}
                  >
                    <button
                      className={`rounded-md px-3 py-1 text-[11px] font-medium ${
                        estadoFiltro === "pendientes"
                          ? "bg-brand text-brand-fg"
                          : "bg-bg-2 text-ink-2 hover:bg-bg-3"
                      }`}
                    >
                      Pendientes
                    </button>
                  </Link>
                  <Link
                    href={`/finanzas/tesoreria/cuentas/${params.id}?mes=${mesParam}&estado=conciliados`}
                  >
                    <button
                      className={`rounded-md px-3 py-1 text-[11px] font-medium ${
                        estadoFiltro === "conciliados"
                          ? "bg-brand text-brand-fg"
                          : "bg-bg-2 text-ink-2 hover:bg-bg-3"
                      }`}
                    >
                      Conciliados
                    </button>
                  </Link>
                </div>
              </div>

              {/* Toolbar: nuevo movimiento + auto-conciliar */}
              {puedeConciliar && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <NuevoMovimientoButton cuentaId={params.id} />
                  <AutoConciliarButton
                    cuentaId={params.id}
                    mesYYYYMM={mesParam}
                    movsPendientes={movs.filter((m) => !m.conciliado).length}
                  />
                </div>
              )}

              {movs.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
                  Sin movimientos en este mes.
                </div>
              ) : (
                <TableSurface>
                  <Table>
                    <TableHeader>
                      <TableRow interactive={false}>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead align="right">Cargo</TableHead>
                        <TableHead align="right">Abono</TableHead>
                        <TableHead align="right">Saldo</TableHead>
                        {puedeConciliar && <TableHead>Conciliación</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movs.map((m) => (
                        <TableRow
                          key={m.id}
                          className={
                            esOrigenEditable(m.origen)
                              ? "bg-amber-50/30"
                              : undefined
                          }
                        >
                          <TableCell className="text-[12px] text-ink-3">
                            {fmtFecha(m.fecha)}
                          </TableCell>
                          <TableCell className="text-[12.5px]">
                            <p className="line-clamp-2 max-w-md">{m.concepto}</p>
                            <p className="font-mono text-[10px] text-ink-4">
                              {m.observaciones ?? m.referencia}
                            </p>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                COLOR_ORIGEN[m.origen ?? ""] ??
                                "bg-bg-2 text-ink-3"
                              }`}
                            >
                              {ETIQUETA_ORIGEN[m.origen ?? ""] ??
                                (m.origen ?? "—")}
                            </span>
                            {puedeConciliar &&
                              esOrigenEditable(m.origen) && (
                                <span className="ml-1 inline-block align-middle">
                                  <MovimientoManualAcciones movId={m.id} />
                                </span>
                              )}
                          </TableCell>
                          <TableCell align="right" mono>
                            {m.tipo === "cargo" ? (
                              <span className="text-warn-deep">
                                {fmtMxn.format(Math.abs(Number(m.monto)))}
                              </span>
                            ) : (
                              <span className="text-ink-4">—</span>
                            )}
                          </TableCell>
                          <TableCell align="right" mono>
                            {m.tipo === "abono" ? (
                              <span className="text-ok-deep">
                                {fmtMxn.format(Math.abs(Number(m.monto)))}
                              </span>
                            ) : (
                              <span className="text-ink-4">—</span>
                            )}
                          </TableCell>
                          <TableCell align="right" mono>
                            {m.saldo_resultante != null
                              ? fmtMxn.format(Number(m.saldo_resultante))
                              : "—"}
                          </TableCell>
                          {puedeConciliar && (
                            <TableCell>
                              <MovimientoAcciones
                                movimientoId={m.id}
                                conciliado={m.conciliado === true}
                                cfdiId={m.cfdi_relacionado_id}
                                ocId={m.oc_relacionada_id}
                                cfdiInfo={
                                  m.cfdi_relacionado_id
                                    ? cfdiMap.get(m.cfdi_relacionado_id) ?? null
                                    : null
                                }
                                ocInfo={
                                  m.oc_relacionada_id
                                    ? ocMap.get(m.oc_relacionada_id) ?? null
                                    : null
                                }
                                sugerencias={sugerenciasMap.get(m.id) ?? []}
                              />
                              {m.conciliacion_notas && (
                                <p className="mt-1 text-[10px] italic text-ink-3">
                                  {m.conciliacion_notas}
                                </p>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableSurface>
              )}
            </div>
          ),
          oc: (
            <div className="space-y-4">
              {/* Uploader drag-and-drop */}
              {puedeConciliar && (
                <div
                  id="edocta-uploader"
                  className="rounded-lg border border-border bg-card p-4 shadow-sm"
                >
                  <h3 className="mb-2 text-sm font-semibold">
                    Subir estado de cuenta
                  </h3>
                  <EdoctaUploader cuentaId={params.id} />
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <p className="text-[12px] text-ink-3">
                  Archivos cargados (PDFs y exports). Re-subir un mes ya cargado
                  reemplaza los movimientos del periodo (idempotente).
                  <br />
                  Usa <strong>Leer IA</strong> para extraer saldos y conteos del
                  PDF con Claude Haiku — solo procesa los que tú elijas.
                </p>
                {puedeConciliar && (
                  <EdoctaBulkIA
                    pendientesIds={(edoctas ?? [])
                      .filter(
                        (e) =>
                          e.url_archivo &&
                          (Number(e.saldo_final) === 0 ||
                            (e.num_abonos == null && e.num_cargos == null)),
                      )
                      .map((e) => e.id)}
                  />
                )}
              </div>
              {(edoctas?.length ?? 0) === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
                  Sin estados de cuenta archivados. Sube un PDF/EXP del banco
                  desde la línea de comando o a través del agente.
                </div>
              ) : (
                <TableSurface>
                  <Table>
                    <TableHeader>
                      <TableRow interactive={false}>
                        <TableHead>Periodo</TableHead>
                        <TableHead>Formato</TableHead>
                        <TableHead align="right">Saldo final</TableHead>
                        <TableHead align="right">Abonos</TableHead>
                        <TableHead align="right">Cargos</TableHead>
                        <TableHead align="right">Movs cargados</TableHead>
                        <TableHead>Subido</TableHead>
                        <TableHead>Archivo</TableHead>
                        <TableHead align="right">IA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(edoctas ?? []).map((e) => {
                        const url = edoctaUrls[e.id];
                        return (
                          <TableRow key={e.id}>
                            <TableCell className="text-[12.5px] font-medium">
                              {fmtFecha(e.periodo_inicio)} →{" "}
                              {fmtFecha(e.periodo_fin)}
                            </TableCell>
                            <TableCell>
                              <span className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                                {e.formato}
                              </span>
                            </TableCell>
                            <TableCell align="right" mono>
                              {fmtMxn.format(Number(e.saldo_final))}
                            </TableCell>
                            <TableCell align="right" mono>
                              <p>
                                {e.total_abonos != null
                                  ? fmtMxnShort.format(Number(e.total_abonos))
                                  : "—"}
                              </p>
                              <p className="text-[10px] text-ink-3">
                                {e.num_abonos ?? "—"} mov
                              </p>
                            </TableCell>
                            <TableCell align="right" mono>
                              <p>
                                {e.total_cargos != null
                                  ? fmtMxnShort.format(Number(e.total_cargos))
                                  : "—"}
                              </p>
                              <p className="text-[10px] text-ink-3">
                                {e.num_cargos ?? "—"} mov
                              </p>
                            </TableCell>
                            <TableCell align="right" mono>
                              {e.movimientos_cargados ?? 0}
                            </TableCell>
                            <TableCell className="text-[11px] text-ink-3">
                              {e.created_at
                                ? new Date(e.created_at).toLocaleDateString(
                                    "es-MX",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      year: "2-digit",
                                    },
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[12px] text-brand hover:underline"
                                >
                                  <FileText className="h-3 w-3" />
                                  Descargar
                                  <Download className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-[11px] text-ink-4">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {puedeConciliar && url && (
                                <EdoctaIAButton
                                  estadoId={e.id}
                                  yaExtraido={
                                    Number(e.saldo_final) !== 0 ||
                                    e.num_abonos != null ||
                                    e.num_cargos != null
                                  }
                                />
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
          ),
          etapas: (
            <div className="space-y-4">
              <p className="text-[12px] text-ink-3">
                Resumen mensual de conciliación. Útil para cierre contable.
              </p>
              {(resumenMensual?.length ?? 0) === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
                  Sin datos.
                </div>
              ) : (
                <TableSurface>
                  <Table>
                    <TableHeader>
                      <TableRow interactive={false}>
                        <TableHead>Mes</TableHead>
                        <TableHead align="right">Movs</TableHead>
                        <TableHead align="right">Conciliados</TableHead>
                        <TableHead align="right">Pendientes</TableHead>
                        <TableHead align="right">Abonos</TableHead>
                        <TableHead align="right">Cargos</TableHead>
                        <TableHead>Avance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(resumenMensual ?? []).map((r) => {
                        const numMovs = Number(r.num_movs ?? 0);
                        const numConciliados = Number(r.num_conciliados ?? 0);
                        const numPendientes = Number(r.num_pendientes ?? 0);
                        const pct =
                          numMovs > 0
                            ? (numConciliados / numMovs) * 100
                            : 0;
                        const mes = new Date(r.mes ?? "");
                        const status =
                          pct >= 95 ? "ok" : pct >= 70 ? "warning" : "danger";
                        return (
                          <TableRow key={String(r.mes)}>
                            <TableCell className="font-medium capitalize">
                              {MESES_ES[mes.getMonth()]} {mes.getFullYear()}
                            </TableCell>
                            <TableCell align="right" mono>
                              {numMovs}
                            </TableCell>
                            <TableCell align="right" mono className="text-ok-deep">
                              {numConciliados}
                            </TableCell>
                            <TableCell align="right" mono className="text-warn-deep">
                              {numPendientes}
                            </TableCell>
                            <TableCell align="right" mono>
                              {fmtMxnShort.format(Number(r.total_abonos ?? 0))}
                            </TableCell>
                            <TableCell align="right" mono>
                              {fmtMxnShort.format(Number(r.total_cargos ?? 0))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusDot status={status} />
                                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg-3">
                                  <div
                                    className={`h-full ${pct >= 95 ? "bg-ok" : pct >= 70 ? "bg-warn" : "bg-danger"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="font-mono tnum text-[11px]">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableSurface>
              )}
            </div>
          ),
        }}
      />

      {/* Resumen lateral con datos cuenta */}
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-[13.5px] font-semibold">Datos de la cuenta</h2>
          <dl className="space-y-2 text-[13px]">
            <Row k="Banco" v={cuenta.banco} />
            <Row k="Cuenta" v={<code className="font-mono text-[12px]">{cuenta.numero_cuenta}</code>} />
            <Row
              k="CLABE"
              v={cuenta.clabe ? <code className="font-mono text-[11px]">{cuenta.clabe}</code> : "—"}
            />
            <Row k="Tipo" v={cuenta.tipo ?? "—"} className="capitalize" />
            <Row k="Moneda" v={cuenta.moneda ?? "MXN"} />
            <Row
              k="Estado"
              v={cuenta.activa ? "Activa" : "Inactiva"}
            />
          </dl>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-[13.5px] font-semibold">Empresa titular</h2>
          <dl className="space-y-2 text-[13px]">
            <Row k="Razón social" v={empresa?.razon_social} />
            <Row k="Nombre comercial" v={empresa?.nombre_comercial ?? "—"} />
            <Row
              k="RFC"
              v={
                <code className="font-mono text-[11px]">
                  {empresa?.rfc ?? "—"}
                </code>
              }
            />
          </dl>
        </section>

        <section className="rounded-md border border-border bg-card p-5 shadow-xs">
          <h2 className="mb-3 text-[13.5px] font-semibold">
            Conciliación rápida
          </h2>
          <Stat
            label="% conciliación del mes"
            value={`${pctConciliacion.toFixed(0)}%`}
            sub={`${conciliadosMes}/${movs.length} movs`}
            mono
          />
          <p className="mt-3 text-[12px] text-ink-3">
            Pendientes:{" "}
            <strong>{movs.filter((m) => !m.conciliado).length}</strong>{" "}
            movimientos sin vincular a CFDI u OC.
          </p>
          <Link
            href={`/finanzas/tesoreria/cuentas/${params.id}?mes=${mesParam}&estado=pendientes`}
            className="mt-2 inline-block text-[12px] text-brand hover:underline"
          >
            Ver pendientes →
          </Link>
        </section>
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  className,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-ink-3">{k}</dt>
      <dd className={`font-medium ${className ?? ""}`}>{v}</dd>
    </div>
  );
}
