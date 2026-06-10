import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type EmpresaOpcion = {
  id: string;
  codigo: string;
  razon_social: string;
  nombre_comercial: string | null;
};

/**
 * Valores precargados del activo (modo edición). En creación se omite y los
 * campos usan sus defaults. Acepta el shape de la fila `activos_grupo`.
 */
export type ActivoDefaults = {
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  anio_fabricacion?: number | null;
  capacidad?: string | null;
  empresa_propietaria_id?: string | null;
  fecha_adquisicion?: string | null;
  costo_adquisicion?: number | null;
  vida_util_anios?: number | null;
  valor_residual_pct?: number | null;
  margen_administracion_pct?: number | null;
  unidad_uso?: string | null;
  uso_estimado_anual?: number | null;
  tarifa_manual?: number | null;
  requiere_mantenimiento_preventivo?: boolean | null;
  requiere_calibracion?: boolean | null;
  frecuencia_mantenimiento_meses?: number | null;
  fecha_ultimo_mantenimiento?: string | null;
  frecuencia_calibracion_meses?: number | null;
  fecha_ultima_calibracion?: string | null;
  laboratorio_calibracion?: string | null;
  numero_poliza_seguro?: string | null;
  vigencia_seguro_hasta?: string | null;
  costo_anual_seguro?: number | null;
  observaciones?: string | null;
};

const inputDate = (v: string | null | undefined) =>
  v ? String(v).slice(0, 10) : "";

/**
 * Campos del formulario de activo compartido. Compartido entre /nuevo y
 * /[id]/editar — la única diferencia es `defaults` (precarga en edición).
 * Inputs no controlados con defaultValue; la action del <form> padre lee
 * el FormData.
 */
