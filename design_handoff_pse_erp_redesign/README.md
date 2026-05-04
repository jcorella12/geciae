# Handoff: PSE ERP — Rediseño UI v2

## Overview

Rediseño completo del ERP de PSE Group (operación multi-empresa: PSE Energía, CIAE Construcción, IED Inmobiliaria, Limson). El objetivo es darle al director y a sus equipos una **visión 360° de la empresa** (finanzas, proyectos, inventario, personas) en un lenguaje visual moderno, denso pero respirable, optimizado para uso diario por power users (PMs, residentes, oficina, dirección).

El paquete incluye:
- **Dashboard ejecutivo** (2 variaciones: cómoda y compacta)
- **Mi Día** (vista del empleado: agenda + pendientes + accesos + nómina + vacaciones)
- **Proyectos**: lista de cartera + detalle de obra
- **Finanzas**: cashflow, CxC/CxP, KPIs
- **Inventario**: 3 almacenes con alertas de stock
- **Shell global**: sidebar navy con switcher de empresa, topbar con breadcrumbs y `⌘K`

## About the Design Files

Los archivos de este bundle son **referencias de diseño en HTML/JSX** — prototipos que muestran el look y comportamiento intencionado. **No son código de producción para copiar y pegar.** La tarea es **recrear estos diseños dentro del codebase existente `pse-erp/`** (Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Supabase), siguiendo los patrones, componentes y librerías que ya están establecidos ahí.

Los componentes JSX de los mocks usan React 18 vanilla con CSS variables. En la implementación real, esos estilos se traducen a:
- Tokens en `app/globals.css` (variables CSS) y `tailwind.config.ts`
- Componentes en `components/ui/` (extendiendo shadcn/ui)
- Pantallas en `app/(app)/<modulo>/page.tsx`

El archivo principal es **`PSE ERP - Redesign v2.html`** — ábrelo en un navegador para ver todas las pantallas en un canvas pan/zoom (drag para mover, scroll para zoom, doble-click en un artboard para verlo fullscreen).

## Fidelity

**Alta fidelidad (hifi).** Los mockups tienen colores finales, tipografía final (Geist Sans + Geist Mono), spacing definido, y los estados de los componentes especificados. El developer debe replicar pixel-perfect dentro del codebase, **reusando** los componentes shadcn/ui ya instalados (`button`, `card`, `table`, `badge`, `dropdown-menu`, etc.) en lugar de crear primitives nuevos.

Los datos mostrados son **representativos de construcción/obra mexicana** (proyectos en Polanco, Santa Fe, Querétaro; proveedores como CEMEX, Ferre Vallejo; cifras en MXN). Reemplazar con queries reales a Supabase.

---

## Sistema de diseño

### Tipografía
- **Sans**: `Geist` (next/font/google) — pesos 400, 500, 600, 700
- **Mono**: `Geist Mono` — pesos 400, 500, 600 (para números, códigos, IDs, KPIs)
- Aplicar `font-feature-settings: 'tnum'` y `font-variant-numeric: tabular-nums` en cifras

**Cambio en `app/layout.tsx`:**
```tsx
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });
```

### Paleta (oklch para escalas armónicas)

**Marca PSE base:**
| Token | Valor | Uso |
|---|---|---|
| `--pse-navy` | `oklch(0.32 0.075 252)` ≈ `#1E3A5F` | Sidebar, headers, primary |
| `--pse-navy-deep` | `oklch(0.22 0.060 252)` | Hover sidebar |
| `--pse-navy-darker` | `oklch(0.16 0.045 252)` | Sidebar bg |
| `--pse-orange` | `oklch(0.72 0.155 60)` ≈ `#F18F2C` | Acento, CTA, indicador activo |
| `--pse-orange-deep` | `oklch(0.62 0.165 50)` | Hover acento |

**Multi-empresa** (rebindea `--brand` según `[data-empresa="..."]` en el `<html>` o root):
- `pse` → navy `oklch(0.32 0.075 252)`
- `ciae` → verde `oklch(0.45 0.115 150)`
- `ied` → dorado `oklch(0.55 0.115 80)`
- `limson` → lima `oklch(0.55 0.13 135)`

