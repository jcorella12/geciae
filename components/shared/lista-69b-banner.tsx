import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import {
  esCEO,
  obtenerVinculos,
  tieneAtributo,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

/**
 * Banner que muestra el estado de la lista 69-B SAT.
 *
 * Política GECIAE: refrescar cada 6 meses (180 días).
 *
 * - Verde si está dentro de los 180 días.
 * - Ámbar si pasaron > 180 días.
 * - Rojo si pasaron > 365 días (no se ha actualizado en más de un año).
 *
 * Solo visible para CEO, tesorero, aprobador financiero o contralor.
 * Si nunca se ha cargado, muestra mensaje azul invitando a importarla.
 */
export async function Lista69bBanner() {
  const v = await obtenerVinculos();
  const visible =
    esCEO(v) ||
    tieneAtributo(v, "tesorero_corporativo") ||
    tieneAtributo(v, "aprobador_financiero") ||
    tieneAtributo(v, "contralor");
  if (!visible) return null;

  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supaAny = supabase as any;
  const { data } = (await supaAny
    .from("lista_69b_meta")
    .select(
      "ultima_actualizacion, total_rfcs, total_definitivos, total_presuntos, matches_clientes, matches_proveedores",
    )
    .eq("id", 1)
    .maybeSingle()) as unknown as {
    data: {
      ultima_actualizacion: string;
      total_rfcs: number;
      total_definitivos: number | null;
      total_presuntos: number | null;
      matches_clientes: number | null;
      matches_proveedores: number | null;
    } | null;
  };

  if (!data) {
    return (
      <div className="mb-4 flex items-start gap-3 rounded-md border border-blue-300 bg-blue-50 px-4 py-2.5">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
        <div className="flex-1 text-[12.5px]">
          <p className="font-medium text-blue-900">
            Lista 69-B SAT no importada
          </p>
          <p className="mt-0.5 text-blue-800">
            Aún no se ha cargado el listado de contribuyentes con operaciones
            inexistentes. Descárgalo del SAT y corre{" "}
            <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px]">
              scripts/flagear_lista_69b.py
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  const hoy = new Date();
  const ultimoDate = new Date(data.ultima_actualizacion);
  const dias = Math.round(
    (hoy.getTime() - ultimoDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const proxima = new Date(ultimoDate);
  proxima.setMonth(proxima.getMonth() + 6);

  // Estado por antigüedad
  const estado: "ok" | "warn" | "danger" =
    dias < 180 ? "ok" : dias < 365 ? "warn" : "danger";

  if (estado === "ok") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-[12px]">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
        <p className="text-emerald-900">
          <span className="font-medium">Lista 69-B vigente.</span> Actualizada
          hace {dias} día{dias === 1 ? "" : "s"} ·{" "}
          {data.total_rfcs.toLocaleString("es-MX")} RFCs ·{" "}
          {data.total_definitivos ?? 0} definitivos. Próxima revisión:{" "}
          {proxima.toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
      </div>
    );
  }

  const palette =
    estado === "warn"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-red-300 bg-red-50 text-red-900";
  const icon =
    estado === "warn" ? (
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
    ) : (
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
    );

  return (
    <div className={`mb-4 flex items-start gap-3 rounded-md border px-4 py-2.5 ${palette}`}>
      {icon}
      <div className="flex-1 text-[12.5px]">
        <p className="font-medium">
          Lista 69-B desactualizada · hace {dias} días
        </p>
        <p className="mt-0.5 opacity-90">
          La política del grupo es revisar la lista cada 6 meses. Descarga el
          listado más reciente desde{" "}
          <a
            href="https://www.gob.mx/sat/acciones-y-programas/notificacion-a-contribuyentes-con-operaciones-presuntamente-inexistentes-y-listados-definitivos-333336"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline"
          >
            sat.gob.mx
          </a>{" "}
          y corre{" "}
          <code className="rounded bg-white/60 px-1 py-0.5 font-mono text-[11px]">
            scripts/flagear_lista_69b.py
          </code>
          .
        </p>
      </div>
    </div>
  );
}
