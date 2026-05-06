import Link from "next/link";
import { notFound } from "next/navigation";

import { Stat } from "@/components/ui/stat";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import {
  COLOR_ALERTA,
  COLOR_ESTADO_ACTIVO,
  ETIQUETA_ALERTA,
  ETIQUETA_ESTADO_ACTIVO,
  ETIQUETA_TIPO_ACTIVO_GRUPO,
  ETIQUETA_UNIDAD,
  type ActivoEnriquecido,
} from "@/lib/activos-compartidos/state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const fmtFecha = (d: string | null) =>
  !d
    ? "—"
    : new Date(d).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

export default async function ActivoDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const v = await obtenerVinculos();

  const { data: a } = (await supabase
    .from("v_activos_grupo_enriquecido" as never)
    .select("*")
    .eq("id", params.id)
    .maybeSingle()) as unknown as { data: ActivoEnriquecido | null };
  if (!a) notFound();

  const puedeEditar =
    esCEO(v) ||
    esRolEn(v, a.empresa_propietaria_id, ["director"]) ||
    v.some(
      (vi) =>
        vi.empresa_id === a.empresa_propietaria_id &&
        
        (vi.atributos ?? []).includes("contralor"),
    );

  const { data: costos } = (await supabase
    .from("activos_grupo_costos_anuales" as never)
    .select("*")
    .eq("activo_id", params.id)
    .order("anio", { ascending: false })) as unknown as {
    data: Array<{
      id: string;
      anio: number;
      depreciacion: number | null;
      mantenimiento: number | null;
      calibraciones: number | null;
      seguro: number | null;
      refacciones: number | null;
      otros: number | null;
      costo_total: number | null;
    }> | null;
  };

  const { data: docs } = (await supabase
    .from("activos_grupo_documentos" as never)
    .select("*")
    .eq("activo_id", params.id)
    .order("created_at", { ascending: false })) as unknown as {
    data: Array<{
      id: string;
      tipo_documento: string;
      nombre: string;
      url: string;
      fecha_documento: string | null;
      vencimiento: string | null;
    }> | null;
  };

  // Depreciación acumulada (años transcurridos × dep anual)
  const aniosTranscurridos = Math.min(
    a.vida_util_anios,
    Math.floor(
      (Date.now() - new Date(a.fecha_adquisicion).getTime()) /
        (1000 * 60 * 60 * 24 * 365),
    ),
  );
  const depAnual = (a.costo_adquisicion * (1 - a.valor_residual_pct / 100)) / a.vida_util_anios;
  const depAcum = depAnual * aniosTranscurridos;
  const valorEnLibros = a.costo_adquisicion - depAcum;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-6">
        <Link href="/activos/compartidos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Activos compartidos
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[18px] text-ink-3">{a.codigo}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ESTADO_ACTIVO[a.estado]}`}
              >
                {ETIQUETA_ESTADO_ACTIVO[a.estado]}
              </span>
              {a.alerta !== "ok" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${COLOR_ALERTA[a.alerta]}`}
                >
                  {ETIQUETA_ALERTA[a.alerta]}
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">{a.nombre}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {ETIQUETA_TIPO_ACTIVO_GRUPO[a.tipo]}
              {a.marca && ` · ${[a.marca, a.modelo].filter(Boolean).join(" ")}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label={`Tarifa /${ETIQUETA_UNIDAD[a.unidad_uso]}`}
          value={fmtMxn.format(Number(a.tarifa_vigente ?? 0))}
        />
        <Stat label="Costo adquisición" value={fmtMxn.format(a.costo_adquisicion)} />
        <Stat label="Depreciación acum." value={fmtMxn.format(depAcum)} />
        <Stat label="Valor en libros" value={fmtMxn.format(valorEnLibros)} />
      </div>

      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Datos</h2>
        <dl className="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
          <Field label="Propietaria" value={a.empresa_propietaria_codigo ?? "—"} />
          <Field label="Ubicación actual" value={a.ubicacion_actual_codigo ?? a.empresa_propietaria_codigo ?? "—"} />
          <Field label="Núm. serie" value={a.numero_serie ?? "—"} mono />
          <Field label="Año fabricación" value={a.anio_fabricacion?.toString() ?? "—"} />
          <Field label="Capacidad" value={a.capacidad ?? "—"} />
          <Field label="Vida útil" value={`${a.vida_util_anios} años`} />
          <Field label="Adquirido" value={fmtFecha(a.fecha_adquisicion)} />
          <Field label="Próximo mantto." value={fmtFecha(a.fecha_proximo_mantenimiento)} />
          <Field label="Próxima calibración" value={fmtFecha(a.fecha_proxima_calibracion)} />
          <Field label="Vence seguro" value={fmtFecha(a.vigencia_seguro_hasta)} />
        </dl>
      </section>

      {/* Costos anuales */}
      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Costos anuales</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="border-b text-left">
              <tr>
                <th className="px-2 py-1 font-medium">Año</th>
                <th className="px-2 py-1 text-right font-medium">Depreciación</th>
                <th className="px-2 py-1 text-right font-medium">Mantto.</th>
                <th className="px-2 py-1 text-right font-medium">Calibración</th>
                <th className="px-2 py-1 text-right font-medium">Seguro</th>
                <th className="px-2 py-1 text-right font-medium">Otros</th>
                <th className="px-2 py-1 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(costos ?? []).length === 0 ? (
                <tr><td colSpan={7} className="py-4 text-center text-ink-3">Sin costos registrados.</td></tr>
              ) : (
                (costos ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="px-2 py-1 font-mono">{c.anio}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmtMxn.format(Number(c.depreciacion ?? 0))}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmtMxn.format(Number(c.mantenimiento ?? 0))}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmtMxn.format(Number(c.calibraciones ?? 0))}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmtMxn.format(Number(c.seguro ?? 0))}</td>
                    <td className="px-2 py-1 text-right font-mono">
                      {fmtMxn.format(Number(c.refacciones ?? 0) + Number(c.otros ?? 0))}
                    </td>
                    <td className="px-2 py-1 text-right font-mono font-semibold">
                      {fmtMxn.format(Number(c.costo_total ?? 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Documentos */}
      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-[13.5px] font-semibold">Documentos</h2>
        {(docs ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-ink-3">Sin documentos subidos.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-[12.5px]">
            {(docs ?? []).map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-2/40 px-3 py-2">
                <div>
                  <p className="font-medium">
                    {doc.nombre} <span className="text-ink-3">· {doc.tipo_documento}</span>
                  </p>
                  {doc.vencimiento && (
                    <p className="text-[10.5px] text-ink-3">Vence: {fmtFecha(doc.vencimiento)}</p>
                  )}
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-brand hover:underline"
                >
                  Abrir
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {a.observaciones && (
        <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-[13.5px] font-semibold">Observaciones</h2>
          <p className="mt-2 whitespace-pre-wrap text-[12.5px]">{a.observaciones}</p>
        </section>
      )}

      {puedeEditar && (
        <p className="text-[11px] text-ink-3">
          Editar: <Link className="text-brand hover:underline" href={`/activos/compartidos/${a.id}/editar`}>Modificar datos</Link>
        </p>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] uppercase tracking-wider text-ink-3">{label}</dt>
      <dd className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