export function ActivoFields({
  empresas,
  defaults,
}: {
  empresas: EmpresaOpcion[];
  defaults?: ActivoDefaults;
}) {
  const edicion = defaults !== undefined;
  return (
    <>
      <Section title="Identificación">
        <Field label="Código *">
          <Input
            name="codigo"
            required
            placeholder="TTR-001"
            className="font-mono uppercase"
            defaultValue={defaults?.codigo ?? ""}
          />
        </Field>
        <Field label="Nombre *" cols={2}>
          <Input
            name="nombre"
            required
            placeholder="Tijera elevadora 19ft"
            defaultValue={defaults?.nombre ?? ""}
          />
        </Field>
        <Field label="Tipo *">
          <select
            name="tipo"
            required
            defaultValue={defaults?.tipo ?? "medicion"}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="medicion">Medición</option>
            <option value="elevacion">Elevación</option>
            <option value="perforacion">Perforación</option>
            <option value="energia">Energía</option>
            <option value="transporte">Transporte</option>
            <option value="taller">Taller</option>
            <option value="oficina">Oficina</option>
            <option value="otro">Otro</option>
          </select>
        </Field>
        <Field label="Marca">
          <Input name="marca" defaultValue={defaults?.marca ?? ""} />
        </Field>
        <Field label="Modelo">
          <Input name="modelo" defaultValue={defaults?.modelo ?? ""} />
        </Field>
        <Field label="Núm. serie / VIN">
          <Input
            name="numero_serie"
            className="font-mono text-xs"
            defaultValue={defaults?.numero_serie ?? ""}
          />
        </Field>
        <Field label="Año fabricación">
          <Input
            name="anio_fabricacion"
            type="number"
            min="1950"
            max="2100"
            defaultValue={defaults?.anio_fabricacion ?? ""}
          />
        </Field>
        <Field label="Capacidad" cols={2}>
          <Input
            name="capacidad"
            placeholder="ej. 19 ft, 5 ton, 3-fase 480V"
            defaultValue={defaults?.capacidad ?? ""}
          />
        </Field>
        <Field label="Descripción" cols={3}>
          <Input
            name="descripcion"
            defaultValue={defaults?.descripcion ?? ""}
          />
        </Field>
      </Section>

      <Section title="Propiedad">
        <Field label="Empresa propietaria *" cols={3}>
          <select
            name="empresa_propietaria_id"
            required
            defaultValue={defaults?.empresa_propietaria_id ?? ""}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— Selecciona —</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.codigo} · {e.nombre_comercial ?? e.razon_social}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Fecha adquisición *">
          <Input
            name="fecha_adquisicion"
            type="date"
            required
            defaultValue={inputDate(defaults?.fecha_adquisicion)}
          />
        </Field>
        <Field label="Costo adquisición (MXN) *">
          <Input
            name="costo_adquisicion"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults?.costo_adquisicion ?? ""}
          />
        </Field>
      </Section>

      <Section title="Vida útil + tarifa">
        <Field label="Vida útil (años)">
          <Input
            name="vida_util_anios"
            type="number"
            min="1"
            max="50"
            defaultValue={defaults?.vida_util_anios ?? 8}
          />
        </Field>
        <Field label="Valor residual (%)">
          <Input
            name="valor_residual_pct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={defaults?.valor_residual_pct ?? 10}
          />
        </Field>
        <Field label="Margen administración (%)">
          <Input
            name="margen_administracion_pct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={defaults?.margen_administracion_pct ?? 12}
          />
        </Field>
        <Field label="Unidad de uso">
          <select
            name="unidad_uso"
            defaultValue={defaults?.unidad_uso ?? "hora"}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="hora">Hora</option>
            <option value="dia">Día</option>
            <option value="ciclo">Ciclo</option>
            <option value="kilometro">Kilómetro</option>
          </select>
        </Field>
        <Field label="Uso estimado anual">
          <Input
            name="uso_estimado_anual"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaults?.uso_estimado_anual ?? 200}
          />
        </Field>
        <Field label="Tarifa manual (opcional)">
          <Input
            name="tarifa_manual"
            type="number"
            step="0.01"
            min="0"
            placeholder="solo si quieres sobrescribir"
            defaultValue={defaults?.tarifa_manual ?? ""}
          />
        </Field>
      </Section>

      <Section title="Mantenimiento y calibración">
        <div className="col-span-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiere_mantenimiento_preventivo"
              defaultChecked={
                edicion
                  ? Boolean(defaults?.requiere_mantenimiento_preventivo)
                  : true
              }
            />
            Requiere mantenimiento preventivo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiere_calibracion"
              defaultChecked={Boolean(defaults?.requiere_calibracion)}
            />
            Requiere calibración
          </label>
        </div>
        <Field label="Frec. mantto. (meses)">
          <Input
            name="frecuencia_mantenimiento_meses"
            type="number"
            min="1"
            defaultValue={defaults?.frecuencia_mantenimiento_meses ?? 6}
          />
        </Field>
        <Field label="Último mantto.">
          <Input
            name="fecha_ultimo_mantenimiento"
            type="date"
            defaultValue={inputDate(defaults?.fecha_ultimo_mantenimiento)}
          />
        </Field>
        <Field label="Frec. calibración (meses)">
          <Input
            name="frecuencia_calibracion_meses"
            type="number"
            min="1"
            defaultValue={defaults?.frecuencia_calibracion_meses ?? ""}
          />
        </Field>
        <Field label="Última calibración">
          <Input
            name="fecha_ultima_calibracion"
            type="date"
            defaultValue={inputDate(defaults?.fecha_ultima_calibracion)}
          />
        </Field>
        <Field label="Laboratorio calibración" cols={2}>
          <Input
            name="laboratorio_calibracion"
            defaultValue={defaults?.laboratorio_calibracion ?? ""}
          />
        </Field>
      </Section>

      <Section title="Seguro">
        <Field label="Núm. póliza">
          <Input
            name="numero_poliza_seguro"
            className="font-mono text-xs"
            defaultValue={defaults?.numero_poliza_seguro ?? ""}
          />
        </Field>
        <Field label="Vigencia hasta">
          <Input
            name="vigencia_seguro_hasta"
            type="date"
            defaultValue={inputDate(defaults?.vigencia_seguro_hasta)}
          />
        </Field>
        <Field label="Costo anual">
          <Input
            name="costo_anual_seguro"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.costo_anual_seguro ?? ""}
          />
        </Field>
      </Section>

      <Section title="Observaciones">
        <div className="col-span-3">
          <textarea
            name="observaciones"
            rows={3}
            defaultValue={defaults?.observaciones ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
      </Section>
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  cols = 1,
}: {
  label: string;
  children: React.ReactNode;
  cols?: number;
}) {
  return (
    <div className={cols === 1 ? "" : cols === 2 ? "col-span-2" : "col-span-3"}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
