import { CheckCircle2, Download, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TIPOS_DOC: Array<{
  slug: string;
  label: string;
  orden: number;
  desc: string;
}> = [
  { slug: "balance_general", label: "Balance General", orden: 1, desc: "Posición financiera al cierre del mes" },
  { slug: "estado_resultados", label: "Estado de Resultados", orden: 2, desc: "Ingresos, costos, gastos y utilidad" },
  { slug: "balanza", label: "Balanza de Comprobación", orden: 3, desc: "Movimientos por cuenta" },
  { slug: "flujo_efectivo", label: "Flujo de Efectivo", orden: 4, desc: "Entradas y salidas de efectivo" },
  { slug: "anexos_ingresos", label: "Anexos del Catálogo Ingresos", orden: 5, desc: "Detalle por cuenta de ingreso" },
  { slug: "anexos_egresos", label: "Anexos del Catálogo Egresos", orden: 6, desc: "Detalle por cuenta de egreso" },
  { slug: "conciliacion_iva", label: "Conciliación de IVA", orden: 7, desc: "IVA contable vs fiscal" },
  { slug: "iva_trasladado", label: "Movs. IVA Trasladado", orden: 8, desc: "Movimientos auxiliares" },
  { slug: "iva_acreditable", label: "Movs. IVA Acreditable", orden: 9, desc: "Movimientos auxiliares" },
  { slug: "subsidio", label: "Movs. Subsidio", orden: 10, desc: "Subsidio al empleo" },
  { slug: "impuestos_por_pagar", label: "Movs. Impuestos por Pagar", orden: 11, desc: "Auxiliares fiscales" },
  { slug: "bancos", label: "Movs. del Catálogo (Bancos)", orden: 12, desc: "Auxiliares de bancos" },
  { slug: "polizas", label: "Diarios y Pólizas", orden: 13, desc: "Pólizas del periodo" },
];

export default async function EstadoFinancieroDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  await obtenerVinculos();

  // La tabla/vista es nueva — cast minimo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supa = supabase as any;

  const { data: ef } = await supa
    .from("v_estados_financieros_lista")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!ef) notFound();

  const documentos = (ef.documentos ?? {}) as Record<string, string>;
  const empresa_codigo = ef.empresa_codigo as string;
  const anio = ef.anio as number;
  const mes = ef.mes as number;
  const num_documentos = ef.num_documentos as number;
  const paquete_completo = ef.paquete_completo as boolean;
  const firmados = ef.firmados as boolean;
  const utilidad_neta = ef.utilidad_neta as number | null;
  const ingresos_totales = ef.ingresos_totales as number | null;
  const egresos_totales = ef.egresos_totales as number | null;

  // Generar URLs firmadas para cada doc (1 hr)
  const docsConUrl = await Promise.all(
    Object.entries(documentos).map(async ([slug, path]) => {
      const { data } = await supa.storage
        .from("estados-financieros")
        .createSignedUrl(path as string, 60 * 60);
      return { slug, path: path as string, url: data?.signedUrl };
    }),
  );
  const urlMap = Object.fromEntries(
    docsConUrl.map((d) => [d.slug, d.url]),
  ) as Record<string, string | undefined>;

  // Otros (slug que no está en TIPOS_DOC)
  const otrosSlugs = Object.keys(documentos).filter(
    (s) => !TIPOS_DOC.some((t) => t.slug === s),
  );

  return (
    <div className="mx-auto w-full max-w-[1200px] px-8 py-7">
      <div className="mb-6">
        <Link
          href="/finanzas/estados-financieros"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Estados financieros
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">
            {MESES[mes - 1]} {anio}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-2 py-0.5 text-[11px] font-medium">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                empresaCodigoColor[empresa_codigo] ?? "bg-muted-foreground"
              }`}
            />
            {empresa_codigo}
          </span>
          {paquete_completo ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Paquete completo
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
              Paquete parcial ({num_documentos} de 13)
            </span>
          )}
          {firmados && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
              Firmado por despacho
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {ef.empresa_razon_social as string}
        </p>
      </div>

      {/* KPIs si están */}
      {(utilidad_neta != null ||
        ingresos_totales != null ||
        egresos_totales != null) && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          <Stat
            label="Ingresos totales"
            value={
              ingresos_totales != null
                ? fmtMxn.format(ingresos_totales)
                : "—"
            }
          />
          <Stat
            label="Egresos totales"
            value={
              egresos_totales != null
                ? fmtMxn.format(egresos_totales)
                : "—"
            }
          />
          <Stat
            label="Utilidad neta"
            value={
              utilidad_neta != null ? fmtMxn.format(utilidad_neta) : "—"
            }
            color={
              utilidad_neta != null && utilidad_neta < 0
                ? "var(--destructive)"
                : "var(--success)"
            }
          />
        </div>
      )}

      <h2 className="mb-3 text-base font-semibold">
        Documentos del paquete ({num_documentos})
      </h2>

      <TableSurface>
        <Table>
          <TableHeader>
            <TableRow interactive={false}>
              <TableHead>#</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {TIPOS_DOC.map((t) => {
              const presente = documentos[t.slug];
              const url = urlMap[t.slug];
              return (
                <TableRow key={t.slug}>
                  <TableCell className="font-mono text-xs text-ink-3">
                    {t.orden}
                  </TableCell>
                  <TableCell>
                    <p
                      className={
                        presente ? "font-medium" : "text-ink-4"
                      }
                    >
                      {t.label}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-ink-3">
                    {t.desc}
                  </TableCell>
                  <TableCell align="right">
                    {presente && url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] hover:bg-bg-2"
                      >
                        <FileText className="h-2.5 w-2.5" />
                        Abrir
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-4">
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {otrosSlugs.map((slug) => {
              const url = urlMap[slug];
              return (
                <TableRow key={slug}>
                  <TableCell className="text-xs text-ink-3">·</TableCell>
                  <TableCell>
                    <p className="font-mono text-xs">{slug}</p>
                  </TableCell>
                  <TableCell className="text-xs text-ink-3">
                    Documento adicional
                  </TableCell>
                  <TableCell align="right">
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-0.5 text-[11px] hover:bg-bg-2"
                      >
                        <Download className="h-2.5 w-2.5" />
                        Abrir
                      </a>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableSurface>
    </div>
  );
}
