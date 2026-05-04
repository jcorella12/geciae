import { CheckCircle2, FileText, FolderArchive } from "lucide-react";
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

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPOS_DOC_LABELS: Record<string, string> = {
  balance_general: "Balance General",
  estado_resultados: "Estado de Resultados",
  balanza: "Balanza de Comprobación",
  flujo_efectivo: "Flujo de Efectivo",
  anexos_ingresos: "Anexos Ingresos",
  anexos_egresos: "Anexos Egresos",
  conciliacion_iva: "Conciliación IVA",
  iva_trasladado: "IVA Trasladado",
  iva_acreditable: "IVA Acreditable",
  subsidio: "Subsidio",
  impuestos_por_pagar: "Impuestos por Pagar",
  bancos: "Movs. Bancos",
  polizas: "Diarios y Pólizas",
};

type SearchParams = {
  empresa?: string;
  anio?: string;
};

export default async function EstadosFinancierosPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const supabase = createClient();
  await obtenerVinculos();

  const sp = searchParams ?? {};
  const empresaId = sp.empresa ?? "";
  const anio = sp.anio ? parseInt(sp.anio, 10) : null;

  let query = supabase
    .from("v_estados_financieros_lista")
    .select("*")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });

  if (empresaId) query = query.eq("empresa_id", empresaId);
  if (anio) query = query.eq("anio", anio);

  const { data, error } = await query;
  const lista = (data ?? []) as Array<Record<string, unknown>>;

  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, nombre_comercial, razon_social")
    .eq("activa", true)
    .order("codigo");

  const completos = lista.filter((r) => r.paquete_completo).length;
  const firmados = lista.filter((r) => r.firmados).length;
  const totalPDFs = lista.reduce(
    (a, r) => a + Number(r.num_documentos ?? 0),
    0,
  );

  // Años distintos para el filtro
  const aniosUnicos = Array.from(
    new Set(lista.map((r) => r.anio as number)),
  ).sort((a, b) => b - a);

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="lbl-mini">Administración y Finanzas</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            Estados financieros mensuales
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Paquetes contables del despacho — balance general, estado de
            resultados, balanza, flujo, IVA, pólizas. Subidos por mes y empresa.
          </p>
        </div>
        <Link
          href="/finanzas/estados-financieros/nuevo"
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12.5px] font-medium text-brand-fg hover:opacity-90"
        >
          + Nuevo paquete
        </Link>
      </div>

      <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Paquetes mensuales"
          value={String(lista.length)}
          sub={`${aniosUnicos.length} ${aniosUnicos.length === 1 ? "año" : "años"}`}
        />
        <KpiCard
          label="Paquetes completos"
          value={String(completos)}
          sub={`${lista.length === 0 ? "0" : Math.round((completos / lista.length) * 100)}% con los 13 documentos`}
          accent={completos === lista.length && lista.length > 0 ? "ok" : "warn"}
        />
        <KpiCard
          label="Firmados por despacho"
          value={String(firmados)}
          sub={`${lista.length === 0 ? "0" : Math.round((firmados / lista.length) * 100)}%`}
        />
        <KpiCard
          label="PDFs almacenados"
          value={totalPDFs.toLocaleString("es-MX")}
        />
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3 shadow-xs">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3 mr-2">
          Filtrar
        </span>
        <Link
          href="/finanzas/estados-financieros"
          className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!empresaId ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
        >
          Todas
        </Link>
        {(empresas ?? []).map((e) => (
          <Link
            key={e.id}
            href={`/finanzas/estados-financieros?empresa=${e.id}${anio ? `&anio=${anio}` : ""}`}
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

        {aniosUnicos.length > 0 && (
          <>
            <span className="ml-3 text-ink-5">·</span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Año
            </span>
            <Link
              href={
                empresaId
                  ? `/finanzas/estados-financieros?empresa=${empresaId}`
                  : `/finanzas/estados-financieros`
              }
              className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${!anio ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
            >
              Todos
            </Link>
            {aniosUnicos.map((a) => (
              <Link
                key={a}
                href={`/finanzas/estados-financieros?anio=${a}${empresaId ? `&empresa=${empresaId}` : ""}`}
                className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${anio === a ? "bg-brand text-brand-fg" : "bg-bg-2 text-ink-2 hover:bg-bg-3"}`}
              >
                {a}
              </Link>
            ))}
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-ink-3">
          <FolderArchive className="mx-auto mb-3 h-6 w-6 text-ink-4" />
          <p>Sin paquetes mensuales aún.</p>
          <p className="mt-1 text-[12px]">
            Sube los ZIP del despacho a través del importador o usa{" "}
            <code className="font-mono text-[11px]">
              scripts/upload_estados_financieros.py
            </code>
            .
          </p>
        </div>
      ) : (
        <TableSurface>
          <Table>
            <TableHeader>
              <TableRow interactive={false}>
                <TableHead>Empresa</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead align="right">PDFs</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead align="right">Utilidad neta</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((r) => {
                const codigo = r.empresa_codigo as string;
                const docs = (r.documentos ?? {}) as Record<string, string>;
                const docKeys = Object.keys(docs);
                const tieneCompleto = r.paquete_completo as boolean;
                const tieneFirma = r.firmados as boolean;
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
                      <p className="font-medium">
                        {MESES[(r.mes as number) - 1]} {r.anio as number}
                      </p>
                    </TableCell>
                    <TableCell align="right" mono>
                      {r.num_documentos as number}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {docKeys.slice(0, 6).map((k) => (
                          <span
                            key={k}
                            className="rounded bg-bg-2 px-1.5 py-0.5 text-[10px] font-medium text-ink-2"
                            title={TIPOS_DOC_LABELS[k] ?? k}
                          >
                            {TIPOS_DOC_LABELS[k] ?? k}
                          </span>
                        ))}
                        {docKeys.length > 6 && (
                          <span className="rounded bg-bg-2 px-1.5 py-0.5 text-[10px] text-ink-3">
                            +{docKeys.length - 6}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell align="right" mono className="text-xs">
                      {r.utilidad_neta != null
                        ? fmtMxn.format(Number(r.utilidad_neta))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {tieneCompleto ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Completo
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Parcial
                          </span>
                        )}
                        {tieneFirma && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                            Firmado
                          </span>
                        )}
                        <Link
                          href={`/finanzas/estados-financieros/${r.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] hover:bg-bg-2"
                        >
                          <FileText className="h-2.5 w-2.5" />
                          Ver
                        </Link>
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
  );
}
