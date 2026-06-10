"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { CollapsibleSection } from "@/components/shared/collapsible-section";
import { DraftRecoveryBanner } from "@/components/shared/draft-recovery-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormDraftDom } from "@/lib/hooks/use-form-draft-dom";
import {
  CLASIFICACIONES_PROVEEDOR,
  SEMAFOROS,
  TIPOS_PROVEEDOR,
} from "@/lib/proveedores/schemas";
import {
  initialProveedorState,
  type ProveedorState,
} from "@/lib/proveedores/state";
import { ESTADOS_MX, REGIMENES_FISCALES } from "@/lib/cfdi/catalogos-sat";

import { createProveedor, updateProveedor } from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
};

const semaforoBadge: Record<string, string> = {
  verde: "bg-success/15 text-success",
  amarillo: "bg-warning/15 text-foreground",
  rojo: "bg-destructive/15 text-destructive",
  negro: "bg-foreground/10 text-foreground",
};

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Direccion = {
  calle?: string | null;
  numero_exterior?: string | null;
  numero_interior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  pais?: string | null;
} | null;

type Cuenta = {
  clabe?: string | null;
  banco?: string | null;
  titular?: string | null;
} | null;

export type ProveedorFormDefaults = {
  razon_social?: string;
  nombre_comercial?: string | null;
  rfc?: string;
  curp?: string | null;
  regimen_fiscal?: string;
  cp_fiscal?: string;
  direccion_fiscal?: Direccion;
  representante_legal?: string | null;
  rfc_representante?: string | null;
  tipo_proveedor?: string | null;
  categoria_sat?: string | null;
  clasificacion_interna?: string | null;
  requiere_repse?: boolean;
  cuenta_bancaria?: Cuenta;
  semaforo?: string;
  esta_aprobado?: boolean;
  fecha_aprobacion?: string | null;
  observaciones?: string | null;
  empresaIds?: string[];
};

type Props = {
  empresas: Empresa[];
  defaults?: ProveedorFormDefaults;
  proveedorId?: string;
};

