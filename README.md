# ERP GECIAE

Sistema ERP integrado para **GECIAE — Grupo Empresarial CIAE** (PSENERGIA, CIAE, IED, Limson).
Stack: **Next.js 14 App Router** · **Supabase** (Postgres + Auth + Storage + Edge Functions) · **Tailwind + shadcn/ui** · **PWA** · **Claude API**.

La especificación completa del producto vive en `../pse-erp-package/` (descomprimida desde `pse-erp-package.zip`). Empezar por `00-vision/01-resumen-ejecutivo.md` y `06-fases/01-fase-1-mvp.md`.

## Estado

- **Sprint 0 (semana 1):** ✅ scaffold inicial — este repo.
- **Siguiente:** Sprint 1 — multi-tenant, RLS y autenticación.

## Requisitos

- Node.js 20.x o superior (probado con 24.15).
- npm 10.x (incluido con Node).
- Cuenta Supabase con proyecto creado (region us-east o us-west).
- Cuenta Anthropic con API key.
- Para timbrado: contrato y credenciales con **SW Sapien** o **Diverza**.
- Token de **Banxico** (gratuito, registro en banxico.org.mx).
- Cuenta **Mifiel** para firma electrónica (Fase 2).

## Setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Llenar con credenciales de Supabase, Anthropic, etc.

# 3. (Opcional) Supabase local con Docker
npx supabase start
npx supabase db reset    # aplica supabase/migrations/0001_init.sql

# 4. Dev server
npm run dev              # http://localhost:3000
```

## Scripts

| Comando         | Descripción                                     |
|-----------------|-------------------------------------------------|
| `npm run dev`   | Servidor de desarrollo en `localhost:3000`.     |
| `npm run build` | Build de producción (incluye service worker).   |
| `npm run start` | Servir build de producción.                     |
| `npm run lint`  | ESLint sobre `app/`, `components/`, `lib/`.     |

## Estructura

Ver `../pse-erp-package/01-arquitectura/01-stack-tecnico.md` para el detalle de la estructura de carpetas. Resumen:

```
pse-erp/
├── app/                   # Next.js App Router (espacios + auth + portales)
├── components/            # UI compartida + por espacio
├── lib/
│   ├── supabase/          # clientes server / browser / middleware
│   ├── claude/            # capa IA (orchestrator, prompts, extractors)
│   ├── pac/               # adapter PAC para CFDI
│   ├── banxico/           # cliente API Banxico (TIIE)
│   ├── firma/             # adapter firma electrónica
│   ├── helpers/           # utilidades varias
│   └── utils.ts           # cn() helper de shadcn
├── hooks/                 # React hooks
├── types/                 # tipos globales (database.types.ts, domain.types.ts)
├── supabase/
│   ├── migrations/        # SQL migrations (0001_init.sql ya colocado)
│   ├── functions/         # Edge Functions (Deno)
│   └── config.toml        # config CLI Supabase
└── public/                # estáticos (manifest PWA, iconos)
```

## Convenciones

- **TypeScript estricto** (`"strict": true`).
- **Server Components por default**, Client Components solo cuando necesario.
- **Server Actions** para mutaciones desde formularios.
- **Zod schemas** compartidos entre frontend y backend.
- camelCase en TS, snake_case en columnas DB, PascalCase en componentes y tipos.
- Imports absolutos con alias `@/` (ej. `@/lib/utils`, `@/components/ui/button`).

## Multi-tenant

El sistema opera 4 empresas (PSENERGIA, CIAE, IED, Limson) con **Row Level Security** por empresa. Todo acceso a datos pasa por RLS — nunca usar `SUPABASE_SERVICE_ROLE_KEY` desde código de cliente. Detalle en `../pse-erp-package/01-arquitectura/02-multi-tenancy.md`.

## Identidad visual

Paleta verde/naranja/blanco con curvas suaves. Tokens en `app/globals.css` (CSS vars `--color-*`) y exposición a Tailwind en `tailwind.config.ts` (`bg-pse`, `bg-ciae`, `bg-ied`, `bg-limson`, `text-success`, `text-warning`, etc.). Detalle en `../pse-erp-package/07-ux-ui/04-identidad-visual.md`.

## IA (Claude API)

Capa transversal en `lib/claude/`. **Nunca** llamar a Claude desde Client Components — siempre vía Server Action o Edge Function (la API key es server-only). Niveles de autonomía, cache, audit log y dashboard de uso se especifican en `../pse-erp-package/05-ia/`.

## Despliegue

- **Hosting:** Vercel (proyecto conectado al repo).
- **DB / Auth / Storage / Edge Functions:** Supabase Cloud (un proyecto por ambiente: dev, staging, prod).
- Cada ambiente con su propio `.env` configurado en Vercel.

## Licencia

Privado — Grupo PSENERGIA.
