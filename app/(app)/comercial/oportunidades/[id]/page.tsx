import { Pencil, Plus, Trophy } from "lucide-react";
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
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  COLOR_ESTADO_OPORTUNIDAD,
  ETIQUETA_ACTIVIDAD,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_FUENTE,
  type EstadoOportunidad,
  type FuenteOportunidad,
  type TipoActividadComercial,
  valorPonderado,
} from "@/lib/oportunidades/state";
import { createClient } from "@/lib/supabase/server";

import { ActividadForm } from "./actividad-form";
import { ConvertirClienteButton } from "./convertir-cliente-button";
import { OportunidadAcciones } from "./oportunidad-acciones";

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

export default async function OportunidadDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: op } = await supabase
    .from("oportunidades")
    .select(
      "id, empresa_id, cliente_id, vendedor_id, nombre, descripcion, estado, monto_estimado, probabilidad, fuente, fecha_proxima_accion, proxima_accion, fecha_cierre_estimada, fecha_cierre_real, motivo_perdida, observaciones, created_at, empresas(codigo, razon_social), clientes(razon_social, rfc, nombre_comercial)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!op) notFound();

  const puedeEditar =
    esCEO(v) ||
    tieneAtributo(v, "vendedor") ||
    esRolEn(v, op.empresa_id, ["director", "operativo"]);

  // Actividades
  const { data: actividades } = await supabase
    .from("actividades_comerciales")
    .select(
      "id, tipo, fecha, duracion_minutos, participantes, notas, resultado, capturado_por, created_at",
    )
    .eq("oportunidad_id", params.id)
    .order("fecha", { ascending: false });

  // Cotizaciones vinculadas
  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("id, numero, version, fecha_emision, total, estado")
    .eq("oportunidad_id", params.id)
    .order("created_at", { ascending: false });

  const empresa = op.empresas as
    | { codigo: string; razon_social: string }
    | null;
  const cliente = op.clientes as
    | { razon_social: string; rfc: string | null; nombre_comercial: string | null }
    | null;
  const estado = op.estado as EstadoOportunidad;
  const esTerminal = ["ganado", "perdido"].includes(estado);

  // Sprint 2.2: si el cliente sigue como potencial (rfc null), permitir convertirlo
  // a formal. Heurística: rfc IS NULL ⇔ es_potencial (constraint de BD).
  const clienteEsPotencial = cliente !== null && cliente.rfc === null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link
          href="/comercial/oportunidades"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Pipeline
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
                {op.nombre as string}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${COLOR_ESTADO_OPORTUNIDAD[estado]}`}
              >
                {ETIQUETA_ESTADO_OPORTUNIDAD[estado]}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {empresa && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                        empresaCodigoColor[empresa.codigo] ??
                        "bg-muted-foreground"
                      }`}
                    />
                    {empresa.razon_social}
                  </span>
                  <span className="mx-2 text-ink-5">→</span>
                </>
              )}
              {cliente?.nombre_comercial ?? cliente?.razon_social ?? "Sin cliente"}
              {cliente?.rfc && (
                <code className="ml-2 font-mono text-[11px] text-ink-3">
                  {cliente.rfc}
                </code>
              )}
              {clienteEsPotencial && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10.5px] font-medium text-amber-800">
                  Potencial · sin RFC
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {puedeEditar && !esTerminal && (
              <Link
                href={`/comercial/oportunidades/${params.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-bg-2"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <Stat
          label="Monto estimado"
          value={
            op.monto_estimado != null
              ? fmtMxn.format(Number(op.monto_estimado))
              : "—"
          }
        />
        <Stat
          label="Probabilidad"
          value={
            op.probabilidad != null
              ? `${Math.round(Number(op.probabilidad) * 100)}%`
              : "—"
          }
        />
        <Stat
          label="Valor ponderado"
          value={fmtMxn.format(
            valorPonderado(
              op.monto_estimado as number | null,
              op.probabilidad as number | null,
            ),
          )}
          color="var(--brand)"
        />
        <Stat
          label="Cierre estimado"
          value={
            op.fecha_cierre_estimada
              ? new Date(
                  op.fecha_cierre_estimada as string,
                ).toLocaleDateString("es-MX")
              : "—"
          }
        />
      </div>

      {/* Acciones de workflow */}
      {!esTerminal && (
        <div className="mb-6">
          <OportunidadAcciones
            oportunidadId={params.id}
            estado={estado}
            puedeEditar={puedeEditar}
          />
        </div>
      )}

      {/* Detalles + próxima acción */}
      <section className="mb-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Detalles</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {op.fuente && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Fuente
              </dt>
              <dd className="mt-0.5">
                {ETIQUETA_FUENTE[op.fuente as FuenteOportunidad] ??
                  (op.fuente as string)}
              </dd>
            </div>
          )}
          {op.fecha_proxima_accion && (
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Próxima acción
              </dt>
              <dd className="mt-0.5">
                <strong>
                  {new Date(
                    op.fecha_proxima_accion as string,
                  ).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </strong>
                {op.proxima_accion && (
                  <span className="ml-2 text-ink-3">
                    · {op.proxima_accion as string}
                  </span>
                )}
              </dd>
            </div>
          )}
          {op.descripcion && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Descripción
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap">
                {op.descripcion as string}
              </dd>
            </div>
          )}
          {op.observaciones && (
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-ink-3">
                Observaciones
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap">
                {op.observaciones as string}
              </dd>
            </div>
          )}
          {estado === "perdido" && op.motivo_perdida && (
            <div className="col-span-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <dt className="text-[11px] uppercase tracking-wider text-destructive">
                Motivo de pérdida
              </dt>
              <dd className="mt-0.5 text-destructive">
                {op.motivo_perdida as string}
              </dd>
            </div>
          )}
          {estado === "ganado" && op.fecha_cierre_real && (
            <div className="col-span-2 inline-flex items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-50 p-3">
              <Trophy className="h-4 w-4 text-emerald-700" />
              <span className="text-emerald-900">
                Ganada el{" "}
                {new Date(
                  op.fecha_cierre_real as string,
                ).toLocaleDateString("es-MX")}
              </span>
            </div>
          )}
          {/* Sprint 2.2: si oportunidad ganada y cliente sigue potencial,
              ofrecer convertirlo a formal antes de poder timbrar CFDI. */}
          {estado === "ganado" &&
            clienteEsPotencial &&
            puedeEditar && (
              <div className="col-span-2 flex items-center justify-between gap-3 rounded-md border border-amber-300/40 bg-amber-50 p-3">
                <div>
                  <p className="text-[12.5px] font-medium text-amber-900">
                    Cliente todavía es potencial
                  </p>
                  <p className="text-[11.5px] text-amber-800">
                    Para timbrar CFDI necesitas convertirlo a cliente formal
                    (RFC, régimen, CP fiscal).
                  </p>
                </div>
                <ConvertirClienteButton
                  clienteId={op.cliente_id as string}
                  clienteNombre={
                    cliente?.nombre_comercial ?? cliente?.razon_social ?? ""
                  }
                />
              </div>
            )}
        </dl>
      </section>

      {/* Cotizaciones vinculadas */}
      {(cotizaciones ?? []).length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-base font-semibold">
            Cotizaciones vinculadas ({cotizaciones?.length ?? 0})
          </h2>
          <TableSurface>
            <Table>
              <TableHeader>
                <TableRow interactive={false}>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead align="right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(cotizaciones ?? []).map((c) => (
                  <TableRow key={c.id as string}>
                    <TableCell className="font-mono">
                      <Link
                        href={`/comercial/cotizaciones/${c.id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {c.numero as string}
                        {(c.version as number) > 1 && (
                          <span className="ml-1 text-[10px] text-ink-3">
                            v{c.version as number}
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs text-ink-3">
                      {new Date(
                        c.fecha_emision as string,
                      ).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell align="right" mono>
                      {fmtMxn.format(Number(c.total ?? 0))}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.estado as string}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableSurface>
          {!esTerminal && estado === "negociacion" && (
            <div className="mt-3 text-right">
              <Link
                href={`/comercial/cotizaciones/nueva?oportunidad=${params.id}`}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1 text-sm hover:bg-bg-2"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva cotización
              </Link>
            </div>
          )}
        </section>
      )}
      {(cotizaciones ?? []).length === 0 && !esTerminal && puedeEditar && (
        <div className="mb-6 rounded-md border border-dashed border-border bg-card p-6 text-center">
          <p className="text-sm text-ink-3">Aún sin cotización para esta oportunidad.</p>
          <Link
            href={`/comercial/cotizaciones/nueva?oportunidad=${params.id}`}
            className="mt-2 inline-flex items-center gap-1 text-brand hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Crear cotización vinculada
          </Link>
        </div>
      )}

      {/* Timeline actividades */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Actividades ({actividades?.length ?? 0})
          </h2>
        </div>

        {puedeEditar && (
          <div className="mb-4 rounded-lg border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-2 text-sm font-medium">Registrar actividad</h3>
            <ActividadForm
              oportunidadId={params.id}
              clienteId={op.cliente_id as string}
            />
          </div>
        )}

        {(actividades ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-ink-3">
            Sin actividades registradas. Captura llamadas, reuniones, correos
            etc. para mantener el historial.
          </p>
        ) : (
          <ol className="space-y-3 border-l-2 border-border pl-6">
            {(actividades ?? []).map((a) => {
              const tipo = a.tipo as TipoActividadComercial;
              const fecha = new Date(a.fecha as string);
              return (
                <li key={a.id as string} className="relative">
                  <span className="absolute -left-[31px] top-1 inline-block h-3 w-3 rounded-full border-2 border-white bg-brand" />
                  <div className="rounded-md border border-border bg-card p-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium">
                        {ETIQUETA_ACTIVIDAD[tipo] ?? (tipo as string)}
                      </span>
                      <span className="text-[11px] text-ink-3">
                        {fecha.toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        {fecha.toLocaleTimeString("es-MX", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {a.participantes && (
                      <p className="mt-1 text-[11px] text-ink-3">
                        Participantes: {a.participantes as string}
                      </p>
                    )}
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px]">
                      {a.notas as string}
                    </p>
                    {a.resultado && (
                      <p className="mt-1.5 text-[11.5px]">
                        <span className="text-ink-3">Resultado:</span>{" "}
                        <span className="font-medium">
                          {a.resultado as string}
                        </span>
                      </p>
                    )}
                    {a.duracion_minutos != null && (
                      <p className="mt-1 text-[10.5px] text-ink-4">
                        Duración: {a.duracion_minutos as number} min
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
