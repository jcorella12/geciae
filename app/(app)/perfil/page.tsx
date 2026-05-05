import {
  Briefcase,
  Calendar,
  Car,
  FileText,
  Gift,
  GraduationCap,
  Mail,
  Receipt,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { obtenerVinculosConEmpresa } from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { DescargaReciboButtons } from "../portal-empleado/descarga-recibo";
import { MfaSection } from "./mfa-section";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

function fmt(n: number) {
  return `$${Number(n).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calcularAntiguedad(fechaIngreso: string): string {
  const inicio = new Date(fechaIngreso);
  const ahora = new Date();
  const dias = Math.floor(
    (ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24),
  );
  const anios = Math.floor(dias / 365.25);
  const meses = Math.floor((dias % 365.25) / 30.4);
  if (anios > 0) return `${anios} año${anios === 1 ? "" : "s"}, ${meses} mes${meses === 1 ? "" : "es"}`;
  return `${meses} mes${meses === 1 ? "" : "es"} (${dias} días)`;
}

export default async function PerfilPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const vinculos = await obtenerVinculosConEmpresa();

  // MFA
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactor = factorsData?.totp?.[0] ?? null;

  // Empleado vinculado
  const { data: empleado } = await supabase
    .from("empleados")
    .select(
      "id, empresa_id, nombre_completo, numero_empleado, puesto, area, fecha_ingreso, fecha_baja, motivo_baja, activo, salario_base, curp, rfc, nss, telefono, email_personal, categoria, empresas(codigo, nombre_comercial, razon_social)",
    )
    .eq("usuario_id", user.id)
    .maybeSingle();

  const empleadoInactivo = empleado && empleado.activo === false;

  const tieneEmpleado = Boolean(empleado);
  const empresaCodigo =
    (empleado?.empresas as { codigo?: string } | null)?.codigo ?? "";
  const anio = new Date().getFullYear();

  // Si tiene empleado, cargar datos relacionados
  let recibosRecientes: Array<{
    id: string;
    fecha_pago: string;
    total_neto: number;
    total_percepciones: number;
    total_deducciones: number;
    periodicidad: string | null;
    tipo: string;
    url_pdf: string | null;
  }> = [];
  let bonos: Array<{
    id: string;
    fecha_pago: string;
    tipo: string;
    concepto: string;
    monto: number;
  }> = [];
  let saldoVacaciones: { dias_disponibles: number; dias_ganados: number; dias_disfrutados: number } | null = null;
  let vehiculo: { placa: string | null; marca: string; modelo: string; anio: number | null } | null = null;
  let capacitaciones: Array<{
    id: string;
    fecha_fin: string | null;
    fecha_inicio: string | null;
    capacitaciones: { nombre?: string; instructor?: string | null } | null;
  }> = [];
  let docs: Array<{
    id: string;
    nombre: string;
    tipo: string | null;
    fecha_documento: string | null;
    fecha_vencimiento: string | null;
    url_archivo: string | null;
  }> = [];
  let compensacion: {
    total_percepciones_timbradas: number;
    total_neto_recibido: number;
    total_deducciones: number;
    total_bonos_no_timbrados: number;
    total_capacitacion_recibida: number;
    total_combustible_vehiculo: number;
  } | null = null;

  if (empleado) {
    // Recibos del año (hasta 6 más recientes)
    const { data: r } = await supabase
      .from("nomina_recibos")
      .select(
        "id, fecha_pago, total_neto, total_percepciones, total_deducciones, periodicidad, tipo, url_pdf",
      )
      .eq("empleado_id", empleado.id)
      .gte("fecha_pago", `${anio}-01-01`)
      .order("fecha_pago", { ascending: false })
      .limit(6);
    recibosRecientes = (r ?? []) as never;

    // Bonos del año
    const { data: b } = await supabase
      .from("empleado_bonos_manuales")
      .select("id, fecha_pago, tipo, concepto, monto")
      .eq("empleado_id", empleado.id)
      .gte("fecha_pago", `${anio}-01-01`)
      .order("fecha_pago", { ascending: false });
    bonos = (b ?? []) as never;

    // Saldo vacaciones
    const { data: sv } = await (
      supabase.from("v_saldo_vacaciones" as never) as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            maybeSingle: () => Promise<{
              data: {
                dias_disponibles: number;
                dias_ganados: number;
                dias_disfrutados: number;
              } | null;
            }>;
          };
        };
      }
    )
      .select("dias_disponibles, dias_ganados, dias_disfrutados")
      .eq("empleado_id", empleado.id)
      .maybeSingle();
    saldoVacaciones = sv ?? null;

    // Vehículo asignado
    const { data: veh } = await supabase
      .from("vehiculos")
      .select("placa, marca, modelo, anio")
      .eq("asignado_a", user.id)
      .eq("estatus", "activo")
      .maybeSingle();
    vehiculo = veh ?? null;

    // Capacitaciones del año
    const { data: caps } = await supabase
      .from("empleados_capacitaciones")
      .select(
        "id, fecha_fin, fecha_inicio, capacitaciones(nombre, instructor)",
      )
      .eq("empleado_id", empleado.id)
      .gte("fecha_fin", `${anio}-01-01`)
      .order("fecha_fin", { ascending: false });
    capacitaciones = (caps ?? []) as never;

    // Documentos personales
    const { data: docsData } = await supabase
      .from("empleados_documentos")
      .select(
        "id, nombre, tipo, fecha_documento, fecha_vencimiento, url_archivo",
      )
      .eq("empleado_id", empleado.id)
      .order("created_at", { ascending: false })
      .limit(8);
    docs = (docsData ?? []) as never;

    // Compensación anual consolidada
    const { data: comp } = await (
      supabase.from("v_empleado_compensacion_anual" as never) as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            eq: (
              col: string,
              val: number,
            ) => {
              maybeSingle: () => Promise<{ data: typeof compensacion }>;
            };
          };
        };
      }
    )
      .select("*")
      .eq("empleado_id", empleado.id)
      .eq("anio", anio)
      .maybeSingle();
    compensacion = comp ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Yo
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">
            {empleado?.nombre_completo ?? user.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            {empleado ? (
              <>
                {empleado.puesto}
                {empleado.area && ` · ${empleado.area}`}
                {" · "}
                <span className="inline-flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      codigoColor[empresaCodigo] ?? "bg-muted-foreground"
                    }`}
                  />
                  {empresaCodigo}
                </span>
              </>
            ) : (
              "Aún no tienes registro de empleado vinculado"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tieneEmpleado && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal-empleado">
                  <Wallet className="h-3.5 w-3.5" />
                  Portal de compensación
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/personas/${empleado!.id}`}>
                  <User className="h-3.5 w-3.5" />
                  Mi expediente
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {!tieneEmpleado && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Tu cuenta aún no está vinculada a un registro de empleado.</p>
          <p className="mt-1 text-xs">
            Pídele a tu director, RH o al CEO que ejecute el botón
            <strong> &quot;Generar usuario&quot;</strong> en tu ficha de empleado en
            <code className="mx-1 font-mono">/personas</code>.
          </p>
        </div>
      )}

      {empleadoInactivo && (
        <div className="rounded-md border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-medium">Tu acceso al ERP está suspendido.</p>
          <p className="mt-1 text-xs">
            Tu registro de empleado está marcado como{" "}
            <strong>baja</strong>
            {empleado?.fecha_baja && ` desde ${empleado.fecha_baja}`}
            {empleado?.motivo_baja && ` (${empleado.motivo_baja})`}.
            Puedes ver y descargar tus recibos de nómina históricos pero no
            tendrás acceso a las áreas operativas. Si crees que esto es un
            error, contacta a tu director o RH.
          </p>
        </div>
      )}

      {/* Empresas y rol */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Briefcase className="h-4 w-4" />
          Mis empresas y rol
        </h2>
        {vinculos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tienes vínculos activos con ninguna empresa del grupo.
          </p>
        ) : (
          <ul className="space-y-2">
            {vinculos.map((v) => (
              <li
                key={v.empresa_id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-2 p-3 text-sm"
              >
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    codigoColor[v.empresa?.codigo ?? ""] ?? "bg-muted-foreground"
                  }`}
                />
                <span className="font-medium">{v.empresa?.codigo}</span>
                <span className="text-muted-foreground">
                  · {v.empresa?.nombre_comercial ?? v.empresa?.razon_social}
                </span>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {v.rol}
                </span>
                {v.atributos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.atributos.map((a) => (
                      <span
                        key={a}
                        className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Datos personales del empleado */}
      {empleado && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4" />
            Mis datos personales
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Número</dt>
              <dd className="font-mono text-sm">{empleado.numero_empleado}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Categoría</dt>
              <dd className="capitalize">{empleado.categoria.replace("_", " ")}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Antigüedad</dt>
              <dd>{calcularAntiguedad(empleado.fecha_ingreso)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">CURP</dt>
              <dd className="font-mono text-xs">{empleado.curp}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">RFC</dt>
              <dd className="font-mono text-xs">{empleado.rfc ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">NSS</dt>
              <dd className="font-mono text-xs">{empleado.nss ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Email personal</dt>
              <dd className="text-xs">{empleado.email_personal ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Teléfono</dt>
              <dd className="text-xs">{empleado.telefono ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Salario base</dt>
              <dd className="font-mono">
                {empleado.salario_base != null ? fmt(Number(empleado.salario_base)) : "—"}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {/* Compensación KPIs */}
      {empleado && compensacion && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Wallet className="h-4 w-4" />
            Mi compensación {anio}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPI
              label="Sueldo bruto"
              value={fmt(Number(compensacion.total_percepciones_timbradas))}
            />
            <KPI
              label="Deducciones"
              value={fmt(Number(compensacion.total_deducciones))}
              tone="warn"
            />
            <KPI
              label="Neto recibido"
              value={fmt(Number(compensacion.total_neto_recibido))}
              tone="ok"
              big
            />
            <KPI
              label="Bonos extras"
              value={fmt(Number(compensacion.total_bonos_no_timbrados))}
            />
          </div>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/portal-empleado">
              Ver desglose completo →
            </Link>
          </Button>
        </section>
      )}

      {/* Recibos recientes */}
      {empleado && recibosRecientes.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Receipt className="h-4 w-4" />
              Mis recibos recientes
            </h2>
            <Link
              href="/portal-empleado"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Neto</th>
                  <th className="px-3 py-2 text-right font-medium">Descarga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recibosRecientes.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-mono text-xs">{r.fecha_pago}</td>
                    <td className="px-3 py-2 text-xs">{r.tipo}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-emerald-700">
                      {fmt(Number(r.total_neto))}
                    </td>
                    <td className="px-3 py-2 text-right">
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
        </section>
      )}

      {/* Vacaciones */}
      {empleado && saldoVacaciones && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Calendar className="h-4 w-4" />
            Mis vacaciones
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <KPI
              label="Disponibles"
              value={`${saldoVacaciones.dias_disponibles} días`}
              tone={saldoVacaciones.dias_disponibles > 0 ? "ok" : undefined}
              big
            />
            <KPI label="Ganados" value={`${saldoVacaciones.dias_ganados}`} />
            <KPI
              label="Disfrutados"
              value={`${saldoVacaciones.dias_disfrutados}`}
            />
          </div>
        </section>
      )}

      {/* Vehículo */}
      {empleado && vehiculo && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Car className="h-4 w-4" />
            Mi vehículo asignado
          </h2>
          <p className="text-sm">
            <strong>
              {vehiculo.marca} {vehiculo.modelo}
            </strong>{" "}
            {vehiculo.anio} ·{" "}
            <span className="font-mono">{vehiculo.placa ?? "sin placas"}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            La gasolina cargada queda registrada como prestación en tu portal de
            compensación.
          </p>
        </section>
      )}

      {/* Capacitaciones */}
      {empleado && capacitaciones.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <GraduationCap className="h-4 w-4" />
            Mi capacitación {anio}
          </h2>
          <ul className="space-y-2 text-sm">
            {capacitaciones.map((c) => {
              const cap = c.capacitaciones as
                | { nombre?: string; instructor?: string | null }
                | null;
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-2 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{cap?.nombre ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {cap?.instructor ?? "—"}
                    </p>
                  </div>
                  <span className="font-mono text-xs">
                    {c.fecha_fin ?? c.fecha_inicio ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Bonos */}
      {empleado && bonos.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Gift className="h-4 w-4" />
            Mis bonos extras {anio}
          </h2>
          <ul className="space-y-2 text-sm">
            {bonos.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-2 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{b.concepto}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {b.tipo.replace("_", " ")} · {b.fecha_pago}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-emerald-700">
                  {fmt(Number(b.monto))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Documentos personales */}
      {empleado && docs.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <FileText className="h-4 w-4" />
              Mis documentos
            </h2>
            <Link
              href={`/personas/${empleado.id}`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Gestionar →
            </Link>
          </div>
          <ul className="space-y-1 text-sm">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg-2 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{d.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.tipo ?? "—"}
                    {d.fecha_documento && ` · ${d.fecha_documento}`}
                    {d.fecha_vencimiento &&
                      ` · vence ${d.fecha_vencimiento}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Cuenta y seguridad */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
          <Shield className="h-4 w-4" />
          Cuenta y seguridad
        </h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Correo</dt>
            <dd className="flex items-center gap-1.5 font-medium">
              <Mail className="h-3 w-3" />
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">
              Último login
            </dt>
            <dd>
              {user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString("es-MX")
                : "—"}
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <MfaSection
            existingFactor={
              totpFactor
                ? {
                    id: totpFactor.id,
                    friendlyName: totpFactor.friendly_name ?? null,
                    status: totpFactor.status,
                  }
                : null
            }
          />
        </div>
      </section>
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
  tone?: "ok" | "warn";
  big?: boolean;
}) {
  const cl =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "";
  return (
    <div className="rounded-lg border border-border bg-bg-2 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 font-mono ${big ? "text-xl" : "text-base"} font-semibold tabular-nums ${cl}`}
      >
        {value}
      </p>
    </div>
  );
}
