-- ============================================================================
-- Almacenes compartidos entre empresas del grupo.
--
-- Hasta ahora `almacenes.empresa_id` era NOT NULL: cada almacén pertenecía a
-- una empresa. Pero GECIAE tiene 3 almacenes físicos (Contenedores, La Truqui,
-- La Victoria) que las 4 empresas usan en común.
--
-- Cambios:
--   - `empresa_id` ahora es NULLABLE.
--   - Nueva columna `compartido BOOLEAN` para distinguir explícitamente.
--   - Constraint: o es propio (empresa_id NOT NULL, compartido FALSE) o es
--     compartido (empresa_id NULL, compartido TRUE).
--   - Unique constraint adaptada: por (empresa_id, codigo) para propios y por
--     codigo para compartidos.
--   - RLS: los almacenes compartidos son visibles para todos los autenticados
--     del grupo; solo el CEO los crea/edita.
-- ============================================================================

-- 1) Permitir NULL en empresa_id
ALTER TABLE almacenes ALTER COLUMN empresa_id DROP NOT NULL;

-- 2) Flag compartido
ALTER TABLE almacenes
  ADD COLUMN IF NOT EXISTS compartido BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN almacenes.compartido IS
  'TRUE si el almacén físico se comparte entre las empresas del grupo (sin empresa_id propietaria).';

-- 3) Check: propios tienen empresa_id, compartidos no
ALTER TABLE almacenes
  DROP CONSTRAINT IF EXISTS almacenes_propiedad_check;
ALTER TABLE almacenes
  ADD CONSTRAINT almacenes_propiedad_check
  CHECK (
    (empresa_id IS NOT NULL AND compartido = FALSE)
    OR (empresa_id IS NULL AND compartido = TRUE)
  );

-- 4) Unique constraint nueva (la vieja almacenes_empresa_id_codigo_key
--    quizás aún sirva pero no aplica para NULL — usamos índices condicionales).
ALTER TABLE almacenes
  DROP CONSTRAINT IF EXISTS almacenes_empresa_id_codigo_key;

CREATE UNIQUE INDEX IF NOT EXISTS almacenes_empresa_codigo_unique
  ON almacenes(empresa_id, codigo)
  WHERE empresa_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS almacenes_compartido_codigo_unique
  ON almacenes(codigo)
  WHERE compartido = TRUE;

-- 5) RLS: actualizar políticas
DROP POLICY IF EXISTS alm_select ON almacenes;
CREATE POLICY alm_select ON almacenes
  FOR SELECT TO authenticated
  USING (
    -- Compartidos visibles para todos los autenticados del grupo
    compartido = TRUE
    -- Propios visibles para miembros de la empresa o CEO
    OR empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
  );

DROP POLICY IF EXISTS alm_modify ON almacenes;
CREATE POLICY alm_modify ON almacenes
  FOR ALL TO authenticated
  USING (
    -- CEO modifica todo (propios y compartidos)
    usuario_es_ceo()
    -- Director/operativo modifica los propios de su empresa
    OR (
      compartido = FALSE
      AND empresa_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM usuarios_empresas ue
        WHERE ue.usuario_id = auth.uid()
          AND ue.empresa_id = almacenes.empresa_id
          AND ue.rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
          AND ue.activo = TRUE
      )
    )
  );

-- 6) Seed de los 3 almacenes compartidos del grupo GECIAE
INSERT INTO almacenes (empresa_id, codigo, nombre, tipo, compartido, activo)
VALUES
  (NULL, 'CONTENEDORES', 'Contenedores', 'principal', TRUE, TRUE),
  (NULL, 'LA-TRUQUI', 'La Truqui', 'principal', TRUE, TRUE),
  (NULL, 'LA-VICTORIA', 'La Victoria', 'principal', TRUE, TRUE)
ON CONFLICT DO NOTHING;
