"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { DraftRecoveryBanner } from "@/components/shared/draft-recovery-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CATEGORIAS_PERSONAL,
  ESTADOS_CIVILES,
  GENEROS,
} from "@/lib/empleados/schemas";
import {
  initialEmpleadoState,
  type EmpleadoState,
} from "@/lib/empleados/state";
import { useFormDraftDom } from "@/lib/hooks/use-form-draft-dom";
import { ESTADOS_MX } from "@/lib/sat/catalogos";

import { createEmpleado, updateEmpleado } from "./actions";

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

type Domicilio = {
  calle?: string | null;
  numero_exterior?: string | null;
  numero_interior?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  estado?: string | null;
  cp?: string | null;
} | null;

type Emergencia = {
  nombre?: string | null;
  relacion?: string | null;
  telefono?: string | null;
} | null;

type Cuenta = {
  clabe?: string | null;
  banco?: string | null;
} | null;

export type EmpleadoFormDefaults = {
  empresa_id?: string;
  nombre_completo?: string;
  curp?: string;
  rfc?: string | null;
  nss?: string | null;
  fecha_nacimiento?: string | null;
  genero?: string | null;
  estado_civil?: string | null;
  email_personal?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  domicilio?: Domicilio;
  contacto_emergencia?: Emergencia;
  numero_empleado?: string;
  categoria?: string;
  puesto?: string;
  area?: string | null;
  jefe_directo_id?: string | null;
  fecha_ingreso?: string;
  cuenta_bancaria?: Cuenta;
  salario_base?: number | null;
  observaciones?: string | null;
};

type Props = {
  empresasGestionables: Empresa[];
  defaults?: EmpleadoFormDefaults;
  empleadoId?: string;
};

