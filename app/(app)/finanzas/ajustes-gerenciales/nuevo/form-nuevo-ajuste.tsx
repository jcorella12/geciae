"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DESCRIPCION_TIPO_AJUSTE,
  ETIQUETA_CONTRAPARTE,
  ETIQUETA_TIPO_AJUSTE,
  NATURALEZA_POR_TIPO,
  TIPOS_CON_CONTRAPARTE,
  TIPOS_CON_OC_ORIGEN,
  TIPOS_CON_VIDA_UTIL,
  VIDA_UTIL_SUGERIDA,
  type ContraparteRelacion,
  type TipoAjusteGerencial,
} from "@/lib/ajustes-gerenciales/state";

import { crearAjuste } from "../actions";

const TIPOS = Object.keys(ETIQUETA_TIPO_AJUSTE) as TipoAjusteGerencial[];
const RELACIONES: ContraparteRelacion[] = ["fundador", "socio", "familiar", "tercero"];

const fmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function FormNuevoAjuste({
  empresas,
  ocsCandidatas,
}: {
  empresas: Array<{ id: string; codigo: string; nombre_comercial: string | null }>;
  ocsCandidatas: Array<{ id: string; numero: string; concepto: string; total: number }>;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoAjusteGerencial | "">("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const vidaSug = tipo ? VIDA_UTIL_SUGERIDA[tipo] : undefined;
  const requiereVidaUtil = tipo ? TIPOS_CON_VIDA_UTIL.includes(tipo) : false;
  const requiereContraparte = tipo ? TIPOS_CON_CONTRAPARTE.includes(tipo) : false;
  const muestraOC = tipo ? TIPOS_CON_OC_ORIGEN.includes(tipo) : false;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const r = await crearAjuste(formData);
      if (r.ok && r.data) {
        router.push(`/finanzas/ajustes-gerenciales/${r.data.id}`);
      } else if (!r.ok) {
        setError(r.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Selector de tipo */}
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold">
          Tipo de ajuste
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {TIPOS.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                tipo === t
                  ? "border-brand bg-brand/5"
                  : "border-border hover:border-brand/40"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                onChange={() => setTipo(t)}
                checked={tipo === t}
                required
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-[12.5px] font-medium leading-tight">
                  {ETIQUETA_TIPO_AJUSTE[t]}
                </div>
                <div className="mt-0.5 text-[11px] text-ink-3">
                  {DESCRIPCION_TIPO_AJUSTE[t]}
                </div>
                <div className="mt-1 inline-block rounded bg-bg-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-3">
                  {NATURALEZA_POR_TIPO[t]}
                </div>
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {tipo && (
        <>
          {/* Empresa */}
          <div>
            <label className="mb-1 block text-[12.5px] font-medium">Empresa</label>
            <select
              name="empresa_id"
              required
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
            >
              <option value="">Selecciona…</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} — {e.nombre_comercial}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="mb-1 block text-[12.5px] font-medium">
              Descripción
            </label>
            <Input
              type="text"
              name="descripcion"
              required
              minLength={5}
              maxLength={500}
              placeholder={
                tipo === "construccion_remodelacion_oficina"
                  ? "Ej: Contenedor 40 pies oficina Hermosillo"
                  : tipo === "inventario_gastado_existente"
                    ? "Ej: 200 paneles solares Trina 545W en almacén PSE"
                    : "Descripción clara y específica"
              }
            />
          </div>

          {/* Valor + fecha */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">
                Valor (MXN)
              </label>
              <Input type="number" name="valor" step="0.01" min="0" required />
            </div>
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">
                Fecha de adquisición
              </label>
              <Input
                type="date"
                name="fecha_adquisicion"
                required
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          {/* Vida útil */}
          {requiereVidaUtil && (
            <div className="grid gap-4 rounded-md border border-border bg-bg-2/40 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12.5px] font-medium">
                  Vida útil (años)
                  {vidaSug && (
                    <span className="ml-2 text-[10.5px] text-ink-3">
                      Sugerido: {vidaSug}
                    </span>
                  )}
                </label>
                <Input
                  type="number"
                  name="vida_util_anios"
                  min="1"
                  max="50"
                  defaultValue={vidaSug ?? ""}
                />
              </div>
              <div>
                <label className="mb-1 block text-[12.5px] font-medium">
                  Valor residual %
                </label>
                <Input
                  type="number"
                  name="valor_residual_pct"
                  min="0"
                  max="100"
                  step="0.5"
                  defaultValue={10}
                />
              </div>
            </div>
          )}

          {/* Contraparte */}
          {requiereContraparte && (
            <div className="grid gap-4 rounded-md border border-border bg-bg-2/40 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12.5px] font-medium">
                  Nombre contraparte
                </label>
                <Input
                  type="text"
                  name="contraparte_nombre"
                  placeholder={
                    tipo === "prestamo_personal_negocio"
                      ? "Quien presta"
                      : "Quien aporta"
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-[12.5px] font-medium">
                  Relación
                </label>
                <select
                  name="contraparte_relacion"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
                >
                  <option value="">Selecciona…</option>
                  {RELACIONES.map((r) => (
                    <option key={r} value={r}>
                      {ETIQUETA_CONTRAPARTE[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* OC origen */}
          {muestraOC && ocsCandidatas.length > 0 && (
            <div>
              <label className="mb-1 block text-[12.5px] font-medium">
                OC de origen{" "}
                <span className="text-ink-3">(opcional)</span>
              </label>
              <select
                name="oc_origen_id"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
              >
                <option value="">Sin OC vinculada</option>
                {ocsCandidatas.map((oc) => (
                  <option key={oc.id} value={oc.id}>
                    {oc.numero} — {(oc.concepto || "").slice(0, 60)} ·{" "}
                    {fmt.format(oc.total)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Justificación */}
          <div>
            <label className="mb-1 block text-[12.5px] font-medium">
              Justificación <span className="text-danger">*</span>
              <span className="ml-2 text-[10.5px] text-ink-3">
                Mínimo 20 caracteres
              </span>
            </label>
            <textarea
              name="justificacion"
              required
              minLength={20}
              maxLength={2000}
              rows={4}
              placeholder="Por qué este activo/pasivo no está en contabilidad fiscal. Contexto del registro."
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="mb-1 block text-[12.5px] font-medium">
              Observaciones <span className="text-ink-3">(opcional)</span>
            </label>
            <textarea
              name="observaciones"
              maxLength={1000}
              rows={2}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
            />
          </div>

          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-2.5 text-[12.5px] text-danger-deep">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar como borrador"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={pending}
            >
              Cancelar
            </Button>
          </div>

          <p className="border-t border-border pt-3 text-[11px] text-ink-3">
            El ajuste se crea en estado <strong>borrador</strong>. Para que
            aparezca en la vista real, actívalo desde la página de detalle.
          </p>
        </>
      )}
    </form>
  );
}
