"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import {
  QuickCreateClientePotencialForm,
  type ClientePotencialQuickItem,
} from "@/components/shared/quick-create-cliente-potencial-form";
import { QuickCreatePicker } from "@/components/shared/quick-create-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ETAPAS_PIPELINE,
  ETAPAS_TERMINALES,
  ETIQUETA_ESTADO_OPORTUNIDAD,
  ETIQUETA_FUENTE,
  PROBABILIDAD_DEFAULT,
  initialOportunidadState,
  type EstadoOportunidad,
  type FuenteOportunidad,
} from "@/lib/oportunidades/state";

import {
  actualizarOportunidad,
  crearOportunidad,
} from "./actions";

type Empresa = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

type Cliente = {
  id: string;
  razon_social: string;
  /** Puede ser null para clientes potenciales (sin RFC todavía). */
  rfc: string | null;
  nombre_comercial: string | null;
  es_potencial?: boolean | null;
};

type Vendedor = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type Defaults = {
  empresa_id?: string;
  cliente_id?: string;
  vendedor_id?: string | null;
  nombre?: string;
  descripcion?: string | null;
  estado?: EstadoOportunidad;
  monto_estimado?: number | null;
  probabilidad?: number | null;
  fuente?: string | null;
  fecha_proxima_accion?: string | null;
  proxima_accion?: string | null;
  fecha_cierre_estimada?: string | null;
  observaciones?: string | null;
};

const FUENTES = Object.keys(ETIQUETA_FUENTE) as FuenteOportunidad[];

