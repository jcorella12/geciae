"use client";

import { Mail, MessageCircle, Pencil, Phone, Plus, Star, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  actualizarContacto,
  crearContacto,
  desactivarContacto,
  marcarPrincipal,
} from "./actions";

export type Contacto = {
  id: string;
  nombre: string;
  puesto: string | null;
  email: string | null;
  telefono: string | null;
  whatsapp: string | null;
  tipo: string | null;
  es_principal: boolean | null;
};

const TIPOS = [
  { value: "", label: "—" },
  { value: "comercial", label: "Comercial" },
  { value: "tecnico", label: "Técnico" },
  { value: "cuentas_pagar", label: "Cuentas por pagar" },
  { value: "otro", label: "Otro" },
];

type FormState = {
  nombre: string;
  puesto: string;
  email: string;
  telefono: string;
  whatsapp: string;
  tipo: string;
  es_principal: boolean;
};

const EMPTY: FormState = {
  nombre: "",
  puesto: "",
  email: "",
  telefono: "",
  whatsapp: "",
  tipo: "",
  es_principal: false,
};

export function ContactosList({
  clienteId,
  contactos,
  puedeEditar,
}: {
  clienteId: string;
  contactos: Contacto[];
  puedeEditar: boolean;
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startCreate() {
    setForm({ ...EMPTY, es_principal: contactos.length === 0 });
    setError(null);
    setEditing("new");
  }

  function startEdit(c: Contacto) {
    setForm({
      nombre: c.nombre,
      puesto: c.puesto ?? "",
      email: c.email ?? "",
      telefono: c.telefono ?? "",
      whatsapp: c.whatsapp ?? "",
      tipo: c.tipo ?? "",
      es_principal: !!c.es_principal,
    });
    setError(null);
    setEditing(c.id);
  }

  function cancel() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        nombre: form.nombre,
        puesto: form.puesto,
        email: form.email,
        telefono: form.telefono,
        whatsapp: form.whatsapp,
        tipo: form.tipo,
        es_principal: form.es_principal,
      };
      const res =
        editing === "new"
          ? await crearContacto(clienteId, payload)
          : await actualizarContacto(editing as string, clienteId, payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      cancel();
    });
  }

  async function onEliminar(c: Contacto) {
    if (
      !(await confirm({
        message: `¿Desactivar el contacto "${c.nombre}"? Se conserva el histórico (soft-delete).`,
        danger: true,
        confirmLabel: "Desactivar",
      }))
    )
      return;
    startTransition(async () => {
      const res = await desactivarContacto(c.id, clienteId);
      if (!res.ok) setError(res.error);
    });
  }

  function onMarcarPrincipal(c: Contacto) {
    if (c.es_principal) return;
    startTransition(async () => {
      const res = await marcarPrincipal(c.id, clienteId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Contactos</h2>
          <p className="text-xs text-muted-foreground">
            Personas con las que se opera este cliente. Marca uno como{" "}
            <strong>principal</strong> para que aparezca por default en
            cotizaciones y CFDI.
          </p>
        </div>
        {puedeEditar && editing == null && (
          <Button size="sm" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Agregar contacto
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {editing === "new" && (
        <ContactoForm
          form={form}
          setForm={setForm}
          onSubmit={submit}
          onCancel={cancel}
          pending={pending}
          mode="new"
        />
      )}

      {contactos.length === 0 && editing !== "new" ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Sin contactos.{" "}
          {puedeEditar && (
            <button
              type="button"
              onClick={startCreate}
              className="text-brand hover:underline"
            >
              Crear el primero →
            </button>
          )}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {contactos.map((c) =>
            editing === c.id ? (
              <li key={c.id} className="py-3">
                <ContactoForm
                  form={form}
                  setForm={setForm}
                  onSubmit={submit}
                  onCancel={cancel}
                  pending={pending}
                  mode="edit"
                />
              </li>
            ) : (
              <li
                key={c.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{c.nombre}</span>
                    {c.es_principal && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Principal
                      </span>
                    )}
                    {c.tipo && (
                      <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10.5px] capitalize text-ink-3">
                        {c.tipo.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  {c.puesto && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.puesto}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 text-ink-2 hover:text-brand"
                      >
                        <Mail className="h-3 w-3" /> {c.email}
                      </a>
                    )}
                    {c.telefono && (
                      <a
                        href={`tel:${c.telefono}`}
                        className="inline-flex items-center gap-1 text-ink-2 hover:text-brand"
                      >
                        <Phone className="h-3 w-3" /> {c.telefono}
                      </a>
                    )}
                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-ink-2 hover:text-emerald-600"
                      >
                        <MessageCircle className="h-3 w-3" /> {c.whatsapp}
                      </a>
                    )}
                  </div>
                </div>
                {puedeEditar && editing == null && (
                  <div className="flex items-center gap-1">
                    {!c.es_principal && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMarcarPrincipal(c)}
                        disabled={pending}
                        title="Marcar como principal"
                        aria-label="Marcar como principal"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(c)}
                      disabled={pending}
                      aria-label="Editar contacto"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEliminar(c)}
                      disabled={pending}
                      aria-label="Desactivar contacto"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function ContactoForm({
  form,
  setForm,
  onSubmit,
  onCancel,
  pending,
  mode,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  mode: "new" | "edit";
}) {
  const ok =
    form.nombre.trim().length >= 3 &&
    !!(form.email.trim() || form.telefono.trim() || form.whatsapp.trim());

  return (
    <div className="rounded-md border border-brand/30 bg-brand-soft/20 p-4">
      <p className="mb-3 text-sm font-medium">
        {mode === "new" ? "Nuevo contacto" : "Editar contacto"}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Nombre *</Label>
          <Input
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            className="mt-1 text-sm"
            placeholder="Ej. Carlos Pérez"
            autoFocus
          />
        </div>
        <div>
          <Label className="text-xs">Puesto</Label>
          <Input
            value={form.puesto}
            onChange={(e) => setForm({ ...form, puesto: e.target.value })}
            className="mt-1 text-sm"
            placeholder="Ej. Director comercial"
          />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 text-sm"
            placeholder="contacto@empresa.com"
          />
        </div>
        <div>
          <Label className="text-xs">Teléfono</Label>
          <Input
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            className="mt-1 text-sm"
            placeholder="662 123 4567"
          />
        </div>
        <div>
          <Label className="text-xs">WhatsApp</Label>
          <Input
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            className="mt-1 text-sm"
            placeholder="+52 662 123 4567"
          />
        </div>
        <div>
          <Label className="text-xs">Tipo</Label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.es_principal}
          onChange={(e) =>
            setForm({ ...form, es_principal: e.target.checked })
          }
        />
        Marcar como contacto principal
      </label>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Captura al menos un canal: email, teléfono o WhatsApp.
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSubmit}
          disabled={pending || !ok}
        >
          {pending ? "Guardando…" : mode === "new" ? "Crear" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
