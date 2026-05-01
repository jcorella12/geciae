# Sprint 1 — Pruebas de aislamiento multi-tenant

Procedimientos manuales para validar que RLS está bloqueando lo que debe bloquear antes de cerrar la fase. Automatización completa con Vitest + Playwright se hará en Sprint 9.

---

## 1. Setup de usuarios de prueba

Como Joaquín (CEO), entra a `/configuracion/usuarios` y crea los siguientes usuarios de prueba (puedes usar correos en el dominio que controles, por ejemplo `+test-pm-pse@ciae.com.mx`):

| Email | Rol | Empresas | Atributos |
|---|---|---|---|
| `test-pm-pse@…` | operativo | PSE | (ninguno) |
| `test-director-ied@…` | director | IED | aprobador_financiero (umbral OC 200000) |
| `test-tesorero@…` | director | PSE, CIAE, IED, LIMSON | tesorero_corporativo |
| `test-empleado-ciae@…` | empleado | CIAE | (ninguno) |

Para cada uno:
1. Recibe magic link → entra → configura contraseña.
2. Anota el correo y la URL `/configuracion/usuarios/{id}/edit` (la consigues haciendo click sobre el correo en la tabla).

---

## 2. Pruebas de visibilidad de empresas (selector)

| Quién | Comportamiento esperado al abrir el dropdown del topbar |
|---|---|
| Joaquín (CEO) | Ve "Vista consolidada del grupo" + las 4 empresas |
| `test-pm-pse` | Solo PSE en el dropdown. **NO** "Vista consolidada" |
| `test-director-ied` | Solo IED. **NO** "Vista consolidada" |
| `test-tesorero` | Las 4 empresas + "Vista consolidada" (atributo `tesorero_corporativo`) |
| `test-empleado-ciae` | Solo CIAE |

✗ Si ves "Vista consolidada" como `test-pm-pse`, hay bug en `puedeVerConsolidado`.

---

## 3. Pruebas de visibilidad de Configuración

| Quién | Sidebar muestra "Configuración" | `/configuracion/usuarios` accesible |
|---|---|---|
| Joaquín | Sí | Sí |
| `test-pm-pse` | **No** | redirige a `/mi-dia` |
| `test-director-ied` | **No** | redirige a `/mi-dia` |
| `test-tesorero` | **No** (no es CEO) | redirige a `/mi-dia` |

Probar accediendo directo a `http://localhost:3000/configuracion/usuarios` con cada usuario — debe redirigir si no es CEO.

---

## 4. Pruebas de RLS en `usuarios_empresas`

Como cada usuario, abrir DevTools → Console y correr:

```js
const { createClient } = await import("/_next/...").then((m) => m); // o usar window.fetch directo
// Más simple: visitar /mi-dia y ver el listado.
```

Esperado en `/mi-dia` "Tus empresas":

| Quién | Ve N empresas |
|---|---|
| Joaquín | 4 (CEO en todas) |
| `test-pm-pse` | 1 (PSE) |
| `test-director-ied` | 1 (IED) |
| `test-tesorero` | 4 |
| `test-empleado-ciae` | 1 (CIAE) |

✗ Si `test-pm-pse` viera más de 1 empresa, RLS de `usuarios_empresas_select_own` está mal configurada.

---

## 5. Verificación SQL de RLS desde el dashboard

Para validar las policies de forma directa, en https://supabase.com/dashboard/project/dtmcqjtqykbkapzebbik/sql/new:

```sql
-- Ver todas las políticas en las tablas raíz.
SELECT tablename, policyname, cmd, roles, qual::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('empresas', 'unidades_negocio', 'usuarios_empresas')
ORDER BY tablename, policyname;
```

Resultado esperado (al cierre de Sprint 1):

| tablename | policyname | cmd |
|---|---|---|
| empresas | empresas_select_pertenecidas | SELECT |
| unidades_negocio | unidades_negocio_select | SELECT |
| usuarios_empresas | usuarios_empresas_select_ceo | SELECT |
| usuarios_empresas | usuarios_empresas_select_own | SELECT |

---

## 6. Prueba MFA

1. Como `test-tesorero`, entra a `/perfil` → activar MFA → escanea con Google Authenticator → verifica.
2. Cierra sesión.
3. Vuelve a entrar con `test-tesorero` + contraseña → debe pedir el código TOTP en una segunda pantalla.
4. Inserta el código → entra a `/mi-dia`.
5. Inserta un código incorrecto → debe rechazar y permitir reintentar.
6. Click "Cancelar e intentar de nuevo" → cierra sesión y vuelve al form de contraseña.

---

## 7. Aislamiento al construir espacios (a futuro, conforme se implementen)

Cuando se implementen las tablas con datos por empresa (proyectos, OC, OT, CFDI, empleados), repetir esta plantilla por tabla:

```
1. Como Joaquín (CEO), insertar 1 registro de prueba en empresa A y 1 en empresa B.
2. Como usuario operativo de empresa A:
   - Listar la tabla → debe ver SOLO el registro de A.
   - Acceder por URL al detalle del registro de B → 404 o "sin permiso".
3. Como tesorero corporativo:
   - Si la tabla es financiera (OT inter-co, préstamos), debe ver ambos.
   - Si es operativa (proyectos), debe ver solo aquellas de empresas donde tiene vínculo.
```

Cada tabla nueva con `empresa_id` requiere migración con sus policies según el patrón en [02-multi-tenancy.md](../../pse-erp-package/01-arquitectura/02-multi-tenancy.md) (Patrones 1‑5).

---

## 8. Cuando todo lo anterior pase

Marca Sprint 1 como cerrado y:

1. Rotar `service_role` key (Settings → API → Reset).
2. Borrar el PAT que se usó para automatizar (Account → Tokens).
3. Cambiar la DB password (Settings → Database → Reset password).
4. Activar "Confirm email" en Auth → Providers (dejaba off para dev).
5. Borrar los usuarios de prueba (`test-*`) o desactivar sus vínculos.
