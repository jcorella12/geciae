# Sprint 1 — Bootstrap inicial

Pasos manuales que solo se hacen una vez para dejar el sistema operativo.

## 1. Configuración de Supabase Auth

### Site URL y Redirect URLs

En el dashboard del proyecto remoto:
**https://supabase.com/dashboard/project/dtmcqjtqykbkapzebbik/auth/url-configuration**

- **Site URL:** `http://localhost:3000` (cambiar a la URL productiva en cuanto despleguemos a Vercel).
- **Redirect URLs:** agregar las que apliquen, una por línea:
  ```
  http://localhost:3000/auth/callback
  http://localhost:3000/**
  ```

Sin esto, los magic links y la verificación de email redirigen al sitio default de Supabase.

### Confirmación de email (recomendado para dev)

**https://supabase.com/dashboard/project/dtmcqjtqykbkapzebbik/auth/providers** → Email →
- En dev: **desactivar** "Confirm email" para iterar rápido (los signups se loguean automáticamente).
- En prod: **activar**.

### Rate limit de email (dev)

Supabase compartido tiene un límite de ~3 emails/hora. Si necesitas más:
- Conectar **Resend** como SMTP custom (Auth → SMTP Settings).
- O usa email + contraseña en lugar de magic link mientras configuras SMTP.

---

## 2. Crear el primer usuario (Joaquín — CEO)

### Opción A — Vía la UI (recomendado)

1. Asegura que `npm run dev` corre en `localhost:3000`.
2. Navega a `http://localhost:3000/login`.
3. Click en "¿Primer usuario? Crear cuenta".
4. Email: `joaquin@psenergia.com.mx` (o el real que use Joaquín).
5. Password: una contraseña fuerte (al menos 8 chars).
6. Submit. Si "Confirm email" está desactivado, quedas autenticado al instante.

### Opción B — Vía SQL (si la UI falla)

En el SQL editor: https://supabase.com/dashboard/project/dtmcqjtqykbkapzebbik/sql/new

```sql
-- Crear usuario en auth.users con password hasheada.
-- Reemplazar email y password por valores reales.
SELECT auth.admin_create_user(
  email := 'joaquin@psenergia.com.mx',
  password := 'cambiame-en-cuanto-entres',
  email_confirm := true
);
```

---

## 3. Asignar rol CEO + atributos a Joaquín en las 4 empresas

Una vez creado el usuario en `auth.users`, corre esto en el SQL editor (reemplaza el email):

```sql
INSERT INTO usuarios_empresas (
  usuario_id,
  empresa_id,
  rol,
  atributos,
  configuracion_atributos,
  puesto,
  desde
)
SELECT
  (SELECT id FROM auth.users WHERE email = 'joaquin@psenergia.com.mx'),
  e.id,
  'ceo'::rol_usuario,
  ARRAY['aprobador_financiero', 'tesorero_corporativo'],
  jsonb_build_object(
    'aprobador_financiero', jsonb_build_object('umbral_max_mxn_oc', null),
    'tesorero_corporativo', jsonb_build_object('alcance', 'grupo')
  ),
  'CEO Grupo PSENERGIA',
  CURRENT_DATE
FROM empresas e
WHERE e.codigo IN ('PSE', 'CIAE', 'IED', 'LIMSON')
ON CONFLICT (usuario_id, empresa_id) DO NOTHING;
```

`umbral_max_mxn_oc = null` significa "sin límite" (CEO puede aprobar cualquier monto).

---

## 4. Verificar

Recarga `http://localhost:3000/mi-dia` (logueado como Joaquín). Debes ver:

- Topbar con el círculo verde (PSENERGIA) o el de la primera empresa que devolvió el query.
- Lista de las 4 empresas en "Tus empresas" con rol `ceo` y los chips `aprobador_financiero` y `tesorero_corporativo`.

Si en lugar de eso ves el banner ámbar "No tienes empresas asignadas todavía", revisa que el INSERT del paso 3 se ejecutó sin error y que el email del usuario coincide.

---

## 5. Datos fiscales reales de las 4 empresas

El seed de empresas (`supabase/migrations/20260430010000_seed_empresas.sql`) usa **RFCs y direcciones placeholder**.
Antes de Sprint 6 (timbrado de CFDI) hay que reemplazarlos. Contra Joaquín / contralor, recolectar para cada empresa:

- Razón social exacta
- RFC vigente
- Régimen fiscal (código SAT)
- CP fiscal
- Dirección fiscal completa
- Representante legal: nombre, RFC, CURP

Aplicar con `UPDATE empresas SET ... WHERE codigo = 'PSE'` (etc.) en migración nueva, no editar la del seed.

---

## 6. Acciones de seguridad post-bootstrap

Cuando Sprint 1 quede operativo:

- [ ] Rotar `service_role` key en Supabase (Settings → API → Reset service_role secret) y actualizar `.env.local`.
- [ ] Borrar el Personal Access Token de Claude Code (Account → Access Tokens).
- [ ] Activar "Confirm email" en Supabase Auth para staging y prod.
- [ ] Activar **MFA** para CEO y atributo "aprobador_financiero" con umbral >500k (spec [03-autenticacion-roles.md](../../pse-erp-package/01-arquitectura/03-autenticacion-roles.md)).