**Neutrales** (cool slate calibrados a navy): ver `v2/tokens-v2.css` completo.

**Estados**: `--success`, `--warning`, `--danger`, `--info` con variantes `-soft` (bg) y `-deep` (text on soft).

### Spacing y radios
- Base 4: `--s-1: 4px` … `--s-16: 64px`
- Radios: `--r-xs: 3px` (badges), `--r-sm: 5px` (inputs), `--r-md: 8px` (cards), `--r-lg: 10px`, `--r-xl: 14px` (paneles grandes)

### Densidad
Dos variantes vía `[data-density="comfy"]` (default) y `[data-density="compact"]`:
- **Comfy**: row 44px, padding 20px, gap 20px, `--text-base: 13.5px`
- **Compact**: row 32px, padding 14px, gap 12px, `--text-base: 12.5px`

Exponer como toggle en preferencias de usuario.

---

## Cambios concretos al código

### 1. `app/layout.tsx`
- Reemplazar `Inter` por `Geist` y `Geist_Mono` (next/font/google)
- Aplicar `className={`${geistSans.variable} ${geistMono.variable}`}` en `<html>`

### 2. `app/globals.css`
- Migrar valores HSL a `oklch()` para todas las escalas
- Copiar tokens de `v2/tokens-v2.css` (paleta, spacing, radios, densidad)
- Añadir bloques `[data-empresa="..."]` que rebindean `--brand`, `--brand-deep`, `--brand-soft`
- Añadir bloques `[data-density="..."]` para row-height, padding, gap

### 3. `tailwind.config.ts`
- Mapear los tokens CSS a Tailwind:
```ts
colors: {
  brand: 'var(--brand)',
  'brand-deep': 'var(--brand-deep)',
  'brand-soft': 'var(--brand-soft)',
  accent: 'var(--accent)',
  ink: { 1: 'var(--ink-1)', 2: 'var(--ink-2)', 3: 'var(--ink-3)', 4: 'var(--ink-4)', 5: 'var(--ink-5)' },
  // … success, warning, danger, info
}
```
- Añadir `fontFamily: { sans: ['var(--font-sans)'], mono: ['var(--font-mono)'] }`

### 4. `components/shared/app-sidebar.tsx`
- **Fondo**: navy oscuro (`bg-[--pse-navy-darker]`)
- **Switcher de empresa** arriba del nav, con dot del color de la empresa (10px, `border-radius: 50%`) + nombre + chevron. Al cambiar, setea `data-empresa` en el `<html>` y persiste en localStorage o cookie de sesión.
- **4 grupos de nav** con headers uppercase 10px letter-spacing 0.1em color `--ink-4`:
  - **PRINCIPAL**: Mi Día, Dashboard
  - **OPERACIÓN**: Proyectos, Presupuestos, OT, Aprobaciones, Inventario
  - **EQUIPO**: Personas, Nómina, Vacaciones, Capacitación
  - **CONTROL**: Finanzas, Comercial, Calidad, Reportes
- **Indicador activo**: barra naranja vertical de 3px a la izquierda + bg `rgba(255,255,255,0.06)` + text white
- **User card** abajo: avatar circular con iniciales + nombre + rol uppercase 10px

### 5. `components/shared/app-topbar.tsx`
- Quitar título redundante
- **Breadcrumbs** textuales (separador `/`, último item color `--ink-1`, anteriores `--ink-3`)
- **Search** 320px con `<kbd>⌘K</kbd>` a la derecha del input
- **Botón "Crear"** primario (bg `--brand`, text white) siempre a la derecha
- Notificaciones (campana) y avatar a la izquierda del botón Crear

