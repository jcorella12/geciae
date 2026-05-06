import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  esCEO,
  obtenerVinculos,
} from "@/lib/auth/permisos";
import { createClient } from "@/lib/supabase/server";

import { crearActivo } from "../actions";

export default async function NuevoActivoPage() {
  const supabase = createClient();
  const v = await obtenerVinculos();
  const puede =
    esCEO(v) ||
    v.some(
      (vi) =>
        
        (vi.rol === "director" || (vi.atributos ?? []).includes("contralor")),
    );
  if (!puede) redirect("/activos/compartidos");

  const empresasIds = Array.from(new Set(v.map((x) => x.empresa_id)));
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, codigo, razon_social, nombre_comercial")
    .in("id", empresasIds)
    .eq("activa", true)
    .order("codigo");

  async function action(formData: FormData) {
    "use server";
    const r = await crearActivo({ ok: false, id: null, error: null }, formData);
    if (r.ok && r.id) redirect(`/activos/compartidos/${r.id}`);
    if (r.error) throw new Error(r.error);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="mb-6">
        <Link href="/activos/compartidos" className="text-sm text-muted-foreground hover:text-foreground">
          ← Activos compartidos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">Nuevo activo compartido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La tarifa se calcula automáticamente: depreciación + mantenimiento + 12% admin / uso anual.
        </p>
      </div>

      <form action={action} className="space-y-6">
        <Section title="Identificación">
          <Field label="Código *">
            <Input name="codigo" required placeholder="TTR-001" className="font-mono uppercase" />
          </Field>
          <Field label="Nombre *" cols={2}>
            <Input name="nombre" required placeholder="Tijera elevadora 19ft" />
          </Field>
          <Field label="Tipo *">
            <select
              name="tipo"
              required
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
          <Field label="Marca"><Input name="marca" /></Field>
          <Field label="Modelo"><Input name="modelo" /></Field>
          <Field label="Núm. serie / VIN"><Input name="numero_serie" className="font-mono text-xs" /></Field>
          <Field label="Año fabricación"><Input name="anio_fabricacion" type="number" min="1950" max="2100" /></Field>
          <Field label="Capacidad" cols={2}>
            <Input name="capacidad" placeholder="ej. 19 ft, 5 ton, 3-fase 480V" />
          </Field>
        </Section>

        <Section title="Propiedad">
          <Field label="Empresa propietaria *" cols={3}>
            <select
              name="empresa_propietaria_id"
              required
              className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Selecciona —</option>
              {(empresas ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.codigo} · {e.nombre_comercial ?? e.razon_social}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha adquisición *">
            <Input name="fecha_adquisicion" type="date" required />
          </Field>
          <Field label="Costo adquisición (MXN) *">
            <Input name="costo_adquisicion" type="number" step="0.01" min="0" required />
          </Field>
        </Section>

        <Section title="Vida útil + tarifa">
          <Field label="Vida útil (años)">
            <Input name="vida_util_anios" type="number" min="1" max="50" defaultValue="8" />
          </Field>
          <Field label="Valor residual (%)">
            <Input name="valor_residual_pct" type="number" step="0.01" min="0" max="100" defaultValue="10" />
          </Field>
          <Field label="Margen administración (%)">
            <Input name="margen_administracion_pct" type="number" step="0.01" min="0" max="100" defaultValue="12" />
          </Field>
          <Field label="Unidad de uso">
            <select name="unidad_uso" className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="hora">Hora</option>
              <option value="dia">Día</option>
              <option value="ciclo">Ciclo</option>
              <option value="kilometro">Kilómetro</option>
            </select>
          </Field>
          <Field label="Uso estimado anual">
            <Input name="uso_estimado_anual" type="number" step="0.01" min="0.01" defaultValue="200" />
          </Field>
          <Field label="Tarifa manual (opcional)">
            <Input name="tarifa_manual" type="number" step="0.01" min="0" placeholder="solo si quieres sobrescribir" />
          </Field>
        </Section>

        <Section title="Mantenimiento y calibración">
          <div className="col-span-3 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requiere_mantenimiento_preventivo" defaultChecked />
              Requiere mantenimiento preventivo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requiere_calibracion" />
              Requiere calibración
            </label>
          </div>
          <Field label="Frec. mantto. (meses)">
            <Input name="frecuencia_mantenimiento_meses" type="number" min="1" defaultValue="6" />
          </Field>
          <Field label="Último mantto.">
            <Input name="fecha_ultimo_mantenimiento" type="date" />
          </Field>
          <Field label="Frec. calibración (meses)">
            <Input name="frecuencia_calibracion_meses" type="number" min="1" />
          </Field>
          <Field label="Última calibración">
            <Input name="fecha_ultima_calibracion" type="date" />
          </Field>
          <Field label="Laboratorio calibración" cols={2}>
            <Input name="laboratorio_calibracion" />
          </Field>
        </Section>

        <Section title="Seguro">
          <Field label="Núm. póliza"><Input name="numero_poliza_seguro" className="font-mono text-xs" /></Field>
          <Field label="Vigencia hasta"><Input name="vigencia_seguro_hasta" type="date" /></Field>
          <Field label="Costo anual"><Input name="costo_anual_seguro" type="number" step="0.01" min="0" /></Field>
        </Section>

        <Section title="Observaciones">
          <div className="col-span-3">
            <textarea
              name="observaciones"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </Section>

        <div className="flex justify-end gap-2">
          <Link href="/activos/compartidos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit">Crear activo</Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      <div className="grid grid-cols-3 gap-3">{children}</div>
    </section>
  );
}

function Field({ label, children, cols = 1 }: { label: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className={cols === 1 ? "" : cols === 2 ? "col-span-2" : "col-span-3"}>
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
