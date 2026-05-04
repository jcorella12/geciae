-- Sprint 19 — Extender bancos_cuentas para soportar líneas de crédito e inversiones.
-- Una "cuenta bancaria" puede ser:
--   - cheques / ahorro (saldo positivo)
--   - inversion (saldo positivo en valores)
--   - credito (línea revolvente: monto aprobado, dispuesto, disponible)

-- 1) Permitir nuevos tipos
-- (la columna `tipo` ya es TEXT libre, así que no hay enum que actualizar)

-- 2) Columnas nuevas
ALTER TABLE bancos_cuentas
  ADD COLUMN IF NOT EXISTS contrato TEXT,
  ADD COLUMN IF NOT EXISTS spid TEXT,
  ADD COLUMN IF NOT EXISTS asesor TEXT,
  -- Línea de crédito
  ADD COLUMN IF NOT EXISTS linea_credito_monto_aprobado NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS linea_credito_dispuesto NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS linea_credito_tasa_referencia TEXT, -- ej. "TIIE28"
  ADD COLUMN IF NOT EXISTS linea_credito_tasa_spread NUMERIC(7, 4), -- ej. 5.0000
  ADD COLUMN IF NOT EXISTS linea_credito_tasa_efectiva NUMERIC(7, 4), -- la última calculada
  ADD COLUMN IF NOT EXISTS linea_credito_fecha_apertura DATE,
  ADD COLUMN IF NOT EXISTS linea_credito_fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS linea_credito_proximo_pago_fecha DATE,
  ADD COLUMN IF NOT EXISTS linea_credito_proximo_pago_monto NUMERIC(14, 2),
  ADD COLUMN IF NOT EXISTS linea_credito_pagos_pendientes INTEGER,
  -- Garantía: referencia a otra cuenta (típicamente la cuenta de inversión que respalda el crédito)
  ADD COLUMN IF NOT EXISTS cuenta_garantia_id UUID REFERENCES bancos_cuentas(id),
  -- Inversión / Fondo
  ADD COLUMN IF NOT EXISTS inversion_emisora TEXT,
  ADD COLUMN IF NOT EXISTS inversion_titulos NUMERIC(14, 4),
  ADD COLUMN IF NOT EXISTS inversion_precio_titulo NUMERIC(14, 6),
  ADD COLUMN IF NOT EXISTS inversion_es_garantia BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inversion_rendimiento_mensual_pct NUMERIC(6, 4);

-- 3) Calcular el "disponible" en una columna generada (computed)
-- (no la generamos store-computed para mantener simple — la calculamos en el código UI)

COMMENT ON COLUMN bancos_cuentas.linea_credito_dispuesto IS
  'Saldo insoluto / monto utilizado del crédito (lo que se debe).';
COMMENT ON COLUMN bancos_cuentas.linea_credito_monto_aprobado IS
  'Monto total aprobado de la línea revolvente.';
COMMENT ON COLUMN bancos_cuentas.cuenta_garantia_id IS
  'Cuenta de inversión que respalda este crédito (prenda bursátil).';

-- 4) Vista actualizada
CREATE OR REPLACE VIEW v_bancos_cuentas_full AS
SELECT
  c.id,
  c.empresa_id,
  c.banco,
  c.numero_cuenta,
  c.clabe,
  c.spid,
  c.alias,
  c.tipo,
  c.moneda,
  c.contrato,
  c.asesor,
  c.saldo_actual,
  c.fecha_actualizacion_saldo,
  c.activa,
  -- Línea de crédito
  c.linea_credito_monto_aprobado,
  c.linea_credito_dispuesto,
  CASE
    WHEN c.linea_credito_monto_aprobado IS NOT NULL
      THEN c.linea_credito_monto_aprobado - COALESCE(c.linea_credito_dispuesto, 0)
    ELSE NULL
  END AS linea_credito_disponible,
  c.linea_credito_tasa_referencia,
  c.linea_credito_tasa_spread,
  c.linea_credito_tasa_efectiva,
  c.linea_credito_fecha_apertura,
  c.linea_credito_fecha_vencimiento,
  c.linea_credito_proximo_pago_fecha,
  c.linea_credito_proximo_pago_monto,
  c.linea_credito_pagos_pendientes,
  c.cuenta_garantia_id,
  -- Inversión
  c.inversion_emisora,
  c.inversion_titulos,
  c.inversion_precio_titulo,
  c.inversion_es_garantia,
  c.inversion_rendimiento_mensual_pct,
  -- Empresa
  e.codigo AS empresa_codigo
FROM bancos_cuentas c
LEFT JOIN empresas e ON e.id = c.empresa_id;
