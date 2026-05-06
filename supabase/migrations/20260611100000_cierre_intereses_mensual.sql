-- ============================================================================
-- Cierre mensual de intereses inter-co.
--
-- Cada fin de mes el tesorero/CEO ejecuta el cierre: se snapshot-ea el total
-- de intereses devengados por par de empresas (acreedora→deudora) y se deja
-- listo para emitir CFDI de intereses (que va en otra fase).
--
-- Una vez cerrado el mes, los renglones de `prestamos_intereses` quedan
-- "congelados" desde el punto de vista contable. Si por alguna razón hay
-- ajuste, se puede reabrir y volver a cerrar (no es destructivo — solo
-- recalcula el snapshot).
-- ============================================================================

CREATE TABLE IF NOT EXISTS cierres_intereses_mensuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_acreedora_id UUID NOT NULL REFERENCES empresas(id),
  empresa_deudora_id UUID NOT NULL REFERENCES empresas(id),
  anio INTEGER NOT NULL CHECK (anio BETWEEN 2024 AND 2099),
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  total_intereses NUMERIC(14,2) NOT NULL DEFAULT 0,
  num_prestamos INTEGER NOT NULL DEFAULT 0,
  saldo_promedio NUMERIC(14,2),
  cfdi_id UUID REFERENCES cfdi(id), -- CFDI emitido al cobrar los intereses (opcional)
  generado_por UUID NOT NULL REFERENCES auth.users(id),
  generado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observaciones TEXT,
  UNIQUE(empresa_acreedora_id, empresa_deudora_id, anio, mes)
);

CREATE INDEX IF NOT EXISTS idx_cierres_int_periodo
  ON cierres_intereses_mensuales(anio DESC, mes DESC);
CREATE INDEX IF NOT EXISTS idx_cierres_int_acr
  ON cierres_intereses_mensuales(empresa_acreedora_id);
CREATE INDEX IF NOT EXISTS idx_cierres_int_deu
  ON cierres_intereses_mensuales(empresa_deudora_id);

ALTER TABLE cierres_intereses_mensuales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cierres_int_select ON cierres_intereses_mensuales;
CREATE POLICY cierres_int_select ON cierres_intereses_mensuales
  FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR empresa_acreedora_id IN (SELECT empresas_del_usuario())
    OR empresa_deudora_id IN (SELECT empresas_del_usuario())
  );

DROP POLICY IF EXISTS cierres_int_modify ON cierres_intereses_mensuales;
CREATE POLICY cierres_int_modify ON cierres_intereses_mensuales
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo')
  );

-- ============================================================================
-- Función: cerrar_intereses_mes(anio, mes)
--   Agrega los intereses devengados del mes por par (acreedora, deudora) y
--   los inserta/actualiza en cierres_intereses_mensuales.
-- ============================================================================
CREATE OR REPLACE FUNCTION cerrar_intereses_mes(
  p_anio INTEGER,
  p_mes INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  caller UUID := auth.uid();
  desde DATE := MAKE_DATE(p_anio, p_mes, 1);
  hasta DATE := (MAKE_DATE(p_anio, p_mes, 1) + INTERVAL '1 month')::DATE;
  contador INTEGER := 0;
  par RECORD;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Sin sesión.';
  END IF;

  FOR par IN
    SELECT
      p.empresa_acreedora_id,
      p.empresa_deudora_id,
      SUM(pi.intereses_dia) AS total,
      COUNT(DISTINCT p.id) AS num_p,
      AVG(pi.saldo_principal) AS saldo_prom
    FROM prestamos_intereses pi
    JOIN prestamos_inter_co p ON p.id = pi.prestamo_id
    WHERE pi.fecha >= desde AND pi.fecha < hasta
    GROUP BY p.empresa_acreedora_id, p.empresa_deudora_id
  LOOP
    INSERT INTO cierres_intereses_mensuales (
      empresa_acreedora_id, empresa_deudora_id, anio, mes,
      total_intereses, num_prestamos, saldo_promedio, generado_por
    )
    VALUES (
      par.empresa_acreedora_id, par.empresa_deudora_id, p_anio, p_mes,
      ROUND(par.total::NUMERIC, 2), par.num_p,
      ROUND(par.saldo_prom::NUMERIC, 2), caller
    )
    ON CONFLICT (empresa_acreedora_id, empresa_deudora_id, anio, mes)
    DO UPDATE SET
      total_intereses = EXCLUDED.total_intereses,
      num_prestamos = EXCLUDED.num_prestamos,
      saldo_promedio = EXCLUDED.saldo_promedio,
      generado_por = EXCLUDED.generado_por,
      generado_at = NOW();

    contador := contador + 1;
  END LOOP;

  RETURN contador;
END;
$$;

COMMENT ON FUNCTION cerrar_intereses_mes IS
  'Genera o actualiza el snapshot mensual de intereses devengados inter-co. Lo ejecuta el CEO/tesorero a fin de mes.';

-- Vista helper: cierres con códigos de empresa
CREATE OR REPLACE VIEW v_cierres_intereses AS
SELECT
  c.id,
  c.anio,
  c.mes,
  c.empresa_acreedora_id,
  ea.codigo AS acreedora_codigo,
  ea.nombre_comercial AS acreedora_nombre,
  c.empresa_deudora_id,
  ed.codigo AS deudora_codigo,
  ed.nombre_comercial AS deudora_nombre,
  c.total_intereses,
  c.num_prestamos,
  c.saldo_promedio,
  c.cfdi_id,
  c.generado_at,
  c.observaciones
FROM cierres_intereses_mensuales c
LEFT JOIN empresas ea ON ea.id = c.empresa_acreedora_id
LEFT JOIN empresas ed ON ed.id = c.empresa_deudora_id;
