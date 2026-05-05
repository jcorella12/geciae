import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  obtenerVinculos,
  puedeAccederCentros,
  puedeGestionarCentrosEn,
  puedeGestionarReglasReparto,
} from "@/lib/auth/permisos";
import {
  COLOR_METODO_REPARTO,
  COLOR_SUBTIPO_CENTRO,
  COLOR_TIPO_CENTRO,
  ETIQUETA_EMISION_REPARTO,
  ETIQUETA_METODO_REPARTO,
  ETIQUETA_SUBTIPO_CENTRO,
  ETIQUETA_TIPO_CENTRO,
  ETIQUETA_TIPO_MOVIMIENTO,
  type MetodoReparto,
  type SubtipoCentro,
  type TipoCentro,
  type TipoEmisionReparto,
  type TipoMovimientoCentro,
} from "@/lib/centros/state";
import { createClient } from "@/lib/supabase/server";

import { ArchivarCentroButton } from "./archivar-centro-button";
import { ArchivarReglaButton } from "./archivar-regla-button";
import { EditarCentroForm } from "./editar-centro-form";
import { NuevaReglaForm } from "./nueva-regla-form";

export const dynamic = "force-dynamic";

const codigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

export default async function CentroDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const vinculos = await obtenerVinculos();
  if (!puedeAccederCentros(vinculos)) {
    redirect("/mi-dia");
  }

  const supabase = createClient();

  const { data: centro } = await supabase
    .from("centros")
    .select(
      "id, empresa_id, codigo, nombre, descripcion, tipo, subtipo, activo, centro_padre_id, presupuesto_anual, observaciones, responsable_id, empresas!centros_empresa_id_fkey(codigo, nombre_comercial, razon_social)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!centro) notFound();

  const empresaCodigo = centro.empresas?.codigo ?? "";
  const empresaNombre =
    centro.empresas?.nombre_comercial ??
    centro.empresas?.razon_social ??
    empresaCodigo;
  const tipo = centro.tipo as TipoCentro;
  const subtipo = centro.subtipo as SubtipoCentro;
  const esRepartible = subtipo === "servicio_compartido";

  const puedeEditar = puedeGestionarCentrosEn(vinculos, centro.empresa_id);
  const puedeReglas = puedeGestionarReglasReparto(vinculos);

  // Centro padre (si aplica)
  let padre: { id: string; codigo: string; nombre: string } | null = null;
  if (centro.centro_padre_id) {
    const { data } = await supabase
      .from("centros")
      .select("id, codigo, nombre")
      .eq("id", centro.centro_padre_id)
      .maybeSingle();
    padre = data ?? null;
  }

  // Sub-centros
  const { data: subcentros } = await supabase
    .from("centros")
    .select("id, codigo, nombre, tipo, subtipo, activo")
    .eq("centro_padre_id", params.id)
    .order("codigo");

  // Reglas de reparto (solo si servicio_compartido)
  type ReglaRow = {
    id: string;
    empresa_destino_id: string;
    centro_destino_id: string | null;
    metodo: string;
    valor: number | null;
    emision: string;
    vigencia_desde: string;
    vigencia_hasta: string | null;
    activa: boolean;
    empresas:
      | { codigo: string | null; nombre_comercial: string | null }
      | null;
    centros: { codigo: string | null; nombre: string | null } | null;
  };
  let reglas: ReglaRow[] = [];
  if (esRepartible) {
    const { data } = await supabase
      .from("centros_reglas_reparto")
      .select(
        "id, empresa_destino_id, centro_destino_id, metodo, valor, emision, vigencia_desde, vigencia_hasta, activa, empresas:empresa_destino_id(codigo, nombre_comercial), centros:centro_destino_id(codigo, nombre)",
      )
      .eq("centro_origen_id", params.id)
      .order("activa", { ascending: false })
      .order("vigencia_desde", { ascending: false });
    reglas = (data ?? []) as unknown as ReglaRow[];
  }

  // Últimos 20 movimientos
  const { data: movimientos } = await supabase
    .from("centros_movimientos")
    .select("id, fecha, tipo, concepto, monto, observaciones")
    .eq("centro_id", params.id)
    .order("fecha", { ascending: false })
    .limit(20);

  // Empresas y centros para el form de regla nueva (si aplica)
  let empresas: Array<{
    id: string;
    codigo: string;
    nombre_comercial: string | null;
    razon_social: string;
  }> = [];
  let centrosDestinoPorEmpresa: Record<
    string,
    Array<{
      id: string;
      empresa_id: string;
      codigo: string;
      nombre: string;
    }>
  > = {};
  if (esRepartible && puedeReglas) {
    const { data: empresasData } = await supabase
      .from("empresas")
      .select("id, codigo, razon_social, nombre_comercial")
      .eq("activa", true)
      .order("codigo");
    empresas = empresasData ?? [];

    const { data: todosCentros } = await supabase
      .from("centros")
      .select("id, empresa_id, codigo, nombre")
      .eq("activo", true);
    const grouped: typeof centrosDestinoPorEmpresa = {};
    for (const c of todosCentros ?? []) {
      if (c.empresa_id === centro.empresa_id) continue;
      const list = grouped[c.empresa_id] ?? [];
      list.push({
        id: c.id,
        empresa_id: c.empresa_id,
        codigo: c.codigo,
        nombre: c.nombre,
      });
      grouped[c.empresa_id] = list;
    }
    centrosDestinoPorEmpresa = grouped;
  }

  // KPIs simples del año en curso
  const inicioAnio = `${new Date().getFullYear()}-01-01`;
  const { data: movsAnio } = await supabase
    .from("centros_movimientos")
    .select("tipo, monto")
    .eq("centro_id", params.id)
    .gte("fecha", inicioAnio);

  let totalCostos = 0;
  let totalIngresos = 0;
  for (const m of movsAnio ?? []) {
    const t = m.tipo as TipoMovimientoCentro;
    const monto = Number(m.monto ?? 0);
    if (t === "gasto_directo" || t === "reparto_recibido")
      totalCostos += monto;
    if (t === "ingreso_directo") totalIngresos += monto;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/configuracion/centros"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver a centros
        </Link>
      </div>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  codigoColor[empresaCodigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="font-medium">{empresaCodigo}</span>
              <span className="text-muted-foreground">· {empresaNombre}</span>
              {!centro.activo && (
                <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                  Archivado
                </span>
              )}
            </div>
            <h1 className="mt-2 text-xl font-semibold">{centro.nombre}</h1>
            <p className="font-mono text-sm text-muted-foreground">
              {centro.codigo}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${COLOR_TIPO_CENTRO[tipo]}`}
              >
                {ETIQUETA_TIPO_CENTRO[tipo]}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_SUBTIPO_CENTRO[subtipo]}`}
              >
                {ETIQUETA_SUBTIPO_CENTRO[subtipo]}
              </span>
              {padre && (
                <Link
                  href={`/configuracion/centros/${padre.id}`}
                  className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Sub-centro de: {padre.codigo}
                </Link>
              )}
            </div>
            {centro.descripcion && (
              <p className="mt-3 text-sm text-muted-foreground">
                {centro.descripcion}
              </p>
            )}
          </div>

          {centro.activo && puedeEditar && (
            <ArchivarCentroButton centroId={centro.id} />
          )}
        </div>
      </div>

      {/* KPIs año en curso */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Costos del año"
          value={formatMoney(totalCostos)}
          tone="warn"
        />
        <Stat
          label="Ingresos del año"
          value={formatMoney(totalIngresos)}
          tone="ok"
        />
        <Stat
          label="Resultado neto"
          value={formatMoney(totalIngresos - totalCostos)}
          tone={totalIngresos - totalCostos >= 0 ? "ok" : "bad"}
        />
      </div>

      {/* Editar centro */}
      <EditarCentroForm
        centro={{
          id: centro.id,
          nombre: centro.nombre,
          descripcion: centro.descripcion,
          presupuesto_anual: centro.presupuesto_anual
            ? Number(centro.presupuesto_anual)
            : null,
          observaciones: centro.observaciones,
        }}
        puedeEditar={puedeEditar && centro.activo}
      />

      {/* Sub-centros */}
      {(subcentros ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold">
            Sub-centros ({(subcentros ?? []).length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 font-medium">Nombre</th>
                  <th className="px-4 py-2 font-medium">Subtipo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(subcentros ?? []).map((s) => {
                  const sSubtipo = s.subtipo as SubtipoCentro;
                  return (
                    <tr key={s.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-2 font-mono text-xs">
                        <Link
                          href={`/configuracion/centros/${s.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {s.codigo}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{s.nombre}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_SUBTIPO_CENTRO[sSubtipo]}`}
                        >
                          {ETIQUETA_SUBTIPO_CENTRO[sSubtipo]}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {s.activo ? (
                          <span className="text-xs text-emerald-700">
                            Activo
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Archivado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reglas de reparto (solo si servicio_compartido) */}
      {esRepartible && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              Reglas de reparto ({reglas.length})
            </h2>
            {puedeReglas && centro.activo && empresas.length > 0 && (
              <NuevaReglaForm
                centroOrigenId={centro.id}
                empresaOrigenId={centro.empresa_id}
                empresas={empresas}
                centrosDestinoPorEmpresa={centrosDestinoPorEmpresa}
              />
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">Empresa destino</th>
                  <th className="px-4 py-2 font-medium">Centro destino</th>
                  <th className="px-4 py-2 font-medium">Método</th>
                  <th className="px-4 py-2 text-right font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Emisión</th>
                  <th className="px-4 py-2 font-medium">Vigencia</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  {puedeReglas && (
                    <th className="px-4 py-2 text-right font-medium">
                      Acción
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reglas.map((r) => {
                  const empresasRel = r.empresas;
                  const centrosRel = r.centros;
                  const metodo = r.metodo as MetodoReparto;
                  const emision = r.emision as TipoEmisionReparto;
                  return (
                    <tr key={r.id} className="hover:bg-secondary/30">
                      <td className="px-4 py-2 text-xs">
                        <span className="font-medium">
                          {empresasRel?.codigo ?? "—"}
                        </span>
                        {empresasRel?.nombre_comercial && (
                          <span className="ml-1 text-muted-foreground">
                            · {empresasRel.nombre_comercial}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {centrosRel?.codigo ? (
                          <span className="font-mono">
                            {centrosRel.codigo}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            (gasto general)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${COLOR_METODO_REPARTO[metodo]}`}
                        >
                          {ETIQUETA_METODO_REPARTO[metodo]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {r.valor != null
                          ? metodo === "porcentaje_fijo"
                            ? `${Number(r.valor).toFixed(2)}%`
                            : Number(r.valor).toFixed(4)
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {ETIQUETA_EMISION_REPARTO[emision]}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {r.vigencia_desde}
                        {r.vigencia_hasta ? ` → ${r.vigencia_hasta}` : " →"}
                      </td>
                      <td className="px-4 py-2">
                        {r.activa ? (
                          <span className="text-xs text-emerald-700">
                            Activa
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            Archivada
                          </span>
                        )}
                      </td>
                      {puedeReglas && (
                        <td className="px-4 py-2 text-right">
                          {r.activa && (
                            <ArchivarReglaButton reglaId={r.id} />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {reglas.length === 0 && (
                  <tr>
                    <td
                      colSpan={puedeReglas ? 8 : 7}
                      className="px-4 py-6 text-center text-sm text-muted-foreground"
                    >
                      Aún no hay reglas de reparto. Define cómo se distribuyen
                      los costos de este servicio compartido a las demás
                      empresas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Movimientos recientes */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Últimos movimientos ({(movimientos ?? []).length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-secondary/50">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Fecha</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Concepto</th>
                <th className="px-4 py-2 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(movimientos ?? []).map((m) => {
                const tipoMov = m.tipo as TipoMovimientoCentro;
                return (
                  <tr key={m.id} className="hover:bg-secondary/30">
                    <td className="px-4 py-2 font-mono text-xs">{m.fecha}</td>
                    <td className="px-4 py-2 text-xs">
                      <span className="rounded-full bg-secondary px-2 py-0.5">
                        {ETIQUETA_TIPO_MOVIMIENTO[tipoMov]}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {m.concepto}
                      {m.observaciones && (
                        <p className="text-xs text-muted-foreground">
                          {m.observaciones}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                      {formatMoney(Number(m.monto))}
                    </td>
                  </tr>
                );
              })}
              {(movimientos ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    Sin movimientos. Se asignan al captar OC, OT o CFDI con
                    este centro (Sprint 5.5.3).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-rose-700";
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-lg font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