### 6. `app/(app)/page.tsx` — Dashboard ejecutivo (NUEVO)
Layout grid 12 columnas:
- **Fila 1 (KPIs)**: 1 card destacada navy (col-span-3) "Margen consolidado" + 4 KPIs estándar (col-span-9, grid 4 cols)
- **Fila 2 (charts)**: LineChart cashflow (col-span-8) + panel de alertas (col-span-4, lista de items con dot de severidad)
- **Fila 3 (tabla)**: Proyectos activos con columnas: Proyecto, Cliente, Avance (DualBar planeado vs real), Presupuesto, Status (dot), Fecha límite. Border navy en row con riesgo alto.
- **Fila 4 (mini paneles)**: 3 paneles de col-span-4: Inventario (top-5 con stock bajo), Clientes (CxC vencida), CapEx (gasto vs autorizado)

### 7. `app/(app)/mi-dia/page.tsx` — Mi Día
Reemplazar placeholder. Layout 2 cols (col-span-8 + col-span-4):
- **Izquierda**: Header con saludo + clima + fecha. Agenda hoy (timeline vertical). Pendientes (lista con checkbox). 6 accesos rápidos (grid 3×2 de cards con icono).
- **Derecha**: Mis proyectos (lista compacta con DualBar). Nómina próxima (card con monto y fecha). Vacaciones (días disponibles + botón solicitar).

### 8. Componentes UI nuevos en `components/ui/`

| Archivo | Props | Uso |
|---|---|---|
| `kpi-card.tsx` | `label, value, delta, trend, format, accent?` | KPI estándar 4×grid |
| `kpi-feature.tsx` | `label, value, delta, sub` | KPI destacado fondo navy |
| `dual-bar.tsx` | `planned, actual, max` | Avance planeado vs real (curva-S simplificada) |
| `status-dot.tsx` | `status: 'ok'\|'warning'\|'danger'\|'idle'` | Dot 8px en lugar de badge en celdas anchas |
| `stat.tsx` | `label, value, mono?` | Label uppercase 10px + valor mono debajo |
| `alert-item.tsx` | `severity, title, meta, action` | Item de lista de alertas con dot izq |
| `empresa-switcher.tsx` | `value, onChange` | Dropdown con dot de color por empresa |
| `breadcrumbs.tsx` | `items: {label, href?}[]` | Breadcrumb textual |

### 9. Tablas (`@tanstack/react-table` ya instalado)
- Padding celda: comfy `12px 16px`, compact `8px 14px`
- Header: uppercase 11px letter-spacing 0.06em color `--ink-3`, bg `--bg-2`, border-bottom `--border-strong`
- Números: `font-mono tabular-nums` siempre, alineados a la derecha
- Row hover: bg `--bg-2`, sin shadow
- Border row: `--divider` 1px

### 10. Charts
Para el LineChart de cashflow y barras: usar **Recharts** (ya idiomático en el ecosistema Next.js + shadcn). Stroke `--brand`, fill area con `color-mix(in oklch, var(--brand) 12%, transparent)`. Grid `--divider` dasheado. Tooltip con bg `--surface`, border `--border`, shadow-md.

---

## Pantallas detalladas

### Dashboard ejecutivo
**Propósito**: Roberto (director general) abre la app y en 5s sabe el estado de la empresa.
**Variación A (cómoda, recomendada)**: 1480×1840px, todo respirable, usar en pantalla grande/sala de juntas.
**Variación B (compacta)**: 1480×1180px, todo arriba del fold, para uso diario en laptop.

### Mi Día
**Propósito**: Cualquier empleado (PM, residente, oficina) abre la app y ve qué tiene que hacer hoy.
Mismo layout para todos los roles, **el contenido cambia**:
- PM: agenda con visitas a obra, pendientes de aprobación, proyectos asignados
- Oficina: agenda de juntas, pendientes administrativos, accesos a reportes
- Residente: lista de actividades de obra del día, partidas a reportar

### Proyectos — lista
Cartera ordenada por riesgo (proyectos con desviación >5% arriba). Columnas: Cliente, Avance (DualBar), Presupuesto, Gastado, Margen, Días retraso, Status, PM.

