import { Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { Stat } from "@/components/ui/stat";
import {
  esCEO,
  esRolEn,
  obtenerVinculos,
  puedeAsignarCapacitacionEn,
  puedeGestionarEmpleadosEn,
  puedeVerNominaEmpleado,
  tieneAtributo,
} from "@/lib/auth/permisos";
import {
  CATEGORIAS_PERSONAL,
  ESTADOS_CIVILES,
  GENEROS,
} from "@/lib/empleados/schemas";
import {
  COLOR_CATEGORIA,
  ETIQUETA_CATEGORIA,
  diasVacacionesLft,
  type CategoriaPersonal,
} from "@/lib/personas/state";
import { createClient } from "@/lib/supabase/server";

import { ProyectoTabs } from "../../proyectos/[id]/proyecto-tabs";
import { CapacitacionesSection } from "./capacitaciones-section";
import { DocumentosTab } from "./documentos-tab";
import { GenerarUsuarioButton } from "./generar-usuario/generar-usuario-button";
import { RepseCard } from "./repse-card";
import { ToggleActivoEmpleadoButton } from "./toggle-activo";
import { VacacionesTab } from "./vacaciones-tab";
import { ViaticosTab } from "./viaticos-tab";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const fmtCurrency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const fmtFecha = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

function categoriaLabel(c: string) {
  return CATEGORIAS_PERSONAL.find((x) => x.value === c)?.label ?? c;
}
function generoLabel(c: string | null) {
  if (!c) return "—";
  return GENEROS.find((x) => x.value === c)?.label ?? c;
}
function estadoCivilLabel(c: string | null) {
  if (!c) return "—";
  return ESTADOS_CIVILES.find((x) => x.value === c)?.label ?? c;
}

export default async function EmpleadoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const vinculos = await obtenerVinculos();

  const { data: emp } = await supabase
    .from("empleados")
    .select(
      "*, empresas(id, codigo, razon_social, nombre_comercial)",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!emp) notFound();

  const puedeGestionar = puedeGestionarEmpleadosEn(vinculos, emp.empresa_id);
  const puedeAprobar =
    esCEO(vinculos) || esRolEn(vinculos, emp.empresa_id, "director");
  const puedeSolicitar = puedeGestionar || true; // el propio empleado o un gestor

  // ¿Quien ve esta página puede acceder a la nómina del empleado?
  const {
    data: { user: usuarioActual },
  } = await supabase.auth.getUser();
  let esJefeDirectoEmp = false;
  if (emp.jefe_directo_id) {
    const { data: jefe } = await supabase
      .from("empleados")
      .select("usuario_id")
      .eq("id", emp.jefe_directo_id)
      .maybeSingle();
    esJefeDirectoEmp = jefe?.usuario_id === usuarioActual?.id;
  }
  const puedeVerNomina = puedeVerNominaEmpleado(vinculos, {
    empleadoEmpresaId: emp.empresa_id,
    esDuenio: emp.usuario_id === usuarioActual?.id,
    esJefeDirecto: esJefeDirectoEmp,
  });

  // ¿Puede generar usuario para este empleado?
  const puedeGenerarUsuario =
    esCEO(vinculos) ||
    tieneAtributo(vinculos, "rh") ||
    tieneAtributo(vinculos, "contralor") ||
    esRolEn(vinculos, emp.empresa_id, "director");

  type Domicilio = {
    calle?: string;
    numero_exterior?: string;
    numero_interior?: string;
    colonia?: string;
    municipio?: string;
    estado?: string;
    cp?: string;
  };
  type Emergencia = { nombre?: string; relacion?: string; telefono?: string };
  type Cuenta = { clabe?: string; banco?: string };

  const dom = (emp.domicilio as Domicilio | null) ?? null;
  const emerg = (emp.contacto_emergencia as Emergencia | null) ?? null;
  const cuenta = (emp.cuenta_bancaria as Cuenta | null) ?? null;

  // Cargar datos relacionados en paralelo
  const [
    { data: vacacionesRaw },
    { data: viaticosRaw },
    { data: docsRaw },
    { data: contratos },
    { data: capacitaciones },
  ] = await Promise.all([
    supabase
      .from("vacaciones_solicitudes")
      .select(
        "id, tipo, fecha_inicio, fecha_fin, dias, motivo, estado, observaciones, fecha_aprobacion",
      )
      .eq("empleado_id", params.id)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("viaticos")
      .select(
        "id, fecha_gasto, concepto, categoria, monto, observaciones, estado, url_ticket, motivo_rechazo, fecha_aprobacion, fecha_reembolso",
      )
      .eq("empleado_id", params.id)
      .order("fecha_gasto", { ascending: false }),
    supabase
      .from("empleados_documentos")
      .select(
        "id, tipo, nombre_archivo, url_storage, fecha_emision, fecha_vencimiento, observaciones, created_at",
      )
      .eq("empleado_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contratos_laborales")
      .select("id, tipo, fecha_inicio, fecha_fin, obra_o_proyecto, activo")
      .eq("empleado_id", params.id)
      .order("fecha_inicio", { ascending: false }),
    supabase
      .from("empleados_capacitaciones")
      .select(
        "id, fecha_programada, fecha_inicio, fecha_fin, estado, calificacion_post, fecha_vencimiento, url_constancia, capacitaciones(codigo, nombre)",
      )
      .eq("empleado_id", params.id)
      .order("fecha_programada", { ascending: false })
      .limit(50),
  ]);

  // Cursos activos del catálogo para asignar
  const { data: cursosActivos } = await supabase
    .from("capacitaciones")
    .select("id, codigo, nombre, vigencia_constancia_meses")
    .eq("activo", true)
    .order("codigo");

  const puedeAsignarCap = puedeAsignarCapacitacionEn(vinculos, emp.empresa_id);

  const vacaciones = vacacionesRaw ?? [];
  const viaticos = viaticosRaw ?? [];
  const docs = docsRaw ?? [];

  // Cálculo saldo vacaciones
  const diasAnualesLft = diasVacacionesLft(emp.fecha_ingreso);
  const inicioPeriodo = new Date(emp.fecha_ingreso);
  const ahora = new Date();
  // Mover el inicio del período al aniversario más reciente
  while (
    new Date(
      inicioPeriodo.getFullYear() + 1,
      inicioPeriodo.getMonth(),
      inicioPeriodo.getDate(),
    ) <= ahora
  ) {
    inicioPeriodo.setFullYear(inicioPeriodo.getFullYear() + 1);
  }
  const diasTomados = vacaciones
    .filter(
      (v) =>
        v.tipo === "vacaciones" &&
        v.estado === "aprobada" &&
        new Date(v.fecha_inicio) >= inicioPeriodo,
    )
    .reduce((acc, v) => acc + Number(v.dias), 0);
  const diasDisponibles = Math.max(0, diasAnualesLft - diasTomados);

  // URLs firmadas para tickets de viáticos
  const ticketUrls: Record<string, string | null> = {};
  await Promise.all(
    viaticos.map(async (v) => {
      if (v.url_ticket) {
        const { data } = await supabase.storage
          .from("viaticos")
          .createSignedUrl(v.url_ticket, 60 * 60);
        ticketUrls[v.id] = data?.signedUrl ?? null;
      } else {
        ticketUrls[v.id] = null;
      }
    }),
  );

  // URLs firmadas para documentos
  const docUrls: Record<string, string | null> = {};
  await Promise.all(
    docs.map(async (d) => {
      if (d.url_storage) {
        const { data } = await supabase.storage
          .from("empleados")
          .createSignedUrl(d.url_storage, 60 * 60);
        docUrls[d.id] = data?.signedUrl ?? null;
      } else {
        docUrls[d.id] = null;
      }
    }),
  );

  // Totales viáticos
  const totalesViaticos = {
    pendiente: viaticos
      .filter((v) => v.estado === "pendiente")
      .reduce((a, v) => a + Number(v.monto ?? 0), 0),
    aprobado: viaticos
      .filter((v) => v.estado === "aprobado")
      .reduce((a, v) => a + Number(v.monto ?? 0), 0),
    reembolsado: viaticos
      .filter((v) => v.estado === "reembolsado")
      .reduce((a, v) => a + Number(v.monto ?? 0), 0),
    total: viaticos.reduce((a, v) => a + Number(v.monto ?? 0), 0),
  };

  // Proyectos de la empresa para captura de viáticos
  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("id, codigo, nombre")
    .eq("empresa_id", emp.empresa_id)
    .in("estado", ["en_ejecucion", "planeacion", "en_cierre"])
    .order("fecha_inicio_planeado", { ascending: false })
    .limit(50);

  // Solicitudes pendientes
  const vacPendientes = vacaciones.filter(
    (v) => v.estado === "pendiente",
  ).length;
  const viaticosPendientes = viaticos.filter(
    (v) => v.estado === "pendiente",
  ).length;

  const empresa = emp.empresas as
    | { codigo: string; razon_social: string; nombre_comercial: string | null }
    | null;
  const categoria = emp.categoria as CategoriaPersonal;

  // Iniciales para avatar
  const initials = (emp.nombre_completo as string)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  return (
    <div className="mx-auto w-full max-w-[1480px] px-8 py-7">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/personas"
          className="text-[12px] text-ink-3 hover:text-ink-1"
        >
          ← Personas
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-[18px] font-semibold text-brand-fg">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
                  {emp.nombre_completo}
                </h1>
                {emp.activo === false && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                    Baja
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${COLOR_CATEGORIA[categoria]}`}
                >
                  {ETIQUETA_CATEGORIA[categoria]}
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-3">
                <span>{emp.puesto}</span>
                {emp.area && <span>· {emp.area}</span>}
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      empresaCodigoColor[empresa?.codigo ?? ""] ??
                      "bg-muted-foreground"
                    }`}
                  />
                  {empresa?.codigo}
                </span>
                <span>·</span>
                <code className="font-mono text-[11px]">
                  #{emp.numero_empleado}
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {puedeVerNomina && (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/portal-empleado?empleado=${emp.id}`}>
                    Ver portal de compensación
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/personas/${emp.id}/bonos`}>
                    Bonos
                  </Link>
                </Button>
              </>
            )}
            {puedeGenerarUsuario &&
              (emp.usuario_id ? (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
                  title={`Tiene cuenta vinculada · puede acceder al portal`}
                >
                  ✓ Tiene cuenta
                </span>
              ) : (
                <GenerarUsuarioButton
                  empleadoId={emp.id}
                  emailDefault={emp.email_personal ?? ""}
                  nombreEmpleado={emp.nombre_completo}
                />
              ))}
            {puedeGestionar && (
              <>
                <ToggleActivoEmpleadoButton
                  empleadoId={emp.id}
                  empresaId={emp.empresa_id}
                  activo={emp.activo === true}
                  tieneCuenta={Boolean(emp.usuario_id)}
                />
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/personas/${emp.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Antigüedad"
          value={(() => {
            const anios = Math.floor(
              (Date.now() - new Date(emp.fecha_ingreso).getTime()) /
                (1000 * 60 * 60 * 24 * 365.25),
            );
            return `${anios}`;
          })()}
          unit={"año(s)"}
          sub={`Desde ${fmtFecha(emp.fecha_ingreso)}`}
        />
        <KpiCard
          label="Vacaciones disponibles"
          value={diasDisponibles}
          sub={`de ${diasAnualesLft} LFT`}
          accent={diasDisponibles === 0 ? "warn" : "ok"}
        />
        <KpiCard
          label="Viáticos pendientes"
          value={fmtCurrency.format(totalesViaticos.pendiente)}
          sub={`${viaticos.filter((v) => v.estado === "pendiente").length} sin aprobar`}
          accent={totalesViaticos.pendiente > 0 ? "warn" : "brand"}
        />
        <KpiCard
          label="Documentos cargados"
          value={docs.length}
          sub={
            (() => {
              const venc = docs.filter(
                (d) =>
                  d.fecha_vencimiento &&
                  new Date(d.fecha_vencimiento) < new Date(),
              ).length;
              return venc > 0 ? `${venc} vencido(s)` : "Todo en orden";
            })()
          }
          accent={
            docs.some(
              (d) =>
                d.fecha_vencimiento &&
                new Date(d.fecha_vencimiento) < new Date(),
            )
              ? "danger"
              : "ok"
          }
        />
      </div>

      {/* Tabs */}
      <ProyectoTabs
        tabs={[
          { key: "resumen", label: "Resumen" },
          {
            key: "documentos",
            label: "Documentos",
            count: docs.length,
          },
          {
            key: "etapas" as const,
            label: "Vacaciones",
            count: vacPendientes,
          },
          {
            key: "bitacora" as const,
            label: "Viáticos",
            count: viaticosPendientes,
          },
          {
            key: "equipo" as const,
            label: "Capacitaciones",
            count: capacitaciones?.length ?? 0,
          },
        ]}
        panels={{
          resumen: (
            <div className="grid gap-5 lg:grid-cols-3">
              <section className="rounded-md border border-border bg-card p-5 shadow-xs lg:col-span-2">
                <h2 className="mb-3 text-[13.5px] font-semibold">
                  Datos personales
                </h2>
                <dl className="grid gap-3 sm:grid-cols-2 text-[13px]">
                  <Row k="CURP" v={emp.curp ?? "—"} mono />
                  <Row k="RFC" v={emp.rfc ?? "—"} mono />
                  <Row k="NSS" v={emp.nss ?? "—"} mono />
                  <Row
                    k="Nacimiento"
                    v={fmtFecha(emp.fecha_nacimiento)}
                  />
                  <Row k="Género" v={generoLabel(emp.genero)} />
                  <Row
                    k="Estado civil"
                    v={estadoCivilLabel(emp.estado_civil)}
                  />
                  <Row k="Email personal" v={emp.email_personal ?? "—"} />
                  <Row k="Teléfono" v={emp.telefono ?? "—"} />
                  <Row k="WhatsApp" v={emp.whatsapp ?? "—"} />
                  <Row k="Categoría" v={categoriaLabel(emp.categoria)} />
                </dl>

                {dom &&
                  (dom.calle ||
                    dom.colonia ||
                    dom.municipio ||
                    dom.estado) && (
                    <>
                      <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                        Domicilio
                      </h3>
                      <p className="mt-2 text-[13px]">
                        {[
                          dom.calle &&
                            `${dom.calle}${dom.numero_exterior ? ` ${dom.numero_exterior}` : ""}${dom.numero_interior ? ` int. ${dom.numero_interior}` : ""}`,
                          dom.colonia,
                          dom.municipio,
                          dom.estado,
                          dom.cp,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </>
                  )}

                {emerg && emerg.nombre && (
                  <>
                    <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                      Contacto de emergencia
                    </h3>
                    <p className="mt-2 text-[13px]">
                      {emerg.nombre}
                      {emerg.relacion && ` · ${emerg.relacion}`}
                      {emerg.telefono && ` · ${emerg.telefono}`}
                    </p>
                  </>
                )}

                {emp.observaciones && (
                  <>
                    <h3 className="mt-5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                      Observaciones
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-2">
                      {emp.observaciones}
                    </p>
                  </>
                )}
              </section>

              <aside className="space-y-5">
                <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                  <h2 className="mb-3 text-[13.5px] font-semibold">
                    Laboral
                  </h2>
                  <dl className="space-y-2 text-[13px]">
                    <Row
                      k="Fecha ingreso"
                      v={fmtFecha(emp.fecha_ingreso)}
                    />
                    {emp.fecha_baja && (
                      <Row
                        k="Fecha baja"
                        v={fmtFecha(emp.fecha_baja)}
                      />
                    )}
                    <Row
                      k="Salario base"
                      v={
                        emp.salario_base
                          ? fmtCurrency.format(Number(emp.salario_base))
                          : "—"
                      }
                    />
                    {cuenta && (cuenta.clabe || cuenta.banco) && (
                      <>
                        <Row
                          k="Banco"
                          v={cuenta.banco ?? "—"}
                        />
                        <Row
                          k="CLABE"
                          v={
                            cuenta.clabe ? (
                              <code className="font-mono text-[11px]">
                                {cuenta.clabe}
                              </code>
                            ) : (
                              "—"
                            )
                          }
                        />
                      </>
                    )}
                  </dl>
                </section>

                {(contratos?.length ?? 0) > 0 && (
                  <section className="rounded-md border border-border bg-card p-5 shadow-xs">
                    <h2 className="mb-3 text-[13.5px] font-semibold">
                      Contratos
                    </h2>
                    <ul className="space-y-2 text-[12.5px]">
                      {(contratos ?? []).map((c) => (
                        <li
                          key={c.id}
                          className="flex items-start justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium capitalize">
                              {c.tipo?.replaceAll("_", " ")}
                            </p>
                            <p className="text-[11px] text-ink-3">
                              {fmtFecha(c.fecha_inicio)}
                              {c.fecha_fin && ` → ${fmtFecha(c.fecha_fin)}`}
                            </p>
                            {c.obra_o_proyecto && (
                              <p className="text-[11px] text-ink-3">
                                {c.obra_o_proyecto}
                              </p>
                            )}
                          </div>
                          {c.activo && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[9px] font-semibold uppercase text-emerald-700">
                              Activo
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* REPSE — solo si categoría = repse */}
                {categoria === "repse" && (
                  <RepseCard
                    empleadoId={emp.id}
                    vigenciaActual={emp.vigencia_repse_hasta as string | null}
                    folioActual={emp.folio_repse as string | null}
                    puedeGestionar={puedeGestionar}
                  />
                )}
              </aside>
            </div>
          ),
          documentos: (
            <DocumentosTab
              empleadoId={emp.id}
              documentos={docs as never}
              signedUrls={docUrls}
              puedeGestionar={puedeGestionar}
            />
          ),
          etapas: (
            <VacacionesTab
              empleadoId={emp.id}
              diasAnualesLft={diasAnualesLft}
              diasTomados={diasTomados}
              diasDisponibles={diasDisponibles}
              solicitudes={vacaciones as never}
              puedeSolicitar={puedeSolicitar}
              puedeAprobar={puedeAprobar}
            />
          ),
          bitacora: (
            <ViaticosTab
              empleadoId={emp.id}
              empresaId={emp.empresa_id}
              viaticos={viaticos as never}
              proyectos={proyectos ?? []}
              totales={totalesViaticos}
              ticketUrls={ticketUrls}
              puedeCapturar={true}
              puedeAprobar={puedeAprobar}
            />
          ),
          equipo: (
            <CapacitacionesSection
              empleadoId={params.id}
              asignaciones={(capacitaciones ?? []).map((c) => ({
                id: c.id,
                fecha_programada: c.fecha_programada,
                fecha_inicio: c.fecha_inicio,
                fecha_fin: c.fecha_fin,
                estado: c.estado,
                calificacion_post: c.calificacion_post,
                fecha_vencimiento: c.fecha_vencimiento,
                url_constancia: (c as { url_constancia?: string | null })
                  .url_constancia ?? null,
                capacitaciones: c.capacitaciones as
                  | { codigo: string; nombre: string }
                  | null,
              }))}
              cursosCatalogo={(cursosActivos as Array<{
                id: string;
                codigo: string;
                nombre: string;
                vigencia_constancia_meses: number | null;
              }> | null) ?? []}
              puedeGestionar={puedeAsignarCap}
            />
          ),
        }}
      />
    </div>
  );
}

function Row({
  k,
  v,
  mono = false,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2">
      <dt className="text-ink-3">{k}</dt>
      <dd
        className={mono ? "font-mono text-[12px] font-medium" : "font-medium"}
      >
        {v}
      </dd>
    </div>
  );
}
