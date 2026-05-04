-- Sprint 5 — fixes y helpers adicionales para préstamos inter-co.

-- 1. Fix: la función `devengar_intereses_dia` usaba 'pagado' pero el enum es 'pagado_total'.
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
  SELECT tasa INTO tiie_dia FROM tiie_historico
  WHERE fecha <= p_fecha AND tipo = 'tiie_28'
  ORDER BY fecha DESC
  LIMIT 1;

  IF tiie_dia IS NULL THEN
    RETURN 0;
  END IF;

  FOR prestamo IN
    SELECT p.id, p.saldo_pendiente, p.monto_pagado, p.monto, l.spread
    FROM prestamos_inter_co p
    JOIN lineas_credito_inter_co l ON l.id = p.linea_id
    WHERE p.estado IN ('ejecutado'::estado_prestamo, 'confirmado'::estado_prestamo, 'pagado_parcial'::estado_prestamo)
      AND COALESCE(p.saldo_pendiente, p.monto - COALESCE(p.monto_pagado, 0)) > 0
  LOOP
    tasa_diaria := (tiie_dia + COALESCE(prestamo.spread, 0.06)) / 360.0;
    intereses_dia := COALESCE(prestamo.saldo_pendiente, prestamo.monto - COALESCE(prestamo.monto_pagado, 0)) * tasa_diaria;

    SELECT COALESCE(SUM(pi.intereses_dia), 0) + intereses_dia INTO intereses_acum
    FROM prestamos_intereses pi
    WHERE pi.prestamo_id = prestamo.id
      AND date_trunc('month', pi.fecha) = date_trunc('month', p_fecha);

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

-- 2. Trigger: actualizar saldo_pendiente automáticamente
CREATE OR REPLACE FUNCTION actualizar_saldo_prestamo()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.saldo_pendiente := NEW.monto - COALESCE(NEW.monto_pagado, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actualizar_saldo_prestamo ON prestamos_inter_co;
CREATE TRIGGER trg_actualizar_saldo_prestamo
  BEFORE INSERT OR UPDATE OF monto, monto_pagado ON prestamos_inter_co
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_saldo_prestamo();

-- 3. Trigger: actualizar monto_utilizado de la línea cuando cambia el estado del préstamo
CREATE OR REPLACE FUNCTION actualizar_monto_utilizado_linea()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalcular el monto utilizado de la línea como suma de saldos pendientes
  -- de préstamos vivos (ejecutado/confirmado/pagado_parcial)
  UPDATE lineas_credito_inter_co
  SET monto_utilizado = COALESCE((
    SELECT SUM(p.saldo_pendiente)
    FROM prestamos_inter_co p
    WHERE p.linea_id = COALESCE(NEW.linea_id, OLD.linea_id)
      AND p.estado IN ('ejecutado'::estado_prestamo, 'confirmado'::estado_prestamo, 'pagado_parcial'::estado_prestamo)
  ), 0)
  WHERE id = COALESCE(NEW.linea_id, OLD.linea_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_actualizar_monto_utilizado ON prestamos_inter_co;
CREATE TRIGGER trg_actualizar_monto_utilizado
  AFTER INSERT OR UPDATE OF estado, monto, monto_pagado OR DELETE ON prestamos_inter_co
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_monto_utilizado_linea();

-- 4. Vista: matriz de exposición inter-co (saldo neto entre cada par de empresas)
CREATE OR REPLACE VIEW v_matriz_inter_co AS
SELECT
  p.empresa_acreedora_id,
  p.empresa_deudora_id,
  COUNT(*) AS num_prestamos,
  SUM(p.saldo_pendiente) AS saldo_total,
  SUM(COALESCE(intereses_acum.suma, 0)) AS intereses_devengados
FROM prestamos_inter_co p
LEFT JOIN LATERAL (
  SELECT SUM(pi.intereses_dia) AS suma
  FROM prestamos_intereses pi
  WHERE pi.prestamo_id = p.id
) intereses_acum ON TRUE
WHERE p.estado IN ('ejecutado', 'confirmado', 'pagado_parcial')
GROUP BY p.empresa_acreedora_id, p.empresa_deudora_id;

-- 5. Helper: secuencia de número de préstamo (PR-YYYY-NNNN)
CREATE OR REPLACE FUNCTION generar_numero_prestamo()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  anio TEXT;
  consecutivo INTEGER;
BEGIN
  anio := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(SUBSTRING(numero FROM 9)::INTEGER), 0) + 1
  INTO consecutivo
  FROM prestamos_inter_co
  WHERE numero LIKE 'PR-' || anio || '-%';
  RETURN 'PR-' || anio || '-' || LPAD(consecutivo::TEXT, 4, '0');
END;
$$;
