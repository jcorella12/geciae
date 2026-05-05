import { redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeVerNominaEmpleado,
} from "@/lib/auth/permisos";

import { DescargaReciboButtons } from "./descarga-recibo";
import {
  COLOR_TIPO_BONO,
  ETIQUETA_TIPO_BONO,
  type TipoBonoManual,
} from "@/lib/portal-empleado/state";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NOMBRES_MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default async function PortalEmpleadoPage({
  searchParams,
}: {
  searchParams?: { anio?: string; empleado?: string };
}) {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const anio = Number(searchParams?.anio) || today.getFullYear();

  // Si admin pasa empleado=, mostrar ese portal. Si no, el del usuario.
  const empleadoQueryId = searchParams?.empleado;

  let empleadoId: string;
  let esVistaAdmin = false;

  if (empleadoQueryId) {
    // Verificar permiso usando helper unificado (CEO, RH, contralor,
    // tesorero, auditor, director de empresa, o jefe directo).
    const { data: emp } = await supabase
      .from("empleados")
      .select("id, empresa_id, jefe_directo_id, usuario_id")
      .eq("id", empleadoQueryId)
      .maybeSingle();
    if (!emp) redirect("/personas");

    // ¿Es jefe directo del empleado?
    let esJefeDirecto = false;
    if (emp.jefe_directo_id) {
      const { data: jefe } = await supabase
        .from("empleados")
        .select("usuario_id")
        .eq("id", emp.jefe_directo_id)
        .maybeSingle();
      esJefeDirecto = jefe?.usuario_id === user.id;
    }

    const puede = puedeVerNominaEmpleado(v, {
      empleadoEmpresaId: emp.empresa_id,
      esDuenio: emp.usuario_id === user.id,
      esJefeDirecto,
    });
    if (!puede) redirect("/portal-empleado");
    empleadoId = emp.id;
    esVistaAdmin = emp.usuario_id !== user.id;
  } else {
    // Buscar empleado del usuario
    const { data: miEmp } = await supabase
      .from("empleados")
      .select("id")
      .eq("usuario_id", user.id)
      .maybeSingle();
    if (!miEmp) {
      return (
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
          <h1 className="text-2xl font-semibold">Portal del Empleado</h1>
          <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Tu cuenta no está vinculada a un registro de empleado. Solicita a
            tu director que vincule tu usuario en{" "}
            <code className="font-mono">/personas</code>.
          </div>
        </div>
      );
    }
    empleadoId = miEmp.id;
  }

  // Datos del empleado
  const { data: empleado } = await supabase
    .from("empleados")
    .select(
      "id, empresa_id, nombre_completo, numero_empleado, puesto, area, fecha_ingreso, salario_base, empresas(codigo, nombre_comercial, razon_social)",
    )
    .eq("id", empleadoId)
    .maybeSingle();
  if (!empleado) redirect("/mi-dia");

  // Compensación del año
  type Comp = {
    total_percepciones_timbradas: number;
    total_deducciones: number;
    total_neto_recibido: number;
    total_otros_pagos: number;
    total_bonos_no_timbrados: number;
    total_capacitacion_recibida: number;
    total_combustible_vehiculo: number;
  };
  const { data: compRows } = await (
    supabase.from("v_empleado_compensacion_anual" as never) as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: number,
          ) => Promise<{ data: Comp[] | null }>;
        };
      };
    }
  )
    .select("*")
    .eq("empleado_id", empleadoId)
    .eq("anio", anio);
  const comp = compRows?.[0] ?? null;

  // Recibos del año
  const { data: recibos } = await supabase
    .from("nomina_recibos")
    .select("id, fecha_pago, total_neto, total_percepciones, total_deducciones, periodicidad, tipo, url_xml, url_pdf")
    .eq("empleado_id", empleadoId)
    .gte("fecha_pago", `${anio}-01-01`)
    .lt("fecha_pago", `${anio + 1}-01-01`)
    .order("fecha_pago", { ascending: false });

  // Bonos del año
  const { data: bonosAnio } = await supabase
    .from("empleado_bonos_manuales")
    .select("id, fecha_pago, tipo, concepto, monto, timbrado")
    .eq("empleado_id", empleadoId)
    .gte("fecha_pago", `${anio}-01-01`)
    .lt("fecha_pago", `${anio + 1}-01-01`)
    .order("fecha_pago", { ascending: false });

  // Capacitación del año
  const { data: capacitaciones } = await supabase
    .from("empleados_capacitaciones")
    .select(
      "id, fecha_inicio, fecha_fin, costo_prorrateado, capacitaciones(nombre, instructor)",
    )
    .eq("empleado_id", empleadoId)
    .gte("fecha_fin", `${anio}-01-01`)
    .lt("fecha_fin", `${anio + 1}-01-01`)
    .order("fecha_fin", { ascending: false });

  // Vehículo asignado y gasolina
  const { data: vehiculo } = empleado
    ? await supabase
        .from("vehiculos")
        .select("id, placa, marca, modelo, anio")
        .eq("asignado_a", user.id)
        .eq("estatus", "activo")
        .maybeSingle()
    : { data: null };

  const { data: cargasVehiculo } = vehiculo
    ? await supabase
        .from("vehiculos_bitacora")
        .select("fecha, monto, litros")
        .eq("vehiculo_id", vehiculo.id)
        .eq("tipo", "carga_combustible")
        .gte("fecha", `${anio}-01-01`)
        .lt("fecha", `${anio + 1}-01-01`)
        .order("fecha", { ascending: false })
    : { data: [] };

  // Resumen mensual
  const recibosPorMes = new Array(12).fill(0).map(() => ({
    percepciones: 0,
    deducciones: 0,
    neto: 0,
    bonos: 0,
  }));
  for (const r of recibos ?? []) {
    const m = new Date(r.fecha_pago).getUTCMonth();
    recibosPorMes[m].percepciones += Number(r.total_percepciones);
    recibosPorMes[m].deducciones += Number(r.total_deducciones);
    recibosPorMes[m].neto += Number(r.total_neto);
  }
  for (const b of bonosAnio ?? []) {
    const m = new Date(b.fecha_pago).getUTCMonth();
    recibosPorMes[m].bonos += Number(b.monto);
  }

  // Costo total empresa = neto + deducciones + bonos + capacitación + gasolina
  const totalEmpresa =
    Number(comp?.total_neto_recibido ?? 0) +
    Number(comp?.total_deducciones ?? 0) +
    Number(comp?.total_bonos_no_timbrados ?? 0) +
    Number(comp?.total_capacitacion_recibida ?? 0) +
    Number(comp?.total_combustible_vehiculo ?? 0);

  const empresaCodigo =
    (empleado.empresas as { codigo?: string } | null)?.codigo ?? "";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {esVistaAdmin
            ? `Portal: ${empleado.nombre_completo}`
            : "Mi Portal del Empleado"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {empleado.puesto}
          {empleado.area && ` · ${empleado.area}`} · {empresaCodigo}
          {empleado.fecha_ingreso && (
            <>
              {" · "}
              Ingreso: {empleado.fecha_ingreso}
            </>
          )}
        </p>
      </div>

      {/* Selector año */}
      <form className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        {esVistaAdmin && (
          <input
            type="hidden"
            name="empleado"
            value={empleadoQueryId ?? ""}
          />
        )}
        <label htmlFor="anio" className="text-xs font-medium">
          Año
        </label>
        <input
          id="anio"
          name="anio"
          type="number"
          min={2020}
          max={2099}
          defaultValue={anio}
          className="flex h-9 w-24 rounded-md border border-input bg-background px-2 text-sm"
        />
        <button
          type="submit"
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Aplicar
        </button>
      </form>

      {/* KPIs anuales */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KPI
          label="Sueldo bruto"
          value={fmt(Number(comp?.total_percepciones_timbradas ?? 0))}
          tone="ok"
        />
        <KPI
          label="Deducciones"
          value={fmt(Number(comp?.total_deducciones ?? 0))}
          tone="warn"
        />
        <KPI
          label="Neto recibido"
          value={fmt(Number(comp?.total_neto_recibido ?? 0))}
          tone="ok"
          big
        />
        <KPI
          label="Bonos no timbrados"
          value={fmt(Number(comp?.total_bonos_no_timbrados ?? 0))}
        />
        <KPI
          label="Capacitación recibida"
          value={fmt(Number(comp?.total_capacitacion_recibida ?? 0))}
        />
        <KPI
          label="Gasolina vehículo"
          value={fmt(Number(comp?.total_combustible_vehiculo ?? 0))}
        />
        <KPI
          label="Costo total empresa"
          value={fmt(totalEmpresa)}
          tone="info"
          big
        />
      </div>

      {/* Mes a mes */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Mes a mes</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Mes</th>
                <th className="px-4 py-2 text-right font-medium">Percepciones</th>
                <th className="px-4 py-2 text-right font-medium">Deducciones</th>
                <th className="px-4 py-2 text-right font-medium">Neto</th>
                <th className="px-4 py-2 text-right font-medium">Bonos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recibosPorMes.map((m, i) => (
                <tr key={i} className="hover:bg-secondary/30">
                  <td className="px-4 py-2 text-xs uppercase">{NOMBRES_MESES[i]}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                    {m.percepciones > 0 ? fmt(m.percepciones) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-rose-700">
                    {m.deducciones > 0 ? fmt(m.deducciones) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-emerald-700">
                    {m.neto > 0 ? fmt(m.neto) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-amber-700">
                    {m.bonos > 0 ? fmt(m.bonos) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recibos */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Mis recibos ({(recibos ?? []).length})
        </h2>
        {(recibos ?? []).length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            Sin recibos para este año.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Fecha pago</th>
                  <th className="px-4 py-2 font-medium">Periodicidad</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 text-right font-medium">Percepciones</th>
                  <th className="px-4 py-2 text-right font-medium">Deducciones</th>
                  <th className="px-4 py-2 text-right font-medium">Neto</th>
                  <th className="px-4 py-2 text-right font-medium">Descarga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(recibos ?? []).map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono text-xs">
                      {r.fecha_pago}
                    </td>
                    <td className="px-4 py-2 text-xs">{r.periodicidad ?? "—"}</td>
                    <td className="px-4 py-2 text-xs">{r.tipo}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                      {fmt(Number(r.total_percepciones))}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-rose-700">
                      {fmt(Number(r.total_deducciones))}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-emerald-700 font-semibold">
                      {fmt(Number(r.total_neto))}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <DescargaReciboButtons
                        reciboId={r.id}
                        tienePdf={Boolean(r.url_pdf)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Vehículo asignado */}
      {vehiculo && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Mi vehículo</h2>
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-sm">
              <strong>{vehiculo.marca} {vehiculo.modelo}</strong> {vehiculo.anio} · Placas{" "}
              <span className="font-mono">{vehiculo.placa}</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Cargas de combustible del año: {(cargasVehiculo ?? []).length} ·
              Total $
              {(cargasVehiculo ?? [])
                .reduce((a, c) => a + Number(c.monto ?? 0), 0)
                .toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            </p>
          </div>
        </section>
      )}

      {/* Capacitación */}
      {(capacitaciones ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Mi capacitación ({(capacitaciones ?? []).length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Curso</th>
                  <th className="px-4 py-2 font-medium">Instructor</th>
                  <th className="px-4 py-2 text-right font-medium">Costo prorrateado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(capacitaciones ?? []).map((c) => {
                  const cap = c.capacitaciones as
                    | { nombre?: string; instructor?: string | null }
                    | null;
                  return (
                    <tr key={c.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-2 font-mono text-xs">{c.fecha_fin ?? c.fecha_inicio ?? "—"}</td>
                      <td className="px-4 py-2">{cap?.nombre ?? "—"}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {cap?.instructor ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {c.costo_prorrateado != null
                          ? fmt(Number(c.costo_prorrateado))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Bonos */}
      {(bonosAnio ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Bonos extras ({(bonosAnio ?? []).length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Concepto</th>
                  <th className="px-4 py-2 text-right font-medium">Monto</th>
                  <th className="px-4 py-2 font-medium">Timbrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(bonosAnio ?? []).map((b) => {
                  const tipo = b.tipo as TipoBonoManual;
                  return (
                    <tr key={b.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-2 font-mono text-xs">{b.fecha_pago}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_TIPO_BONO[tipo]}`}
                        >
                          {ETIQUETA_TIPO_BONO[tipo]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs">{b.concepto}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">
                        {fmt(Number(b.monto))}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {b.timbrado ? "Sí" : "No"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Datos sensibles. Tus accesos quedan registrados en bitácora interna.
        Si encuentras un error, contacta a tu director.
      </p>
    </div>
  );
}

function KPI({
  label,
  value,
  tone,
  big,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "info";
  big?: boolean;
}) {
  const cl =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : tone === "info"
          ? "text-blue-700"
          : "";
  return (
    <div
      className={`rounded-lg border bg-card px-4 py-3 shadow-sm ${
        big ? "border-primary" : "border-border"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono ${big ? "text-2xl" : "text-lg"} font-semibold tabular-nums ${cl}`}
      >
        {value}
      </p>
    </div>
  );
}