### Proyectos — detalle (Torre Polanco)
Header con nombre, cliente, KPIs principales (avance, presupuesto, días, margen). Tabs: Resumen, Partidas, Compras, Bitácora, Documentos, Equipo. En Resumen: curva-S (planeado vs real), top partidas con desviación, próximos hitos, alertas.

### Finanzas
KPIs consolidados (ingresos mes, egresos mes, margen, cash position). LineChart cashflow 12 meses. Tabla CxC vencida. Tabla CxP por vencer. Mini panel de impuestos próximos.

### Inventario
3 almacenes (CDMX, Querétaro, Monterrey) como tabs. Tabla con columnas: SKU, Descripción, Categoría, Stock, Mínimo, Estado (dot). Items bajo mínimo destacados. KPIs arriba: Items totales, Bajo mínimo, Valor inventariado, Rotación.

---

## Interacciones y comportamiento

- **Switcher de empresa** (sidebar): al cambiar, actualiza `data-empresa` en `<html>` → todos los `--brand-*` rebindean. Persiste en cookie de sesión. **Filtra todos los queries** por `empresa_id` activa.
- **Tweak de densidad**: actualiza `data-density` en `<html>`. Persiste en localStorage por usuario.
- **Tablas**: click en header ordena. Click en row navega al detalle. Hover muestra bg `--bg-2`.
- **DualBar**: tooltip al hover muestra valores exactos planeado/real.
- **Search ⌘K**: command palette global (usar `cmdk`). Indexar proyectos, clientes, OT, partidas.
- **Animaciones**: transitions 150ms ease-out en hover/focus. Modales fade+slide 200ms.

## State management
- **Empresa activa**: cookie de sesión (server-side) + Supabase RLS
- **Densidad y preferencias UI**: localStorage por usuario
- **Datos**: server components donde sea posible, client components con `useQuery` (TanStack Query) para tablas interactivas

## Assets
- **Logos**: ya existen en `pse-erp/logos/` — usarlos en el switcher de empresa si aplica (sino bastan los dots de color)
- **Iconografía**: usar `lucide-react` (ya instalado vía shadcn) — los mocks usan SVGs inline pero deben mapearse a iconos de lucide

## Files

```
design_handoff_pse_erp_redesign/
├── README.md                         ← este archivo
├── PSE ERP - Redesign v2.html        ← canvas principal (abrir en navegador)
├── design-canvas.jsx                 ← shell del canvas (no copiar a producción)
├── icons.jsx                         ← iconos SVG inline usados en mocks
├── shared.jsx                        ← helpers compartidos
└── v2/
    ├── tokens-v2.css                 ← TODOS los design tokens (referencia clave)
    ├── components-v2.css             ← estilos de componentes (referencia)
    ├── shell-v2.jsx                  ← sidebar + topbar
    ├── charts-v2.jsx                 ← KpiV2, DualBar, Stat, HeatGrid
    ├── dashboard-ejecutivo.jsx       ← variación A (comfy)
    ├── dashboard-ejecutivo-compact.jsx ← variación B (compacta)
    ├── mi-dia.jsx                    ← Mi Día
    ├── proyectos.jsx                 ← lista + detalle
    ├── finanzas-inventario.jsx       ← Finanzas + Inventario
    └── tweaks-panel.jsx              ← controles del canvas (no copiar)
```

**Archivos clave para tokens y patrones**: `v2/tokens-v2.css` (paleta completa) y `v2/charts-v2.jsx` (componentes reutilizables KPI/DualBar/Stat).

---

## Notas finales

- **No copiar el HTML literalmente.** Recrear cada pantalla como Server/Client Component de Next.js dentro de `app/(app)/`, usando shadcn/ui (`Card`, `Table`, `Badge`, etc.) como base y aplicando los tokens del nuevo `globals.css`.
- **Multi-empresa primero.** Cualquier query a Supabase debe filtrar por `empresa_id` activa (RLS configurado en `pse-erp/supabase/`).
- **Mobile**: estos mocks son desktop-first (1480px). Para mobile, colapsar sidebar a drawer, KPIs a stack vertical, tablas a cards. No prioritario en la primera fase.
