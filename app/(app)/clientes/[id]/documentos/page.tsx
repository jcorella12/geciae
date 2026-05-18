import { FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
        maximumFractionDigits: 0,
      }).format(n);

const fmtFecha = (s: string | null) =>
  s
    ? new Date(s).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-secondary text-ink-2",
  en_firma: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  firmado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  vencido: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  rescindido: "bg-destructive/15 text-destructive",
};

const TIPO_LABEL: Record<string, string> = {
  servicios_solar: "Servicios solar",
  electrico: "Eléctrico",
  mantenimiento: "Mantenimiento",
  suministro: "Suministro",
  otro: "Otro",
};

export default async function ClienteDocumentosPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: contratos } = await supabase
    .from("contratos_cliente")
    .select(
      "id, numero, tipo, fecha_firma, fecha_inicio, fecha_fin, monto_total, estado, url_pdf_firmado, observaciones, empresa_id, empresas(codigo, nombre_comercial), proyecto_id, proyectos(codigo, nombre)",
    )
    .eq("cliente_id", params.id)
    .order("fecha_firma", { ascending: false, nullsFirst: false });

  const lista = (contratos ?? []) as Array<{
    id: string;
    numero: string;
    tipo: string;
    fecha_firma: string | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    monto_total: number | null;
    estado: string | null;
    url_pdf_firmado: string | null;
    observaciones: string | null;
    empresa_id: string;
    empresas: { codigo: string; nombre_comercial: string | null } | null;
    proyecto_id: string | null;
    proyectos: { codigo: string; nombre: string } | null;
  }>;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Documentos del cliente</h2>
        <p className="text-xs text-muted-foreground">
          Contratos firmados, prórrogas y acuerdos. Los contratos se generan
          desde la ficha del proyecto cuando se acepta la cotización.
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Sin contratos. Cuando aceptes una cotización y conviertas a proyecto,
          el contrato firmado se vinculará automáticamente a este cliente.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {lista.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4 text-ink-3" />
                  <code className="font-mono text-sm font-medium">
                    {c.numero}
                  </code>
                  {c.estado && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10.5px] font-medium capitalize ${
                        ESTADO_BADGE[c.estado] ?? "bg-secondary"
                      }`}
                    >
                      {c.estado.replace("_", " ")}
                    </span>
                  )}
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] text-ink-3">
                    {TIPO_LABEL[c.tipo] ?? c.tipo}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {c.empresas && (
                    <span>
                      Empresa:{" "}
                      <span className="font-medium text-ink-2">
                        {c.empresas.nombre_comercial ?? c.empresas.codigo}
                      </span>
                    </span>
                  )}
                  {c.proyectos && (
                    <Link
                      href={`/proyectos/${c.proyecto_id}`}
                      className="inline-flex items-center gap-1 hover:text-brand"
                    >
                      Proyecto:{" "}
                      <span className="font-mono">{c.proyectos.codigo}</span>{" "}
                      · {c.proyectos.nombre}
                    </Link>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-4 text-xs text-ink-2">
                  <span>
                    Firmado: <strong>{fmtFecha(c.fecha_firma)}</strong>
                  </span>
                  <span>
                    Vigencia:{" "}
                    <strong>
                      {fmtFecha(c.fecha_inicio)} → {fmtFecha(c.fecha_fin)}
                    </strong>
                  </span>
                  <span>
                    Monto: <strong>{fmtMxn(c.monto_total)}</strong>
                  </span>
                </div>
                {c.observaciones && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {c.observaciones}
                  </p>
                )}
              </div>
              {c.url_pdf_firmado && (
                <a
                  href={c.url_pdf_firmado}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-secondary/40"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver PDF
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
