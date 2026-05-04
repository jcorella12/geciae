# QuickCreatePicker — patrón de creación inline

Componente reutilizable para reemplazar selects de entidades en formularios.
Permite al usuario buscar y, si la entidad no existe, crearla en un modal sin
salir del flujo padre.

Inspirado en Linear / Notion: el item al fondo de la lista dice "+ Nueva …"
y abre un mini-form. Al guardar, la nueva entidad queda seleccionada.

## Cuándo usarlo

Cualquier `<select>` o autocomplete donde el usuario podría descubrir, en
medio del flujo, que la entidad referenciada no existe todavía. Casos típicos:

- Servicios al crear una OT inter-co (ya implementado — piloto).
- Clientes al crear una oportunidad (sprint 2.2).
- Proveedores al crear una OC.
- Productos al registrar un movimiento de inventario.

## Cómo aplicarlo en un form nuevo

Necesitas tres piezas:

1. Una **server action `crearXRapido`** que reciba inputs tipados (no
   `FormData`) y devuelva `{ ok, error, x }` con la entidad creada — incluido
   `id`. Patrón ya implementado en `clientes/actions.ts:crearClienteRapido`
   y en `servicios/actions.ts:crearServicioRapido`.

2. Un **mini-form Client Component** (`QuickCreateXForm`) con campos mínimos
   y `onCreated`/`onCancel`. Vive dentro del modal del picker. Ver
   `quick-create-servicio-form.tsx` como referencia.

3. **Reemplazar el `<select>` por `<QuickCreatePicker>`** en el form padre:

```tsx
import { QuickCreatePicker } from "@/components/shared/quick-create-picker";

const [items, setItems] = useState(itemsIniciales);

<QuickCreatePicker<Servicio>
  items={items}
  value={servicioId}
  onChange={setServicioId}
  placeholder="Buscar servicio…"
  getLabel={(s) => `${s.codigo} — ${s.nombre}`}
  getSecondary={(s) =>
    s.precio_inter_co
      ? `Precio: ${fmtMxn.format(s.precio_inter_co)}`
      : null
  }
  matchesQuery={(s, q) =>
    s.codigo.toLowerCase().includes(q) ||
    s.nombre.toLowerCase().includes(q)
  }
  newItemLabel="Nuevo servicio"
  renderCreateForm={({ onCreated, onCancel, initialQuery }) => (
    <QuickCreateServicioForm
      empresaId={destinoId}
      initialNombre={initialQuery}
      onCreated={(s) => {
        setItems((prev) => [...prev, s]);
        onCreated(s);
      }}
      onCancel={onCancel}
    />
  )}
/>
```

## Convenciones obligatorias

- **Genérico**: `QuickCreatePicker<T extends { id: string }>` — el padre
  define qué muestra cada item con `getLabel` / `getSecondary`.
- **Server action `crearXRapido`** debe devolver la entidad completa para
  que el padre pueda hacer `setItems(prev => [...prev, nueva])` y
  `setSelected(nueva.id)` sin recargar la página.
- **Validación server-side**: el mini-form solo hace UX; toda validación
  importante (RFC, código único, permisos) vive en el action.
- **Permisos**: el action invoca `obtenerVinculos()` + helper de permiso
  correspondiente (p.ej. `puedeCrearOCEn`, `puedeGestionarClientes`).
- **`initialQuery`**: el modal recibe el texto que el usuario tecleó en el
  search; úsalo para pre-llenar el campo nombre/razón social.

## Anti-patrones a evitar

- ❌ NO recargues la página tras crear; usa el state local para append.
- ❌ NO uses `useFormState`/`useFormStatus` en el mini-form si vas a llamar
  el action directamente con `useTransition` — son flujos distintos.
- ❌ NO pongas validación de campos obligatorios solo en HTML5 (`required`)
  sin replicarla server-side; el action es la fuente de verdad.
- ❌ NO uses Quick Create para entidades que requieren many-to-many setup
  (p.ej. relaciones cliente-empresa); para esas mejor link a la página
  completa de creación.
