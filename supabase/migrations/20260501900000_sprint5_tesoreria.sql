-- ============================================================================
-- Sprint 5 — Tesorería + OT inter-compañías + Préstamos + TIIE
-- ============================================================================
-- 1. Tabla `tiie_historico` (no existe en spec original)
-- 2. Función `intereses_diarios_prestamo` para cálculo de intereses
-- 3. RLS para todas las tablas inter-co (catalogo_servicios, OT, lineas crédito,
--    préstamos, intereses, bancos)
-- ============================================================================

-- ---------- TIIE histórico ----------
CREATE TABLE IF NOT EXISTS tiie_historico (
  fecha DATE PRIMARY KEY,
  tasa NUMERIC(8, 6) NOT NULL,            -- decimal: 0.115023 = 11.5023%
  tipo TEXT NOT NULL DEFAULT 'tiie_28',   -- tiie_28, tiie_91, etc.
  fuente TEXT DEFAULT 'banxico',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tiie_fecha_desc ON tiie_historico(fecha DESC);

ALTER TABLE tiie_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tiie_select ON tiie_historico;
CREATE POLICY tiie_select ON tiie_historico
  FOR SELECT TO authenticated
  USING (usuario_activo_grupo());

-- INSERT lo hace una API route con service-role o auth user (registro manual),
-- limitado a CEO/Director/aprobador_financiero/tesorero.
DROP POLICY IF EXISTS tiie_insert ON tiie_historico;
CREATE POLICY tiie_insert ON tiie_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('aprobador_financiero')
  );

-- ---------- catalogo_servicios ----------
ALTER TABLE catalogo_servicios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_servicios_select ON catalogo_servicios;
CREATE POLICY catalogo_servicios_select ON catalogo_servicios
  FOR SELECT TO authenticated USING (usuario_activo_grupo());

DROP POLICY IF EXISTS catalogo_servicios_insert ON catalogo_servicios;
CREATE POLICY catalogo_servicios_insert ON catalogo_servicios
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = catalogo_servicios.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS catalogo_servicios_update ON catalogo_servicios;
CREATE POLICY catalogo_servicios_update ON catalogo_servicios
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = catalogo_servicios.empresa_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- ---------- ordenes_trabajo_inter_co ----------
ALTER TABLE ordenes_trabajo_inter_co ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario en empresa origen O destino
DROP POLICY IF EXISTS ot_select ON ordenes_trabajo_inter_co;
CREATE POLICY ot_select ON ordenes_trabajo_inter_co
  FOR SELECT TO authenticated
  USING (
    empresa_origen_id IN (SELECT empresas_del_usuario())
    OR empresa_destino_id IN (SELECT empresas_del_usuario())
  );

-- INSERT: ceo/director/operativo de empresa origen
DROP POLICY IF EXISTS ot_insert ON ordenes_trabajo_inter_co;
CREATE POLICY ot_insert ON ordenes_trabajo_inter_co
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = ordenes_trabajo_inter_co.empresa_origen_id
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- UPDATE: ceo/director/operativo de cualquiera de las 2 empresas
DROP POLICY IF EXISTS ot_update ON ordenes_trabajo_inter_co;
CREATE POLICY ot_update ON ordenes_trabajo_inter_co
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND (
          empresa_id = ordenes_trabajo_inter_co.empresa_origen_id
          OR empresa_id = ordenes_trabajo_inter_co.empresa_destino_id
        )
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- ---------- lineas_credito_inter_co ----------
ALTER TABLE lineas_credito_inter_co ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lineas_credito_select ON lineas_credito_inter_co;
CREATE POLICY lineas_credito_select ON lineas_credito_inter_co
  FOR SELECT TO authenticated
  USING (
    empresa_acreedora_id IN (SELECT empresas_del_usuario())
    OR empresa_deudora_id IN (SELECT empresas_del_usuario())
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS lineas_credito_modify ON lineas_credito_inter_co;
CREATE POLICY lineas_credito_modify ON lineas_credito_inter_co
  FOR ALL TO authenticated
  USING (usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo'))
  WITH CHECK (usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo'));

-- ---------- prestamos_inter_co ----------
ALTER TABLE prestamos_inter_co ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prestamos_select ON prestamos_inter_co;
CREATE POLICY prestamos_select ON prestamos_inter_co
  FOR SELECT TO authenticated
  USING (
    empresa_acreedora_id IN (SELECT empresas_del_usuario())
    OR empresa_deudora_id IN (SELECT empresas_del_usuario())
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS prestamos_insert ON prestamos_inter_co;
CREATE POLICY prestamos_insert ON prestamos_inter_co
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND (
          empresa_id = prestamos_inter_co.empresa_acreedora_id
          OR empresa_id = prestamos_inter_co.empresa_deudora_id
        )
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario)
        AND activo = TRUE
    )
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS prestamos_update ON prestamos_inter_co;
CREATE POLICY prestamos_update ON prestamos_inter_co
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND (
          empresa_id = prestamos_inter_co.empresa_acreedora_id
          OR empresa_id = prestamos_inter_co.empresa_deudora_id
        )
        AND rol IN ('ceo'::rol_usuario, 'director'::rol_usuario)
        AND activo = TRUE
    )
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

-- ---------- prestamos_intereses ----------
ALTER TABLE prestamos_intereses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prestamos_intereses_select ON prestamos_intereses;
CREATE POLICY prestamos_intereses_select ON prestamos_intereses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prestamos_inter_co p
      WHERE p.id = prestamos_intereses.prestamo_id
        AND (
          p.empresa_acreedora_id IN (SELECT empresas_del_usuario())
          OR p.empresa_deudora_id IN (SELECT empresas_del_usuario())
        )
    )
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS prestamos_intereses_insert ON prestamos_intereses;
CREATE POLICY prestamos_intereses_insert ON prestamos_intereses
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo')
  );