export function OportunidadForm({
  empresas,
  clientes: clientesIniciales,
  vendedores,
  oportunidadId,
  defaults,
}: {
  empresas: Empresa[];
  clientes: Cliente[];
  vendedores: Vendedor[];
  oportunidadId?: string;
  defaults?: Defaults;
}) {
  const router = useRouter();
  const action = oportunidadId
    ? actualizarOportunidad.bind(null, oportunidadId)
    : crearOportunidad;
  const [state, formAction] = useFormState(action, initialOportunidadState);

  const [estado, setEstado] = useState<EstadoOportunidad>(
    defaults?.estado ?? "lead",
  );
  const [probabilidad, setProbabilidad] = useState<number>(
    defaults?.probabilidad ?? PROBABILIDAD_DEFAULT[defaults?.estado ?? "lead"],
  );
  const [clienteId, setClienteId] = useState(defaults?.cliente_id ?? "");
  const [empresaId, setEmpresaId] = useState(defaults?.empresa_id ?? "");
  // Lista local de clientes para soportar Quick Create de potenciales
  const [clientes, setClientes] = useState(clientesIniciales);

  // Auto-ajustar probabilidad cuando cambia estado (si no se ha tocado manual)
  useEffect(() => {
    setProbabilidad(PROBABILIDAD_DEFAULT[estado]);
  }, [estado]);

  useEffect(() => {
    if (state.ok && state.oportunidadId) {
      router.push(`/comercial/oportunidades/${state.oportunidadId}`);
    }
  }, [state.ok, state.oportunidadId, router]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Identificación</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="empresa_id" className="text-sm">
              Empresa *
            </Label>
            <select
              id="empresa_id"
              name="empresa_id"
              required
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} · {e.nombre_comercial ?? e.razon_social}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="vendedor_id" className="text-sm">
              Vendedor asignado
            </Label>
            <select
              id="vendedor_id"
              name="vendedor_id"
              defaultValue={defaults?.vendedor_id ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Yo mismo —</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.full_name ?? v.email ?? v.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="nombre" className="text-sm">
              Nombre de la oportunidad *
            </Label>
            <Input
              id="nombre"
              name="nombre"
              required
              defaultValue={defaults?.nombre ?? ""}
              placeholder="Ej: Instalación SFV 50kW · Hotel del Centro"
              className="mt-1"
            />
          </div>

          <div className="col-span-2">
            <Label className="text-sm">Cliente *</Label>
            <QuickCreatePicker<Cliente>
              items={clientes}
              value={clienteId}
              onChange={setClienteId}
              inputName="cliente_id"
              required
              placeholder="Buscar cliente o crear uno potencial…"
              getLabel={(c) =>
                `${c.razon_social}${
                  c.rfc ? ` · ${c.rfc}` : c.es_potencial ? " · (potencial)" : ""
                }`
              }
              getSecondary={(c) =>
                c.nombre_comercial ?? null
              }
              matchesQuery={(c, q) =>
                c.razon_social.toLowerCase().includes(q) ||
                (c.rfc ?? "").toLowerCase().includes(q) ||
                (c.nombre_comercial ?? "").toLowerCase().includes(q)
              }
              newItemLabel="Cliente potencial (sin RFC)"
              renderCreateForm={({ onCreated, onCancel, initialQuery }) => (
                <QuickCreateClientePotencialForm
                  empresaId={empresaId || null}
                  initialNombre={initialQuery}
                  onCreated={(c: ClientePotencialQuickItem) => {
                    const nuevo: Cliente = {
                      id: c.id,
                      razon_social: c.razon_social,
                      rfc: c.rfc,
                      nombre_comercial: c.nombre_comercial,
                      es_potencial: c.es_potencial,
                    };
                    setClientes((prev) => [nuevo, ...prev]);
                    onCreated(nuevo);
                  }}
                  onCancel={onCancel}
                />
              )}
            />
            {clienteId &&
              clientes.find((c) => c.id === clienteId)?.es_potencial && (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  Cliente potencial · sin RFC
                </p>
              )}
          </div>
          <div className="col-span-2">
            <Label htmlFor="descripcion" className="text-sm">
              Descripción
            </Label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={3}
              defaultValue={defaults?.descripcion ?? ""}
              placeholder="Detalle del proyecto, alcance, antecedentes…"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Etapa y valor</h2>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="estado" className="text-sm">
              Etapa *
            </Label>
            <select
              id="estado"
              name="estado"
              required
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoOportunidad)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ETAPAS_PIPELINE.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_OPORTUNIDAD[e]}
                </option>
              ))}
              {ETAPAS_TERMINALES.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_OPORTUNIDAD[e]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="monto_estimado" className="text-sm">
              Monto estimado
            </Label>
            <Input
              id="monto_estimado"
              name="monto_estimado"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaults?.monto_estimado ?? ""}
              placeholder="0.00"
              className="mt-1 tnum"
            />
          </div>
          <div>
            <Label htmlFor="probabilidad" className="text-sm">
              Probabilidad ({Math.round(probabilidad * 100)}%)
            </Label>
            <input
              id="probabilidad"
              name="probabilidad"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={probabilidad}
              onChange={(e) => setProbabilidad(parseFloat(e.target.value))}
              className="mt-3 w-full"
            />
          </div>
          <div>
            <Label htmlFor="fuente" className="text-sm">
              Fuente
            </Label>
            <select
              id="fuente"
              name="fuente"
              defaultValue={defaults?.fuente ?? ""}
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Sin especificar —</option>
              {FUENTES.map((f) => (
                <option key={f} value={f}>
                  {ETIQUETA_FUENTE[f]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="fecha_cierre_estimada" className="text-sm">
              Fecha cierre estimada
            </Label>
            <Input
              id="fecha_cierre_estimada"
              name="fecha_cierre_estimada"
              type="date"
              defaultValue={defaults?.fecha_cierre_estimada ?? ""}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Próxima acción</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fecha_proxima_accion" className="text-sm">
              Cuándo
            </Label>
            <Input
              id="fecha_proxima_accion"
              name="fecha_proxima_accion"
              type="date"
              defaultValue={defaults?.fecha_proxima_accion ?? today}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="proxima_accion" className="text-sm">
              Qué
            </Label>
            <Input
              id="proxima_accion"
              name="proxima_accion"
              defaultValue={defaults?.proxima_accion ?? ""}
              placeholder="Llamar para agendar visita técnica"
              className="mt-1"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Observaciones</h2>
        <textarea
          name="observaciones"
          rows={4}
          defaultValue={defaults?.observaciones ?? ""}
          placeholder="Contexto adicional, relación con otros proyectos, decisores, etc."
          className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </section>

      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-ink-3 hover:text-ink-1"
        >
          Cancelar
        </button>
        <SubmitBtn edit={Boolean(oportunidadId)} clienteSet={Boolean(clienteId)} />
      </div>
    </form>
  );
}

function SubmitBtn({
  edit,
  clienteSet,
}: {
  edit: boolean;
  clienteSet: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !clienteSet}>
      {pending ? (edit ? "Guardando…" : "Creando…") : edit ? "Guardar" : "Crear oportunidad"}
    </Button>
  );
}
