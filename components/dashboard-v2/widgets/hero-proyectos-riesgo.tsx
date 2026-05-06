import { AlertTriangle } from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { fmtMxnCompact } from "./_utils";

type ProyectoRiesgoRow = {
  proyecto_id: string;
  codigo: string;
  nombre: string;
  empresa_id: string;
  ingreso_presupuestado: number | null;
  margen_neto: number | null;
  margen_objetivo_pct: number | null;
};

function clasificar(row: ProyectoRiesgoRow): "danger" | "warn" | "ok" {
  const ing = Number(row.ingreso_presupuestado ?? 0);
  const margen = Number(row.margen_neto ?? 0);
  const objetivo = Number(row.margen_objetivo_pct ?? 0);
  if (ing <= 0) return "ok";
  const pct = (margen / ing) * 100;
  if (objetivo > 0 && pct >= objetivo) return "ok";
  if (pct >= objetivo * 0.8) return "warn";
  return "danger";
}

async function fetchProyectosRiesgo(
  empresasFiltro: string[],
  pmUserId?: string,
): Promise<ProyectoRiesgoRow[]> {
  const supabase = createClient();
  void pmUserId; // si se pasa, podría usarse en una iteración futura

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select(
      "proyecto_id, codigo, nombre, empresa_id, ingreso_presupuestado, margen_neto, margen_objetivo_pct",
    )
    .in("empresa_id", empresasFiltro)
    .gt("ingreso_presupuestado", 0)
    .order("margen_neto", { ascending: true })
    .limit(20);

  const { data } = (await q) as unknown as { data: ProyectoRiesgoRow[] | null };
  return (data ?? []).filter((r) => clasificar(r) !== "ok").slice(0, 5);
}

export async function HeroProyectosRiesgo() {
  const v = await obtenerVinculos();
  const empresasUsuario = Array.from(new Set(v.map((x) => x.empresa_id)));
  const proyectos = await fetchProyectosRiesgo(empresasUsuario);

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-warn-deep" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Proyectos en riesgo
        </span>
      </div>
      {proyectos.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">
          ✓ Ningún proyecto en zona crítica
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {proyectos.map((p) => {
            const clase = clasificar(p);
            const ing = Number(p.ingreso_presupuestado ?? 0);
            const m = Number(p.margen_neto ?? 0);
            const pct = ing > 0 ? (m / ing) * 100 : 0;
            return (
              <li key={p.proyecto_id}>
                <Link
                  href={`/proyectos/${p.proyecto_id}/pnl`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-bg-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          clase === "danger"
                            ? "h-1.5 w-1.5 rounded-full bg-danger"
                            : "h-1.5 w-1.5 rounded-full bg-warn"
                        }
                      />
                      <span className="font-mono text-[10.5px] text-ink-3">{p.codigo}</span>
                      <span className="truncate text-[11.5px] font-medium">{p.nombre}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div
                      className={
                        m >= 0
                          ? "font-mono text-[11px] font-semibold tnum"
                          : "font-mono text-[11px] font-semibold tnum text-danger-deep"
                      }
                    >
                      {pct.toFixed(1)}%
                    </div>
                    <div className="font-mono text-[9.5px] text-ink-3">
                      {fmtMxnCompact.format(m)}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Variante: solo proyectos donde el usuario actual es PM. */
export async function MisProyectosRiesgo() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: misProy } = (await (supabase as any)
    .from("proyectos")
    .select("id")
    .eq("pm_id", user.id)) as unknown as { data: { id: string }[] | null };

  const proyectoIds = (misProy ?? []).map((p) => p.id);
  if (proyectoIds.length === 0) {
    return (
      <div className="text-[12px] text-ink-3">No tienes proyectos asignados como PM.</div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("v_proyecto_pnl_resumen")
    .select(
      "proyecto_id, codigo, nombre, empresa_id, ingreso_presupuestado, margen_neto, margen_objetivo_pct",
    )
    .in("proyecto_id", proyectoIds)
    .gt("ingreso_presupuestado", 0)) as unknown as { data: ProyectoRiesgoRow[] | null };

  const enRiesgo = (data ?? []).filter((r) => clasificar(r) !== "ok");

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-warn-deep" />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          Mis proyectos en riesgo
        </span>
      </div>
      {enRiesgo.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-3">
          ✓ Tus proyectos están en zona segura
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {enRiesgo.slice(0, 5).map((p) => {
            const ing = Number(p.ingreso_presupuestado ?? 0);
            const m = Number(p.margen_neto ?? 0);
            const pct = ing > 0 ? (m / ing) * 100 : 0;
            return (
              <li key={p.proyecto_id}>
                <Link
                  href={`/proyectos/${p.proyecto_id}/pnl`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-bg-2"
                >
                  <span className="truncate text-[11.5px] font-medium">{p.nombre}</span>
                  <span className="font-mono text-[11px] font-semibold tnum text-danger-deep">
                    {pct.toFixed(1)}%
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