export function ProveedorForm({ empresas, defaults, proveedorId }: Props) {
  const action = proveedorId
    ? (
        prev: ProveedorState,
        fd: FormData,
      ): ReturnType<typeof updateProveedor> =>
        updateProveedor(proveedorId, prev, fd)
    : createProveedor;
  const [state, formAction] = useFormState(action, initialProveedorState);
  const [estaAprobado, setEstaAprobado] = useState(
    defaults?.esta_aprobado ?? false,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const formKey = `proveedor-form-${proveedorId ?? "nuevo"}`;
  const { showBanner, onInput, applyDraft, discardDraft, clearDraft } =
    useFormDraftDom(formRef, formKey);

  useEffect(() => {
    if (state.ok) clearDraft();
  }, [state.ok, clearDraft]);

  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];
  const direccion = defaults?.direccion_fiscal ?? null;
  const cuenta = defaults?.cuenta_bancaria ?? null;

  return (
    <>
      {showBanner && (
        <DraftRecoveryBanner
          onRestore={applyDraft}
          onDiscard={discardDraft}
          label="Tienes un borrador sin guardar de este proveedor. ¿Restaurarlo?"
        />
      )}
      <form
        ref={formRef}
        action={formAction}
        onInput={onInput}
        onSubmit={() => clearDraft()}
        className="space-y-6"
      >
      {/* Alta express: identidad mínima */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos del proveedor</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Lo mínimo para registrarlo. Régimen, CP, domicilio y banco van
          abajo — se completan al subir su documentación.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Razón social" name="razon_social" required defaultValue={defaults?.razon_social} error={fieldErr("razon_social")} />
          <Field label="RFC" name="rfc" required mono maxLength={13} defaultValue={defaults?.rfc} placeholder="ABC010101AB1" error={fieldErr("rfc")} />
          <Field label="Nombre comercial · opcional" name="nombre_comercial" defaultValue={defaults?.nombre_comercial ?? ""} />
        </div>
      </section>

      {/* Datos fiscales — opcional */}
      <CollapsibleSection
        title="Datos fiscales · opcional"
        hint="Régimen, CP, CURP y representante legal. Se piden al facturar/recibir CFDI."
        defaultOpen={Boolean(defaults?.regimen_fiscal || defaults?.cp_fiscal)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Régimen fiscal"
            name="regimen_fiscal"
            defaultValue={defaults?.regimen_fiscal ?? ""}
            options={[
              { value: "", label: "Selecciona…" },
              ...REGIMENES_FISCALES.map((r) => ({
                value: r.codigo,
                label: `${r.codigo} — ${r.nombre}`,
              })),
            ]}
            error={fieldErr("regimen_fiscal")}
          />
          <Field label="CP fiscal" name="cp_fiscal" maxLength={5} defaultValue={defaults?.cp_fiscal} error={fieldErr("cp_fiscal")} />
          <Field label="CURP (solo PF)" name="curp" mono maxLength={18} defaultValue={defaults?.curp ?? ""} error={fieldErr("curp")} />
          <Field label="Representante legal" name="representante_legal" defaultValue={defaults?.representante_legal ?? ""} />
          <Field label="RFC del representante" name="rfc_representante" mono maxLength={13} defaultValue={defaults?.rfc_representante ?? ""} />
        </div>
      </CollapsibleSection>

      {/* Domicilio fiscal */}
      <CollapsibleSection
        title="Domicilio fiscal"
        hint="Opcional — se carga del CSF si lo subes."
        defaultOpen={Boolean(direccion?.calle || direccion?.colonia)}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Calle" name="calle" defaultValue={direccion?.calle ?? ""} className="sm:col-span-2" />
          <Field label="Número ext." name="numero_exterior" defaultValue={direccion?.numero_exterior ?? ""} />
          <Field label="Número int." name="numero_interior" defaultValue={direccion?.numero_interior ?? ""} />
          <Field label="Colonia" name="colonia" defaultValue={direccion?.colonia ?? ""} />
          <Field label="Municipio" name="municipio" defaultValue={direccion?.municipio ?? ""} />
          <SelectField
            label="Estado"
            name="estado"
            defaultValue={direccion?.estado ?? "Sonora"}
            options={[
              { value: "", label: "Selecciona…" },
              ...ESTADOS_MX.map((e) => ({ value: e, label: e })),
            ]}
          />
          <Field label="País" name="pais" defaultValue={direccion?.pais ?? "México"} />
        </div>
      </CollapsibleSection>

      {/* Comercial */}
      <CollapsibleSection
        title="Clasificación comercial"
        hint="Tipo de proveedor, clasificación interna, REPSE."
        defaultOpen={Boolean(
          defaults?.tipo_proveedor || defaults?.clasificacion_interna || defaults?.requiere_repse,
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Tipo de proveedor"
            name="tipo_proveedor"
            defaultValue={defaults?.tipo_proveedor ?? ""}
            options={[
              { value: "", label: "Sin clasificar" },
              ...TIPOS_PROVEEDOR.map((t) => ({ value: t.value, label: t.label })),
            ]}
          />
          <SelectField
            label="Clasificación interna"
            name="clasificacion_interna"
            defaultValue={defaults?.clasificacion_interna ?? ""}
            options={[
              { value: "", label: "Sin clasificar" },
              ...CLASIFICACIONES_PROVEEDOR.map((c) => ({
                value: c.value,
                label: c.label,
              })),
            ]}
          />
          <Field label="Categoría SAT" name="categoria_sat" defaultValue={defaults?.categoria_sat ?? ""} />
          <label className="mt-7 flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiere_repse"
              defaultChecked={defaults?.requiere_repse ?? false}
              className="h-4 w-4"
            />
            Requiere padrón REPSE (subcontratación)
          </label>
        </div>
      </CollapsibleSection>

      {/* Cuenta bancaria */}
      <CollapsibleSection
        title="Cuenta bancaria"
        hint="Para pagos. Sensible — capturar solo si el proveedor está aprobado."
        defaultOpen={Boolean(cuenta?.clabe || cuenta?.banco)}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="CLABE" name="clabe" mono maxLength={18} defaultValue={cuenta?.clabe ?? ""} placeholder="18 dígitos" />
          <Field label="Banco" name="banco" defaultValue={cuenta?.banco ?? ""} placeholder="BBVA / Banamex / etc." />
          <Field label="Titular" name="titular" defaultValue={cuenta?.titular ?? ""} />
        </div>
      </CollapsibleSection>

      {/* Cumplimiento */}
      <CollapsibleSection
        title="Cumplimiento"
        hint="Semáforo + aprobación. Default: verde / no aprobado. Sprint 4 lo automatiza desde docs."
        defaultOpen={
          (defaults?.semaforo != null && defaults.semaforo !== "verde") ||
          Boolean(defaults?.esta_aprobado)
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Semáforo</legend>
            {SEMAFOROS.map((s) => (
              <label
                key={s.value}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
              >
                <input
                  type="radio"
                  name="semaforo"
                  value={s.value}
                  defaultChecked={(defaults?.semaforo ?? "verde") === s.value}
                  className="mt-1 h-4 w-4"
                />
                <span className="flex-1">
                  <span
                    className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs ${
                      semaforoBadge[s.value] ?? "bg-secondary"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {s.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="esta_aprobado"
                checked={estaAprobado}
                onChange={(e) => setEstaAprobado(e.target.checked)}
                className="h-4 w-4"
              />
              Proveedor aprobado por el grupo
            </label>
            {estaAprobado && (
              <Field
                label="Fecha de aprobación"
                name="fecha_aprobacion"
                type="date"
                defaultValue={defaults?.fecha_aprobacion ?? ""}
                error={fieldErr("fecha_aprobacion")}
              />
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Empresas que lo usan */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresas del grupo que lo usan</h2>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {empresas.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="checkbox"
                name="empresaIds"
                value={e.id}
                defaultChecked={defaults?.empresaIds?.includes(e.id) ?? false}
                className="h-4 w-4"
              />
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  empresaCodigoColor[e.codigo] ?? "bg-muted-foreground"
                }`}
              />
              <span className="truncate">
                {e.nombre_comercial ?? e.razon_social}
              </span>
            </label>
          ))}
        </div>
      </section>

      <CollapsibleSection
        title="Observaciones"
        defaultOpen={Boolean(defaults?.observaciones)}
      >
        <textarea
          name="observaciones"
          defaultValue={defaults?.observaciones ?? ""}
          rows={4}
          maxLength={2000}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </CollapsibleSection>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton mode={proveedorId ? "edit" : "create"} />
    </form>
    </>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  defaultValue,
  placeholder,
  className,
  error,
  mono,
  maxLength,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  defaultValue?: string | null;
  placeholder?: string;
  className?: string;
  error?: string;
  mono?: boolean;
  maxLength?: number;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        maxLength={maxLength}
        className={mono ? "font-mono uppercase" : undefined}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  required,
  defaultValue,
  options,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending
        ? mode === "create"
          ? "Creando…"
          : "Guardando…"
        : mode === "create"
          ? "Crear proveedor"
          : "Guardar cambios"}
    </Button>
  );
}
