/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AlertTriangle,
  Car,
  CircleDollarSign,
  Repeat,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { obtenerVinculos } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const fmtMxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export default async function ActivosHubPage() {
  const supabase = createClient();
  await obtenerVinculos();

  // Conteos rápidos para los KPIs de cada card
  const [
    { count: vehiculosCount },
    { count: activosCount },
    { count: prestamosActivosCount },
    { count: cobrosPendientesCount },
    activosAlerta,
    cobrosTotal,
  ] = await Promise.all([
    (supabase as any)
      .from("vehiculos")
      .select("id", { count: "exact", head: true })
      .eq("estatus", "activo"),
    (supabase as any)
      .from("activos_grupo")
      .select("id", { count: "exact", head: true })
      .eq("activo", true),
    (supabase as any)
      .from("prestamos_activos")
      .select("id", { count: "exact", head: true })
      .eq("estado", "recogido"),
    (supabase as any)
      .from("v_prestamos_pendientes_facturar")
      .select("id", { count: "exact", head: true }),
    (supabase as any)
      .from("v_activos_grupo_enriquecido")
      .select("id, alerta")
      .neq("alerta", "ok"),
    (supabase as any)
      .from("v_prestamos_pendientes_facturar")
      .select("costo_total"),
  ]);

  const conAlerta = (activosAlerta.data ?? []).length;
  const totalCobrar = (cobrosTotal.data ?? []).reduce(
    (acc: number, p: { costo_total: number }) => acc + Number(p.costo_total ?? 0),
    0,
  );

  const cards = [
    {
      titulo: "Vehículos",
      descripcion:
        "Flota del grupo: pickups, sedanes, camiones. Bitácora de gasolina y mantenimiento.",
      href: "/activos/vehiculos",
      icon: Car,
      bg: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      kpi: `${vehiculosCount ?? 0} activos`,
    },
    {
      titulo: "Activos compartidos",
      descripcion:
        "Equipos costosos del grupo (grúas, montacargas, TTR, medidores) con tarifa Costo + 12%.",
      href: "/activos/compartidos",
      icon: Wrench,
      bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
      kpi: `${activosCount ?? 0} en catálogo`,
      alerta: conAlerta > 0 ? `${conAlerta} con alerta` : null,
    },
    {
      titulo: "Préstamos entre empresas",
      descripcion:
        "Solicitar, aprobar, recoger y devolver activos compartidos entre las 4 empresas.",
      href: "/activos/prestamos",
      icon: Repeat,
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
      kpi:
        prestamosActivosCount && prestamosActivosCount > 0
          ? `${prestamosActivosCount} en uso`
          : "Ninguno activo",
    },
    {
      titulo: "Cobros inter-co",
      descripcion:
        "Facturación consolidada mensual de los préstamos devueltos. CFDI por par emisora-receptora.",
      href: "/activos/cobros",
      icon: CircleDollarSign,
      bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      kpi:
        cobrosPendientesCount && cobrosPendientesCount > 0
          ? `${cobrosPendientesCount} pendientes · ${fmtMxn.format(totalCobrar)}`
          : "Sin pendientes",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      <div className="mb-7">
        <p className="lbl-mini">Recursos · Activos</p>
        <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-[-0.02em]">
          Activos del grupo
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Vehículos, equipos compartidos, préstamos inter-co y cobros automáticos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.titulo}
            href={c.href}
            className={`flex items-start gap-4 rounded-lg border p-5 shadow-sm transition ${c.bg}`}
          >
            <c.icon className="h-9 w-9 shrink-0" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="text-[16px] font-semibold leading-tight">
                {c.titulo}
              </p>
              <p className="mt-1 text-[12.5px] leading-snug opacity-80">
                {c.descripcion}
              </p>
              <div className="mt-3 flex items-center gap-3 text-[11.5px]">
                <span className="rounded-full bg-white/60 px-2 py-0.5 font-medium">
                  {c.kpi}
                </span>
                {c.alerta && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-2 py-0.5 font-medium text-amber-900">
                    <AlertTriangle className="h-3 w-3" />
                    {c.alerta}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
