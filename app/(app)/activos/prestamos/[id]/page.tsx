import Link from "next/link";
import { notFound } from "next/navigation";

import { Stat } from "@/components/ui/stat";
import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { PrestamoActions } from "./prestamo-actions";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const ESTADO_LABEL: Record<string, string> = {
  solicitado: "Solicitado",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  recogido: "Recogido (en uso)",
  devuelto: "Devuelto",
  facturado: "Facturado",
  cancelado: "Cancelado",
};

const ESTADO_COLOR: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-800",
  aprobado: "bg-blue-100 text-blue-800",
  rechazado: "bg-red-100 text-red-800",
  recogido: "bg-violet-100 text-violet-800",
  devuelto: "bg-emerald-100 text-emerald-800",
  facturado: "bg-emerald-200 text-emerald-900",
  cancelado: "bg-gray-100 text-gray-700",
};

export default async function PrestamoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: p } = (await supabase
    .from("v_prestamos_activos_enriquecido" as never)
    .select("*")
    .eq("id", params.id)
    .maybeSingle()) as unknown as {
    data: {
      id: string;
      numero: string;
      activo_id: string;
      activo_codigo: string;
      activo_nombre: string;
      empresa_solicitante_id: string;
      empresa_solicitante_codigo: string;
      empresa_propietaria_id: string;
      empresa_propietaria_codigo: string;
      solicitante_id: string;
      motivo: string;
      fecha_recogida_prevista: string;
      fecha_devolucion_prevista: string;
      fecha_recogida_real: string | null;
      fecha_devolucion_real: string | null;
      estado: string;
      tarifa_aplicada: number | null;
      uso_estimado: number | null;
      uso_real: number | null;
      costo_total: number | null;
      observaciones_aprobacion: string | null;
      estado_inicial_descripcion: string | null;
      estado_final_descripcion: string | null;
      daños_reportados: string | null;
      requiere_mantenimiento: boolean;
      requiere_calibracion: boolean;
      observaciones: string | null;
      unidad_uso: string;
      dias_retraso: number | null;
    } | null;
  };
  if (!p) notFound();

  const esSolicitante = user?.id === p.solicitante_id;
  const esCEO = v.some((vi) => vi.rol === "ceo");
  const esAprobador =
    esCEO ||
    v.some(
      (vi) =>
        vi.empresa_id === p.empresa_propietaria_id &&
        (vi.rol === "director" || (vi.atributos ?? []).includes("contralor")),
    );

  const { data: log } = (await supabase
    .from("prestamo_estados_log" as never)
    .select("estado_anterior, estado_nuevo, observaciones, created_at")
    .eq("prestamo_id", params.id)
    .order("created_at", { ascending: true })) as unknown as {
    data: Array<{
      estado_anterior: string | null;
      estado_nuevo: string;
      observaciones: string | null;
      created_at: string;
    }> | null;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Link href="/activos/prestamos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Préstamos
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="font-mono text-[20px] text-ink-3">{p.numero}</h1>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_COLOR[p.estado] ?? ""}`}>
            {ESTADO_LABEL[p.estado] ?? p.estado}
          </span>
          {(p.dias_retraso ?? 0) > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-800">
              +{p.dias_retraso} días retraso
            </span>
          )}
        </div>
        <h2 className="mt-2 text-2xl font-semibold leading-tight">{p.activo_nombre}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-mono">{p.activo_codigo}</span> · {p.empresa_propietaria_codigo} → {p.empresa_solicitante_codigo}
        </p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tarifa" value={`${fmtMxn.format(Number(p.tarifa_aplicada ?? 0))}/${p.unidad_uso}`} />
        <Stat
          label="Uso"
          value={`${p.uso_real ?? p.uso_estimado ?? 0} ${p.unidad_uso}${p.uso_real != null ? "" : " (est.)"}`}
        />
        <Stat label="Costo" value={fmtMxn.format(Number(p.costo_total ?? 0))} />
        <Stat label="Recogida" value={new Date(p.fecha_recogida_prevista).toLocaleDateString("es-MX")} />
      </div>

      <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="text-[13.5px] font-semibold">Motivo</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm">{p.motivo}</p>
      </section>

      <PrestamoActions
        prestamoId={p.id}
        estado={p.estado}
        esSolicitante={esSolicitante}
        esAprobador={esAprobador}
      />

      {/* Timeline */}
      <section className="mt-6 rounded-lg border border-border bg-card p-5 shadow-sm">
        <h3 className="text-[13.5px] font-semibold">Historial</h3>
        <ul className="mt-3 space-y-1.5 text-[12.5px]">
          {(log ?? []).map((l, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="font-mono text-ink-3">
                {new Date(l.created_at).toLocaleString("es-MX", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-ink-3">→</span>
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${ESTADO_COLOR[l.estado_nuevo] ?? ""}`}>
                {ESTADO_LABEL[l.estado_nuevo] ?? l.estado_nuevo}
              </span>
              {l.observaciones && (
                <span className="text-ink-2">— {l.observaciones}</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
