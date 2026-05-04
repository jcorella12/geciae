"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DESCRIPCION_TIPO_SOLICITUD,
  ETIQUETA_TIPO_SOLICITUD,
  initialSolicitudState,
  TIPOS_SOLICITUD,
  type TipoSolicitud,
  type UrgenciaSolicitud,
} from "@/lib/solicitudes/state";

import { crearSolicitud } from "./actions";

const URGENCIAS: UrgenciaSolicitud[] = ["baja", "normal", "alta", "critica"];

/**
 * Form para crear una solicitud. Los campos contextuales por tipo se
 * empaquetan en el JSON `campos_tipo` y se envían como un input hidden.
 *
 * Nota: por simplicidad, los pickers contextuales (proveedor, servicio)
 * se implementan como `<select>` simples llenos con la data del padre.
 * Quien quiera el QuickCreatePicker de sprint 2.1 lo puede sustituir aquí
 * sin tocar el server action (sigue recibiendo IDs).
 */
export function NuevaSolicitudForm({
  proyectoId,
  empresaId,
  proyectoCodigo,
  clienteId,
  clienteRazonSocial,
  empresasGrupo,
  serviciosGrupo,
  proveedores,
  onCreated,
}: {
  proyectoId: string;
  empresaId: string;
  proyectoCodigo: string;
  clienteId: string | null;
  clienteRazonSocial: string | null;
  empresasGrupo: Array<{ id: string; codigo: string; nombre: string }>;
  serviciosGrupo: Array<{
    id: string;
    empresa_id: string;
    codigo: string;
    nombre: string;
  }>;
  proveedores: Array<{
    id: string;
    razon_social: string;
    nombre_comercial: string | null;
  }>;
  onCreated?: (id: string) => void;
}) {
  const [state, formAction] = useFormState(
    crearSolicitud,
    initialSolicitudState,
  );
  const [tipo, setTipo] = useState<TipoSolicitud>("compra");
  // Campos contextuales por tipo
  const [proveedorId, setProveedorId] = useState("");
  const [empresaDestino, setEmpresaDestino] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [hito, setHito] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [requiereCEO, setRequiereCEO] = useState(false);
  const [concepto, setConcepto] = useState("");

  const camposTipo = useMemo(() => {
    switch (tipo) {
      case "compra":
        return proveedorId ? { proveedor_id: proveedorId } : {};
      case "facturacion":
        return {
          ...(hito ? { hito } : {}),
          ...(clienteId ? { cliente_id: clienteId } : {}),
        };
      case "anticipo_proveedor":
        return {
          ...(proveedorId ? { proveedor_id: proveedorId } : {}),
          ...(porcentaje ? { porcentaje: Number(porcentaje) } : {}),
        };
      case "cambio_alcance":
        return { requiere_ceo: requiereCEO };
      case "reembolso_gasto":
        return concepto ? { concepto } : {};
      case "ot_inter_co":
        return {
          ...(empresaDestino ? { empresa_destino_id: empresaDestino } : {}),
          ...(servicioId ? { servicio_id: servicioId } : {}),
        };
      case "generica":
      default:
        return {};
    }
  }, [
    tipo,
    proveedorId,
    empresaDestino,
    servicioId,
    hito,
    porcentaje,
    requiereCEO,
    concepto,
    clienteId,
  ]);

  useEffect(() => {
    if (state.ok && state.solicitudId) onCreated?.(state.solicitudId);
  }, [state.ok, state.solicitudId, onCreated]);

  // Servicios filtrados a la empresa destino seleccionada (para OT inter-co)
  const serviciosDestino = useMemo(
    () =>
      empresaDestino
        ? serviciosGrupo.filter((s) => s.empresa_id === empresaDestino)
        : [],
    [empresaDestino, serviciosGrupo],
  );

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-[13.5px] font-semibold">Nueva solicitud</h3>
        <p className="text-[11.5px] text-ink-3">
          Para administración del proyecto {proyectoCodigo}.
        </p>
      </header>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="proyecto_id" value={proyectoId} />
        <input type="hidden" name="campos_tipo" value={JSON.stringify(camposTipo)} />

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="ns_tipo" className="text-[11.5px]">
              Tipo *
            </Label>
            <select
              id="ns_tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoSolicitud)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {TIPOS_SOLICITUD.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETA_TIPO_SOLICITUD[t]}
                </option>
              ))}
            </select>
            <p className="text-[10.5px] text-ink-3">
              {DESCRIPCION_TIPO_SOLICITUD[tipo]}
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ns_urgencia" className="text-[11.5px]">
              Urgencia
            </Label>
            <select
              id="ns_urgencia"
              name="urgencia"
              defaultValue="normal"
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              {URGENCIAS.map((u) => (
                <option key={u} value={u}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ns_titulo" className="text-[11.5px]">
            Título *
          </Label>
          <Input
            id="ns_titulo"
            name="titulo"
            required
            minLength={3}
            maxLength={200}
            placeholder="Ej: Comprar 50 m de cable AWG #6"
            className="h-9"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ns_descripcion" className="text-[11.5px]">
            Descripción
          </Label>
          <textarea
            id="ns_descripcion"
            name="descripcion"
            rows={3}
            maxLength={4000}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Detalle: especificaciones, motivo, fechas relevantes…"
          />
        </div>

        {(tipo === "compra" ||
          tipo === "facturacion" ||
          tipo === "anticipo_proveedor" ||
          tipo === "reembolso_gasto" ||
          tipo === "cambio_alcance" ||
          tipo === "ot_inter_co") && (
          <div className="space-y-1">
            <Label htmlFor="ns_monto" className="text-[11.5px]">
              Monto estimado (MXN)
            </Label>
            <Input
              id="ns_monto"
              name="monto_estimado"
              type="number"
              min="0"
              step="0.01"
              className="h-9 font-mono"
            />
          </div>
        )}

        {/* Campos contextuales por tipo */}
        {tipo === "compra" && (
          <div className="space-y-1">
            <Label htmlFor="ns_prov" className="text-[11.5px]">
              Proveedor sugerido (opcional)
            </Label>
            <select
              id="ns_prov"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— Sin sugerir —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre_comercial ?? p.razon_social}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipo === "facturacion" && (
          <>
            <div className="space-y-1">
              <Label htmlFor="ns_hito" className="text-[11.5px]">
                Hito a facturar
              </Label>
              <Input
                id="ns_hito"
                value={hito}
                onChange={(e) => setHito(e.target.value)}
                maxLength={200}
                placeholder="Ej: Anticipo 30%, Avance 60%, Cierre"
                className="h-9"
              />
            </div>
            {clienteRazonSocial && (
              <p className="text-[11px] text-ink-3">
                Cliente: <strong>{clienteRazonSocial}</strong> (auto)
              </p>
            )}
          </>
        )}

        {tipo === "anticipo_proveedor" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ns_prov_a" className="text-[11.5px]">
                Proveedor *
              </Label>
              <select
                id="ns_prov_a"
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">— Selecciona —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre_comercial ?? p.razon_social}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ns_pct" className="text-[11.5px]">
                % del total (0–100)
              </Label>
              <Input
                id="ns_pct"
                type="number"
                min="0"
                max="100"
                step="1"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                className="h-9 font-mono"
              />
            </div>
          </div>
        )}

        {tipo === "cambio_alcance" && (
          <label className="inline-flex items-center gap-2 text-[12px]">
            <input
              type="checkbox"
              checked={requiereCEO}
              onChange={(e) => setRequiereCEO(e.target.checked)}
            />
            Requiere aprobación del CEO
          </label>
        )}

        {tipo === "reembolso_gasto" && (
          <div className="space-y-1">
            <Label htmlFor="ns_concepto" className="text-[11.5px]">
              Concepto del gasto
            </Label>
            <Input
              id="ns_concepto"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              maxLength={200}
              placeholder="Ej: Hospedaje viaje a sitio"
              className="h-9"
            />
          </div>
        )}

        {tipo === "ot_inter_co" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ns_emp_d" className="text-[11.5px]">
                Empresa destino *
              </Label>
              <select
                id="ns_emp_d"
                value={empresaDestino}
                onChange={(e) => {
                  setEmpresaDestino(e.target.value);
                  setServicioId("");
                }}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">— Selecciona —</option>
                {empresasGrupo
                  .filter((e) => e.id !== empresaId)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.codigo} — {e.nombre}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ns_serv" className="text-[11.5px]">
                Servicio
              </Label>
              <select
                id="ns_serv"
                value={servicioId}
                onChange={(e) => setServicioId(e.target.value)}
                disabled={!empresaDestino}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">
                  {empresaDestino
                    ? "— Selecciona —"
                    : "Selecciona destino primero"}
                </option>
                {serviciosDestino.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.codigo} — {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {state.error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11.5px] text-destructive">
            {state.error}
          </p>
        )}

        <Submit />
      </form>
    </section>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Creando…" : "Crear solicitud"}
    </Button>
  );
}