export function EmpleadoForm({
  empresasGestionables,
  defaults,
  empleadoId,
}: Props) {
  const action = empleadoId
    ? (
        prev: EmpleadoState,
        fd: FormData,
      ): ReturnType<typeof updateEmpleado> =>
        updateEmpleado(empleadoId, prev, fd)
    : createEmpleado;
  const [state, formAction] = useFormState(action, initialEmpleadoState);

  const formRef = useRef<HTMLFormElement>(null);
  const formKey = `empleado-form-${empleadoId ?? "nuevo"}`;
  const { showBanner, onInput, applyDraft, discardDraft, clearDraft } =
    useFormDraftDom(formRef, formKey);

  useEffect(() => {
    if (state.ok) clearDraft();
  }, [state.ok, clearDraft]);

  const fieldErr = (k: string) => state.fieldErrors?.[k]?.[0];

  const dom = defaults?.domicilio ?? null;
  const emerg = defaults?.contacto_emergencia ?? null;
  const cuenta = defaults?.cuenta_bancaria ?? null;

  if (empresasGestionables.length === 0) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium">
          No tienes empresas donde puedas dar de alta empleados.
        </p>
        <p className="mt-1 text-muted-foreground">
          Para gestionar personal necesitas rol CEO o Director en la empresa
          contratante.
        </p>
      </div>
    );
  }

  return (
    <>
      {showBanner && (
        <DraftRecoveryBanner
          onRestore={applyDraft}
          onDiscard={discardDraft}
          label="Tienes un borrador sin guardar de este empleado. ¿Restaurarlo?"
        />
      )}
      <form
        ref={formRef}
        action={formAction}
        onInput={onInput}
        onSubmit={() => clearDraft()}
        className="space-y-6"
      >
      {/* Empresa contratante */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Empresa contratante</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Empresa del grupo con la que el empleado tiene relación laboral.
        </p>
        <fieldset className="mt-4 grid grid-cols-2 gap-2">
          {empresasGestionables.map((e) => (
            <label
              key={e.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-secondary"
            >
              <input
                type="radio"
                name="empresa_id"
                value={e.id}
                defaultChecked={defaults?.empresa_id === e.id}
                required
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
        </fieldset>
        {fieldErr("empresa_id") && (
          <p className="mt-2 text-xs text-destructive">{fieldErr("empresa_id")}</p>
        )}
      </section>

      {/* Datos personales */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos personales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Nombre completo"
            name="nombre_completo"
            required
            defaultValue={defaults?.nombre_completo}
            error={fieldErr("nombre_completo")}
            className="sm:col-span-2"
          />
          <Field
            label="CURP"
            name="curp"
            required
            mono
            maxLength={18}
            defaultValue={defaults?.curp}
            error={fieldErr("curp")}
          />
          <Field
            label="RFC"
            name="rfc"
            mono
            maxLength={13}
            defaultValue={defaults?.rfc ?? ""}
            error={fieldErr("rfc")}
          />
          <Field
            label="NSS (IMSS)"
            name="nss"
            mono
            maxLength={11}
            defaultValue={defaults?.nss ?? ""}
            placeholder="11 dígitos"
            error={fieldErr("nss")}
          />
          <Field
            label="Fecha de nacimiento"
            name="fecha_nacimiento"
            type="date"
            defaultValue={defaults?.fecha_nacimiento ?? ""}
          />
          <SelectField
            label="Género"
            name="genero"
            defaultValue={defaults?.genero ?? ""}
            options={[
              { value: "", label: "—" },
              ...GENEROS.map((g) => ({ value: g.value, label: g.label })),
            ]}
          />
          <SelectField
            label="Estado civil"
            name="estado_civil"
            defaultValue={defaults?.estado_civil ?? ""}
            options={[
              { value: "", label: "—" },
              ...ESTADOS_CIVILES.map((e) => ({
                value: e.value,
                label: e.label,
              })),
            ]}
          />
        </div>
      </section>

      {/* Contacto */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Contacto</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            label="Correo personal"
            name="email_personal"
            type="email"
            defaultValue={defaults?.email_personal ?? ""}
            error={fieldErr("email_personal")}
          />
          <Field
            label="Teléfono"
            name="telefono"
            defaultValue={defaults?.telefono ?? ""}
          />
          <Field
            label="WhatsApp"
            name="whatsapp"
            defaultValue={defaults?.whatsapp ?? ""}
          />
        </div>
      </section>

      {/* Domicilio */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Domicilio</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            label="Calle"
            name="dom_calle"
            defaultValue={dom?.calle ?? ""}
            className="sm:col-span-2"
          />
          <Field
            label="Número ext."
            name="dom_numero_exterior"
            defaultValue={dom?.numero_exterior ?? ""}
          />
          <Field
            label="Número int."
            name="dom_numero_interior"
            defaultValue={dom?.numero_interior ?? ""}
          />
          <Field
            label="Colonia"
            name="dom_colonia"
            defaultValue={dom?.colonia ?? ""}
          />
          <Field
            label="CP"
            name="dom_cp"
            maxLength={5}
            defaultValue={dom?.cp ?? ""}
          />
          <Field
            label="Municipio"
            name="dom_municipio"
            defaultValue={dom?.municipio ?? ""}
          />
          <SelectField
            label="Estado"
            name="dom_estado"
            defaultValue={dom?.estado ?? "Sonora"}
            options={[
              { value: "", label: "Selecciona…" },
              ...ESTADOS_MX.map((e) => ({ value: e, label: e })),
            ]}
          />
        </div>
      </section>

      {/* Contacto de emergencia */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Contacto de emergencia</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field
            label="Nombre"
            name="emerg_nombre"
            defaultValue={emerg?.nombre ?? ""}
          />
          <Field
            label="Relación"
            name="emerg_relacion"
            defaultValue={emerg?.relacion ?? ""}
            placeholder="Esposa, padre, hermano…"
          />
          <Field
            label="Teléfono"
            name="emerg_telefono"
            defaultValue={emerg?.telefono ?? ""}
          />
        </div>
      </section>

      {/* Datos laborales */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Datos laborales</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="Número de empleado"
            name="numero_empleado"
            required
            defaultValue={defaults?.numero_empleado}
            error={fieldErr("numero_empleado")}
          />
          <SelectField
            label="Categoría"
            name="categoria"
            required
            defaultValue={defaults?.categoria ?? "planta"}
            options={CATEGORIAS_PERSONAL.map((c) => ({
              value: c.value,
              label: c.label,
            }))}
            error={fieldErr("categoria")}
          />
          <Field
            label="Puesto"
            name="puesto"
            required
            defaultValue={defaults?.puesto}
            error={fieldErr("puesto")}
          />
          <Field
            label="Área / departamento"
            name="area"
            defaultValue={defaults?.area ?? ""}
          />
          <Field
            label="Fecha de ingreso"
            name="fecha_ingreso"
            type="date"
            required
            defaultValue={defaults?.fecha_ingreso}
            error={fieldErr("fecha_ingreso")}
          />
          <Field
            label="Salario base mensual (MXN)"
            name="salario_base"
            type="number"
            min="0"
            step="100"
            defaultValue={
              defaults?.salario_base != null
                ? String(defaults.salario_base)
                : ""
            }
            error={fieldErr("salario_base")}
          />
        </div>
      </section>

      {/* Cuenta bancaria */}
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Cuenta bancaria (nómina)</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label="CLABE"
            name="clabe"
            mono
            maxLength={18}
            defaultValue={cuenta?.clabe ?? ""}
            placeholder="18 dígitos"
            error={fieldErr("clabe")}
          />
          <Field
            label="Banco"
            name="banco"
            defaultValue={cuenta?.banco ?? ""}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Observaciones</h2>
        <textarea
          name="observaciones"
          defaultValue={defaults?.observaciones ?? ""}
          rows={4}
          maxLength={2000}
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      {state.error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <SubmitButton mode={empleadoId ? "edit" : "create"} />
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
  min,
  step,
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
  min?: string;
  step?: string;
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
        min={min}
        step={step}
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
  options: Array<{ value: string; label: string }>;
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
          <option key={o.value} value={o.value}>
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
          ? "Crear empleado"
          : "Guardar cambios"}
    </Button>
  );
}