-- ---------- bancos_cuentas ----------
ALTER TABLE bancos_cuentas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bancos_cuentas_select ON bancos_cuentas;
CREATE POLICY bancos_cuentas_select ON bancos_cuentas
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_tiene_atributo('tesorero_corporativo')
  );

DROP POLICY IF EXISTS bancos_cuentas_modify ON bancos_cuentas;
CREATE POLICY bancos_cuentas_modify ON bancos_cuentas
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = bancos_cuentas.empresa_id
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  )
  WITH CHECK (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = bancos_cuentas.empresa_id
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

-- ---------- bancos_movimientos ----------
ALTER TABLE bancos_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bancos_mov_select ON bancos_movimientos;
CREATE POLICY bancos_mov_select ON bancos_movimientos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bancos_cuentas bc
      WHERE bc.id = bancos_movimientos.cuenta_id
        AND (
          bc.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_tiene_atributo('tesorero_corporativo')
        )
    )
  );

DROP POLICY IF EXISTS bancos_mov_modify ON bancos_movimientos;
CREATE POLICY bancos_mov_modify ON bancos_movimientos
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo')
  )
  WITH CHECK (
    usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo')
  );

-- ---------- Función: tasa TIIE más reciente ----------
CREATE OR REPLACE FUNCTION tiie_mas_reciente()
RETURNS NUMERIC
LANGUAGE SQL STABLE
AS $$
  SELECT tasa FROM tiie_historico
  WHERE tipo = 'tiie_28'
  ORDER BY fecha DESC
  LIMIT 1;
$$;

-- ---------- Función: calcular y registrar intereses diarios para todos los préstamos vivos ----------
-- Para cada préstamo vivo (estado != 'pagado'/'cancelado'), inserta una fila
-- en prestamos_intereses para la fecha dada. Idempotente (ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION devengar_intereses_dia(p_fecha DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  prestamo RECORD;
  tasa_diaria NUMERIC;
  intereses_dia NUMERIC;
  intereses_acum NUMERIC;
  contador INTEGER := 0;
  tiie_dia NUMERIC;
BEGIN
  -- TIIE del día (o el más reciente disponible)
  SELECT tasa INTO tiie_dia FROM tiie_historico
  WHERE fecha <= p_fecha AND tipo = 'tiie_28'
  ORDER BY fecha DESC
  LIMIT 1;

  IF tiie_dia IS NULL THEN
    -- Sin TIIE histórico no podemos calcular. Salir silenciosamente.
    RETURN 0;
  END IF;

  FOR prestamo IN
    SELECT p.id, p.saldo_pendiente, p.monto_pagado, p.monto, l.spread
    FROM prestamos_inter_co p
    JOIN lineas_credito_inter_co l ON l.id = p.linea_id
    WHERE p.estado NOT IN ('pagado'::estado_prestamo, 'cancelado'::estado_prestamo)
      AND COALESCE(p.saldo_pendiente, p.monto - COALESCE(p.monto_pagado, 0)) > 0
  LOOP
    -- Tasa diaria = (TIIE + spread) / 360
    tasa_diaria := (tiie_dia + COALESCE(prestamo.spread, 0.06)) / 360.0;
    intereses_dia := COALESCE(prestamo.saldo_pendiente, prestamo.monto - COALESCE(prestamo.monto_pagado, 0)) * tasa_diaria;

    -- Acumulado del mes en curso
    SELECT COALESCE(SUM(intereses_dia), 0) + intereses_dia INTO intereses_acum
    FROM prestamos_intereses
    WHERE prestamo_id = prestamo.id
      AND date_trunc('month', fecha) = date_trunc('month', p_fecha);

    INSERT INTO prestamos_intereses (
      prestamo_id, fecha, saldo_principal, tasa_aplicada,
      intereses_dia, intereses_acumulados
    )
    VALUES (
      prestamo.id, p_fecha,
      COALESCE(prestamo.saldo_pendiente, prestamo.monto - COALESCE(prestamo.monto_pagado, 0)),
      tiie_dia + COALESCE(prestamo.spread, 0.06),
      ROUND(intereses_dia::numeric, 4),
      ROUND(intereses_acum::numeric, 2)
    )
    ON CONFLICT (prestamo_id, fecha) DO NOTHING;

    contador := contador + 1;
  END LOOP;

  RETURN contador;
END;
$$;

-- ---------- Helper: saldo de cuentas bancarias por empresa ----------
CREATE OR REPLACE VIEW v_saldo_bancos_por_empresa AS
SELECT
  bc.empresa_id,
  COUNT(*) AS num_cuentas,
  SUM(COALESCE(bc.saldo_actual, 0)) AS saldo_total,
  MAX(bc.fecha_actualizacion_saldo) AS ultima_actualizacion
FROM bancos_cuentas bc
WHERE bc.activa = TRUE
GROUP BY bc.empresa_id;

GRANT SELECT ON v_saldo_bancos_por_empresa TO authenticated;
