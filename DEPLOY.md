# Deploy a producción · `app.geciae.com`

Stack: **Next.js 14 + Supabase + Vercel + GitHub**

---

## 1. Pre-deploy (una sola vez)

### 1.1 Build local OK
Confirmado: `npm run build` produce sin errores.
Todas las rutas registradas (incluyendo `/dashboard/pajaro`, `/inventario`, `/soporte/tickets`, `/calendario`, `/notificaciones`, etc.)

### 1.2 Limpiar datos demo (recomendado antes de producción)

```bash
# Vista previa (no borra nada)
node scripts/clean-demo-seeds.mjs --dry-run

# Cuando estés listo (esto borra todo lo etiquetado [DEMO_SEED])
node scripts/clean-demo-seeds.mjs
```

Borra: 41 tareas, 10 eventos bitácora, 6 reportes, 56 movs vehículos, 8 vehículos, 38 docs vehiculares, 24 movs inventario, 10 items inventario, 57 actividades comerciales, 16 oportunidades.

> ⚠️ Ejecutarlo **antes** de invitar a usuarios reales para que solo vean datos productivos.

### 1.3 Variables de entorno necesarias

Tendrás que copiar estas a **Vercel → Project Settings → Environment Variables** (Production + Preview):

| Variable | Origen | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Tu `.env.local` | La URL pública de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu `.env.local` | Anon key (segura para cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu `.env.local` | ⚠️ **SOLO server-side** — NUNCA exponer |
| `NEXT_PUBLIC_SITE_URL` | Nuevo | `https://app.geciae.com` |
| `ANTHROPIC_API_KEY` | Tu `.env.local` | Para AI Reader (Claude) |
| `BANXICO_TOKEN` | Tu `.env.local` | Si lo usas para TIIE |

**Opcionales / cuando agregues PAC:**
- `PAC_PROVIDER`, `PAC_API_URL`, `PAC_USER`, `PAC_PASSWORD`
- `FIRMA_PROVIDER`, `FIRMA_API_KEY`, `FIRMA_SECRET`
- `RESEND_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`

---

## 2. Subir el repo a GitHub

### 2.1 Inicializar y committear los cambios pendientes

```bash
cd pse-erp

# Asegúrate que .env.local NO se está committeando (ya está en .gitignore)
git status

# Stage todos los cambios
git add .

# Commit (firma con co-autor opcional)
git commit -m "MVP listo para deploy: dashboard ejecutivo, vista pájaro, side peek + ⌘K, modo oscuro, módulos completos"
```

### 2.2 Crear repo en GitHub

1. Ve a https://github.com/new
2. **Nombre**: `geciae-erp` (privado recomendado para clientes/datos)
3. **NO** selecciones "Add a README" ni .gitignore (ya tienes ambos)
4. Crea el repo

### 2.3 Subir

```bash
# Reemplaza con tu URL real
git remote add origin git@github.com:TU_USUARIO/geciae-erp.git

# O si prefieres HTTPS:
# git remote add origin https://github.com/TU_USUARIO/geciae-erp.git

git branch -M main
git push -u origin main
```

---

## 3. Conectar Vercel

### 3.1 Importar el proyecto

1. Ve a https://vercel.com/new
2. **Import Git Repository** → selecciona `geciae-erp`
3. **Framework Preset**: Next.js (auto-detectado)
4. **Root Directory**: `pse-erp` (si subiste todo el monorepo) o `.` (si solo `pse-erp/`)
5. **Build Command**: `next build` (default OK)
6. **Output Directory**: `.next` (default OK)

### 3.2 Configurar Environment Variables

En el formulario antes de **Deploy**, sección **Environment Variables**, agrega TODAS las del paso 1.3:

```
NEXT_PUBLIC_SUPABASE_URL=https://dtmcqjtqykbkapzebbik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=https://app.geciae.com
ANTHROPIC_API_KEY=sk-ant-...
```

> Marca **Production** + **Preview** + **Development** para todas (excepto `NEXT_PUBLIC_SITE_URL` que solo en Production).

### 3.3 Deploy

Click en **Deploy**. El primer build tarda ~3 minutos.

URL provisional: `https://geciae-erp.vercel.app`

---

## 4. Conectar dominio `app.geciae.com`

### 4.1 En Vercel

1. **Project → Settings → Domains**
2. Agrega: `app.geciae.com`
3. Vercel te dará registros DNS:
   - **A record**: `76.76.21.21` (o)
   - **CNAME**: `cname.vercel-dns.com`

### 4.2 En tu proveedor DNS (donde gestionas geciae.com)

Agrega en `app.geciae.com`:

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 3600
```

Espera 5-30 min para propagación. Vercel auto-emite SSL Let's Encrypt.

---

## 5. Configurar Supabase para el dominio nuevo

⚠️ **Crítico** — sin esto, el login no funcionará.

### 5.1 Auth → URL Configuration

En Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://app.geciae.com`
- **Redirect URLs**: agrega:
  - `https://app.geciae.com/**`
  - `https://geciae-erp.vercel.app/**` (preview)
  - `http://localhost:3000/**` (dev)

### 5.2 CORS (si usas Storage para uploads)

Storage → **Policies** ya está OK por las migraciones, pero verifica que los buckets `cfdi`, `proveedores-docs`, `proyecto-archivos`, `vehiculos-archivos` estén creados.

### 5.3 RLS habilitado

Las migraciones ya activaron RLS en todas las tablas con datos sensibles. Verifica:

```sql
-- En Supabase SQL Editor
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todo debe estar `rowsecurity = true`.

---

## 6. Crear primer usuario CEO en producción

```sql
-- En Supabase SQL Editor (con Service Role)

-- 1. Crear usuario via Auth (Dashboard → Authentication → Users → "Add user")
-- O via SQL si ya tiene email:
-- (Mejor usar el Dashboard para que se mande la invitación)

-- 2. Vincular como CEO en todas las empresas:
INSERT INTO usuarios_empresas (usuario_id, empresa_id, rol, atributos, activo)
SELECT
  'UUID_DEL_NUEVO_USUARIO',
  id,
  'ceo',
  ARRAY['tesorero_corporativo']::text[],
  true
FROM empresas WHERE activa = true;
```

---

## 7. Smoke tests post-deploy

Ya en `https://app.geciae.com`:

- [ ] Login funciona y redirige correcto
- [ ] `/mi-dia` carga con tu rol detectado
- [ ] `/dashboard` muestra KPIs de TODAS las empresas (CEO)
- [ ] `/dashboard/pajaro` muestra grid 2×2
- [ ] **⌘K** abre command palette y busca proyectos/OC
- [ ] Toggle de tema (sun/moon en topbar) funciona y persiste
- [ ] Empresa switcher cambia los números del dashboard
- [ ] `/inventario` muestra los items y costos correctos
- [ ] Upload de un PDF a documentos de proyecto funciona (signed URL OK)
- [ ] Notificación bell trae datos
- [ ] Build sin warnings críticos en Vercel logs

---

## 8. Mantenimiento futuro

### Deploys automáticos
Cualquier `git push origin main` → deploy automático en Vercel.

### Rollback
Vercel guarda los últimos 100 deploys. Si algo rompe:
**Project → Deployments → … → Promote to Production** del deploy anterior.

### Migraciones de Supabase
```bash
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase db push --linked
SUPABASE_ACCESS_TOKEN=sbp_xxx npx supabase gen types typescript --linked > types/database.types.ts
```

Después committea los types y push, y Vercel re-deployará.

### Monitoreo
- **Vercel** → Logs en tiempo real de cada función
- **Supabase** → Logs de DB + Auth
- (Opcional) Activar **Sentry** agregando `SENTRY_DSN`

---

## 9. Post-MVP

Cuando ya esté en producción y estable:

1. **PAC para timbrado CFDI propios** (cuando me lo pidas)
2. **Más extractores AI** (factura vehículo / póliza ya están en `lib/claude/extractors/`)
3. **Integración bancaria** automatizada (BBVA / Banorte API)
4. **Mobile PWA** ya está habilitada — pídele al equipo de campo que instale desde su móvil

---

## Troubleshooting común

### "Failed to compile" en Vercel
- Verifica que `npm run build` corra local primero
- Si `next-pwa` falla: el `.gitignore` ya excluye `public/sw.js` y `public/sw.js.map` que se regeneran en cada build

### "Auth session missing" o 401
- Verifica que `NEXT_PUBLIC_SITE_URL` apunte a `https://app.geciae.com`
- Verifica los redirect URLs en Supabase Auth

### "Function exceeded maximum duration"
- Si una server action tarda >10s (límite default Vercel Hobby), considera dividir el trabajo
- El plan **Pro** sube a 60s

### Imágenes lentas
- Activar Vercel **Image Optimization** en `next.config.mjs` cuando agregues fotos pesadas
