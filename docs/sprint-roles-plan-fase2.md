# Sprint ROLES — Plan de Fase 2 (migración enum + datos + RLS)

> **Estado:** Fase 1 (capa de visibilidad, `lib/auth/roles-simplificados.ts`)
> ✅ desplegada (commit 15df9d2). Esta fase 2 toca la BD en vivo (enum, datos,
> RLS) — **NO aplicar sin revisión de Joaquín y el script de verificación**.

## Inventario real de RLS (medido 2026-07-06)

| Métrica | Valor |
|---|---|
| Políticas RLS totales (public) | 245 |
| Que referencian rol/atributo | 164 |
| **Que ya usan funciones helper** (no requieren edición) | **150** |
| Que referencian rol DIRECTAMENTE (editar a mano) | **10** |

**La buena noticia:** el doc original asumía reescribir ~96 migraciones. La
realidad: 150 políticas pasan por funciones helper centralizadas, así que
basta con **cambiar la lógica interna de los helpers**. Solo 10 políticas
necesitan edición manual.

### Las 10 políticas a editar a mano
`catalogo_servicios_update`, `clientes_update`, `clientes_empresas_update`,
`contactos_cliente_update`, `empleados_update`, `oc_update`,
`oc_conceptos_update`, `oc_conceptos_delete`, `ot_update`, `proyectos_update`.

### Funciones helper que centralizan el acceso (modificar estas)
`usuario_es_ceo`, `usuario_tiene_atributo`, `empresas_del_usuario`,
`usuario_tiene_rol_en_empresa`, `usuario_activo_grupo`,
`usuario_puede_gestionar_catalogos`, `usuario_puede_gestionar_sat`,
`usuario_puede_ver_ajustes_gerenciales`, `usuario_puede_ver_estados_gerenciales`,
`es_jefe_directo_de`.

## Enum actual
`rol_usuario`: `ceo, director, operativo, empleado, cliente`

## Estrategia (expand-contract, sin downtime)

1. **Expand enum** (irreversible pero aditivo, seguro):
   `ALTER TYPE rol_usuario ADD VALUE 'directivo'; ADD VALUE 'administrativo';`
   (no se quitan los viejos — `cliente` queda dormante.)

2. **Modificar helpers para reconocer ambos modelos.** Ejemplo:
   ```sql
   -- usuario_es_ceo() pasa a "es directivo"
   CREATE OR REPLACE FUNCTION usuario_es_ceo() ... 
     WHERE rol IN ('ceo','director','directivo')
        OR 'contralor' = ANY(atributos)
        OR 'tesorero_corporativo' = ANY(atributos);
   ```
   Con esto las 150 políticas que lo usan quedan correctas para el nuevo
   modelo sin tocarse. (Renombrar la función a `es_directivo` es opcional —
   alias para no romper las 150 referencias.)

3. **Editar las 10 políticas directas** para usar el helper equivalente.

4. **Migrar datos** (`usuarios_empresas.rol`):
   - `ceo`, `director` → `directivo`
   - atributos `contralor`/`tesorero_corporativo` (cualquier rol) → `directivo`
   - `aprobador_financiero` o `rh` (no directivo) → `administrativo`
   - `empleado`, `operativo` (sin lo anterior) → `operativo`
   - Limpiar atributos: conservar solo `vendedor`, `supervisor_cuadrilla`, `rh`.
   - **Generar tabla usuario→rol_viejo+atributos→rol_nuevo para revisión
     humana ANTES del UPDATE** (con 25 usuarios cabe en el PR).

5. **Verificación obligatoria** (`scripts/verificar-acceso-roles.ts`):
   correr SELECT sobre ~10 tablas (proyectos, clientes, cfdi, empleados,
   prestamos_inter_co, bancos) con sesión de 1 usuario por rol nuevo,
   comparar contra la matriz esperada. Baseline ANTES + resultado DESPUÉS.

## TypeScript (cuando se aplique la fase 2)
- `lib/auth/permisos.ts`: `RolBase` → incluir los 3 nuevos (conservar viejos
  como deprecados durante transición).
- `rolSimplificado()` (ya existe) pasa a leer el rol nuevo directo cuando los
  datos estén migrados (el mapeo actual sigue siendo correcto como fallback).
- `invitar-form.tsx` / edición de usuario: selector de 3 roles + checkboxes
  de las 3 etiquetas; eliminar UI de umbrales por persona (umbral por empresa
  en `/configuracion/umbrales`).

## Matriz de acceso objetivo (de R1 del sprint)
| | directivo | administrativo | operativo |
|---|---|---|---|
| Operación (proyectos, clientes, cotiz, activos, inventario) | ✅ | ✅ | ✅ |
| Finanzas (OC/OT/CFDI/tesorería/cumplimiento) | ✅ | ✅ | ❌ (solo lo suyo) |
| Salarios/nómina de otros | ✅ | ❌ (salvo `rh`) | ❌ |
| Ajustes gerenciales, config, usuarios, /admin | ✅ | ❌ | ❌ |
