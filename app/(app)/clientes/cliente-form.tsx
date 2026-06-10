"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { CollapsibleSection } from "@/components/shared/collapsible-section";
import { DraftRecoveryBanner } from "@/components/shared/draft-recovery-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormDraftDom } from "@/lib/hooks/use-form-draft-dom";
import {
  ESTADOS_MX,
  REGIMENES_FISCALES,
  USOS_CFDI,
} from "@/lib/cfdi/catalogos-sat";
import { TIPOS_CLIENTE, RIESGOS } from "@/lib/clientes/schemas";

import {
  initialClienteState,
  type ClienteState,
} from "@/lib/clientes/state";

import { createCliente, updateCliente } from "./actions";

const empresaCodigoColor: Record<string, string> = {
  PSE: "bg-pse",
  CIAE: "bg-ciae",
  IED: "bg-ied",
  LIMSON: "bg-limson",
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

export type ClienteFormDefaults = {
  id?: string;
  razon_social?: string;
  nombre_comercial?: string | null;
  rfc?: string;
  curp?: string | null;
  regimen_fiscal?: string;
  cp_fiscal?: string;
  direccion_fiscal?: Direccion;
  email_facturacion?: string | null;
  uso_cfdi_default?: string | null;
  tipo?: string | null;
  segmento?: string | null;
  riesgo?: string;
  observaciones?: string | null;
  empresaIds?: string[];
};

type Props = {
  empresas: Empresa[];
  defaults?: ClienteFormDefaults;
  /** Si está, se edita; si no, crea. */
  clienteId?: string;
};

export function ClienteForm({ empresas, defaults, clienteId }: Props) {
  const action = clienteId
    ? (
        prev: ClienteState,
        fd: FormData,
      ): ReturnType<typeof updateCliente> => updateCliente(clienteId, prev, fd)
    : createCliente;
  const [state, formAction] = useFormState(action, initialClienteState);

  const formRef = useRef<HTMLFormElement>(null);
  const formKey = `cliente-form-${clienteId ?? "nuevo"}`;
  const { showBanner, onInput, applyDraft, discardDraft, clearDraft } =
    useFormDraftDom(formRef, formKey);

  // Limpiar draft tras submit exitoso (state.ok pasa a true en redirect path).
  useEffect(() => {
    if (state.ok) clearDraft();
  }, [state.ok, clearDraft]);

  const direccion = defaults?.direccion_fiscal ?? null;
  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];

  return (
    <>
      {showBanner && (
        <DraftRecoveryBanner
          onRestore={applyDraft}
          onDiscard={discardDraft}
          label="Tienes un borrador sin guardar de este cliente. ¿Restaurarlo?"
        />
      )}
      <form
        ref={formRef}
        action={formAction}
        onInput={onInput}
        onSubmit={() => {
          // En éxito hace redirect() (state.ok nunca llega al cliente).
          // Limpiamos draft al submit; si falla validación los inputs
          // uncontrolled retienen sus valores y el usuario puede corregir.
          clearDraft();
        }}
        className="space-y-6"
      >
      {/* Alta express: identidad mínima del cliente */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos del cliente</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Lo mínimo para registrarlo. Los datos fiscales (RFC, régimen, CP)
          van abajo — se piden como candado al facturar. Sin RFC, el cliente
          queda como <strong>potencial</strong>.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Razón social / nombre"
            name="razon_social"
            required
            defaultValue={defaults?.razon_social}
            error={fieldErr("razon_social")}
            className="sm:col-span-2"
          />
          <Field
            label="Nombre comercial · opcional"
            name="nombre_comercial"
            defaultValue={defaults?.nombre_comercial ?? ""}
            error={fieldErr("nombre_comercial")}
          />
          <SelectField
            label="Tipo de cliente · opcional"
            name="tipo"
            defaultValue={defaults?.tipo ?? ""}
            options={[
              { value: "", label: "Sin clasificar" },
              ...TIPOS_CLIENTE.map((t) => ({ value: t.value, label: t.label })),
            ]}
          />
        </div>
      </section>

      {/* Datos fiscales — opcional, candado al facturar */}
      <CollapsibleSection
        title="Datos fiscales · opcional"
        hint="RFC, régimen, CP y domicilio. Se exigen al emitir CFDI; sin ellos el cliente es potencial."
        defaultOpen={Boolean(defaults?.rfc)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="RFC"
            name="rfc"
            defaultValue={defaults?.rfc ?? ""}
            placeholder="ABC010101AB1"
            mono
            maxLength={13}
            error={fieldErr("rfc")}
          />
          <Field
            label="CURP (solo persona física)"
            name="curp"
            defaultValue={defaults?.curp ?? ""}
            placeholder="ABCD010101HSPRRN09"
            mono
            maxLength={18}
            error={fieldErr("curp")}
          />
          <SelectField
            label="Régimen fiscal"
            name="regimen_fiscal"
            defaultValue={defaults?.regimen_fiscal ?? ""}
            error={fieldErr("regimen_fiscal")}
            options={[
              { value: "", label: "Selecciona…" },
              ...REGIMENES_FISCALES.map((r) => ({
                value: r.codigo,
                label: `${r.codigo} — ${r.nombre}`,
              })),
            ]}
          />
          <Field
            label="CP fiscal"
            name="cp_fiscal"
            defaultValue={defaults?.cp_fiscal ?? ""}
            placeholder="83000"
            maxLength={5}
            error={fieldErr("cp_fiscal")}
          />
          <Field
            label="Correo de facturación"
            name="email_facturacion"
            type="email"
            defaultValue={defaults?.email_facturacion ?? ""}
            error={fieldErr("email_facturacion")}
            placeholder="cuentas@cliente.com.mx"
          />
          <SelectField
            label="Uso de CFDI por defecto"
            name="uso_cfdi_default"
            defaultValue={defaults?.uso_cfdi_default ?? ""}
            options={[
              { value: "", label: "Sin definir" },
              ...USOS_CFDI.map((u) => ({
                value: u.codigo,
                label: `${u.codigo} — ${u.nombre}`,
              })),
            ]}
          />
        </div>
        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Domicilio fiscal
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Calle"
            name="calle"
            defaultValue={direccion?.calle ?? ""}
            className="sm:col-span-2"
          />
          <Field
            label="Número exterior"
            name="numero_exterior"
            defaultValue={direccion?.numero_exterior ?? ""}
          />
          <Field
            label="Número interior"
            name="numero_interior"
            defaultValue={direccion?.numero_interior ?? ""}
          />
          <Field
            label="Colonia"
            name="colonia"
            defaultValue={direccion?.colonia ?? ""}
          />
          <Field
            label="Municipio / Alcaldía"
            name="municipio"
            defaultValue={direccion?.municipio ?? ""}
          />
          <SelectField
            label="Estado"
            name="estado"
            defaultValue={direccion?.estado ?? "Sonora"}
            options={[
              { value: "", label: "Selecciona…" },
              ...ESTADOS_MX.map((e) => ({ value: e, label: e })),
            ]}
          />
          <Field
            label="País"
            name="pais"
            defaultValue={direccion?.pais ?? "México"}
          />
        </div>
      </CollapsibleSection>

      {/* Comercial */}
      <CollapsibleSection
        title="Comercial · opcional"
        hint="Segmento y riesgo para clasificación interna."
        defaultOpen={Boolean(defaults?.segmento)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Segmento"
            name="segmento"
            defaultValue={defaults?.segmento ?? ""}
            placeholder="Industrial pequeño"
          />
          <SelectField
            label="Riesgo"
            name="riesgo"
            defaultValue={defaults?.riesgo ?? "bajo"}
            options={RIESGOS.map((r) => ({ value: r.value, label: r.label }))}
          />
        </div>
      </CollapsibleSection>

      {/* Vinculación con empresas del grupo */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">
          Empresas del grupo que lo atienden
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marca las empresas de GECIAE que operan con este cliente. Un cliente
          puede ser atendido por más de una empresa.
        </p>

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

      {/* Notas */}
      <CollapsibleSection
        title="Observaciones"
        hint="Notas internas — no visibles al cliente."
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

      <div className="flex items-center gap-3">
        <SubmitButton mode={clienteId ? "edit" : "create"} />
      </div>
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
  value,
  onChange,
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
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  error?: string;
  mono?: boolean;
  maxLength?: number;
}) {
  const isControlled = value !== undefined && onChange !== undefined;
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {isControlled ? (
        <Input
          id={name}
          name={name}
          type={type}
          required={required}
          value={value}
          onChange={(e) => onChange!(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={mono ? "font-mono uppercase" : undefined}
        />
      ) : (
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
      )}
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
          ? "Crear cliente"
          : "Guardar cambios"}
    </Button>
  );
}
