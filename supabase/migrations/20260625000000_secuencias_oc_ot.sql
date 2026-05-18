-- ============================================================================
-- Sprint S.3.1 — Numeración OC y OT con secuencias atómicas por empresa/año.
--
-- Reemplaza el patrón "count + 1" por una secuencia Postgres protegida con
-- advisory lock por (empresa_id, año, tipo). Resultado: nunca colisiona aunque
-- 100 OCs se creen en el mismo segundo.
-- ============================================================================

-- Tabla auxiliar: contador por (empresa, año, tipo).
CREATE TABLE IF NOT EXISTS contadores_folio (
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2024 AND 2099),
  tipo TEXT NOT NULL CHECK (tipo IN ('oc', 'ot')),
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (empresa_id, anio, tipo)
);

ALTER TABLE contadores_folio ENABLE ROW LEVEL SECURITY;

-- Solo SECURITY DEFINER puede tocarlo — los clientes no leen ni escriben directo.
DROP POLICY IF EXISTS cf_no_direct ON contadores_folio;
CREATE POLICY cf_no_direct ON contadores_folio FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- Función que reserva el siguiente número de forma atómica.
CREATE OR REPLACE FUNCTION siguiente_folio(
  p_empresa_id UUID,
  p_tipo TEXT,
  p_anio INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_numero INTEGER;
  v_prefijo TEXT;
BEGIN
  IF p_tipo NOT IN ('oc', 'ot') THEN
    RAISE EXCEPTION 'Tipo de folio inválido: %', p_tipo;
  END IF;

  -- Advisory lock por (empresa, año, tipo) — no bloquea otras empresas/años.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_empresa_id::TEXT || p_anio::TEXT || p_tipo, 0)
  );

  -- UPSERT atómico.
  INSERT INTO contadores_folio (empresa_id, anio, tipo, ultimo_numero)
  VALUES (p_empresa_id, p_anio, p_tipo, 1)
  ON CONFLICT (empresa_id, anio, tipo) DO UPDATE
    SET ultimo_numero = contadores_folio.ultimo_numero + 1,
        updated_at = NOW()
  RETURNING ultimo_numero INTO v_numero;

  v_prefijo := CASE p_tipo WHEN 'oc' THEN 'OC' WHEN 'ot' THEN 'OT' END;

  RETURN v_prefijo || '-' || p_anio || '-' || LPAD(v_numero::TEXT, 4, '0');
END;
$$;

-- Bootstrap: inicializar contadores con los máximos ya existentes para
-- no colisionar con OCs/OTs históricas.
INSERT INTO contadores_folio (empresa_id, anio, tipo, ultimo_numero)
SELECT
  empresa_id,
  EXTRACT(YEAR FROM fecha_emision)::INTEGER AS anio,
  'oc' AS tipo,
  MAX(
    CASE
      WHEN numero ~ '^OC-\d{4}-\d{4}$'
      THEN SUBSTRING(numero FROM '\d{4}$')::INTEGER
      ELSE 0
    END
  ) AS ultimo_numero
FROM ordenes_compra
WHERE numero IS NOT NULL
GROUP BY empresa_id, EXTRACT(YEAR FROM fecha_emision)
ON CONFLICT (empresa_id, anio, tipo) DO UPDATE
  SET ultimo_numero = GREATEST(contadores_folio.ultimo_numero, EXCLUDED.ultimo_numero);

INSERT INTO contadores_folio (empresa_id, anio, tipo, ultimo_numero)
SELECT
  empresa_origen_id,
  EXTRACT(YEAR FROM fecha_solicitud)::INTEGER,
  'ot',
  MAX(
    CASE
      WHEN numero ~ '^OT-\d{4}-\d{4}$'
      THEN SUBSTRING(numero FROM '\d{4}$')::INTEGER
      ELSE 0
    END
  )
FROM ordenes_trabajo_inter_co
WHERE numero IS NOT NULL
GROUP BY empresa_origen_id, EXTRACT(YEAR FROM fecha_solicitud)
ON CONFLICT (empresa_id, anio, tipo) DO UPDATE
  SET ultimo_numero = GREATEST(contadores_folio.ultimo_numero, EXCLUDED.ultimo_numero);

-- Constraint UNIQUE defensivo (segunda red).
ALTER TABLE ordenes_compra
  ADD CONSTRAINT ordenes_compra_empresa_numero_unico
  UNIQUE (empresa_id, numero);

ALTER TABLE ordenes_trabajo_inter_co
  ADD CONSTRAINT ot_empresa_numero_unico
  UNIQUE (empresa_origen_id, numero);

COMMENT ON FUNCTION siguiente_folio IS
  'Reserva atómicamente el siguiente folio de OC/OT para una empresa/año. '
  'Usa advisory lock + UPSERT para garantizar unicidad sin race conditions.';
