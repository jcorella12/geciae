-- ============================================================================
-- Sprint 2 — S2-T1 + S2-T3
-- Extender `cfdi_pagos` para soportar pagos manuales (sin CFDI de complemento)
-- + idempotency token + audit. Antes, `registrarPagoCfdi` solo actualizaba
-- `cfdi.monto_pagado` (acumulado) y perdía el histórico de cada pago.
-- ============================================================================

-- 1) cfdi_id ahora puede ser NULL cuando es un pago manual sin complemento.
--    El check garantiza coherencia: o hay CFDI de complemento, o es manual.
ALTER TABLE cfdi_pagos
  ALTER COLUMN cfdi_id DROP NOT NULL;

ALTER TABLE cfdi_pagos
  ADD COLUMN IF NOT EXISTS manual BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS idempotency_token UUID,
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- UNIQUE en idempotency_token (NULLS DISTINCT permite múltiples NULLs
-- históricos, pero un mismo token solo puede aparecer una vez).
CREATE UNIQUE INDEX IF NOT EXISTS uq_cfdi_pagos_idempotency
  ON cfdi_pagos (idempotency_token)
  WHERE idempotency_token IS NOT NULL;

-- Check: si NO es manual, debe tener cfdi_id (el CFDI de complemento).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cfdi_pagos_cfdi_o_manual'
  ) THEN
    ALTER TABLE cfdi_pagos
      ADD CONSTRAINT cfdi_pagos_cfdi_o_manual
      CHECK (manual = TRUE OR cfdi_id IS NOT NULL);
  END IF;
END$$;

COMMENT ON COLUMN cfdi_pagos.manual IS
  'TRUE = pago capturado manualmente sin CFDI de complemento de pago. '
  'FALSE = el cfdi_id apunta al CFDI de complemento timbrado.';

COMMENT ON COLUMN cfdi_pagos.idempotency_token IS
  'Token UUID generado por el cliente al disparar el formulario de pago. '
  'Si llega la misma petición dos veces (doble click, retry de red), el '
  'INSERT falla por UNIQUE y registramos solo una vez.';

-- 2) Vista helper: pagos visibles por CFDI pagado (manual + complemento).
CREATE OR REPLACE VIEW v_cfdi_pagos_consolidados AS
SELECT
  cp.id,
  cp.cfdi_pagado_id,
  cp.cfdi_id AS cfdi_complemento_id,
  cp.fecha_pago,
  cp.forma_pago,
  cp.moneda,
  cp.monto,
  cp.cuenta_origen,
  cp.cuenta_destino,
  cp.num_operacion,
  cp.observaciones,
  cp.manual,
  cp.registrado_por,
  (SELECT email FROM auth.users WHERE id = cp.registrado_por)
    AS registrado_por_email,
  cp.created_at
FROM cfdi_pagos cp;

COMMENT ON VIEW v_cfdi_pagos_consolidados IS
  'Historial completo de pagos por CFDI: tanto los timbrados via '
  'complemento de pago (manual=FALSE) como los capturados a mano '
  '(manual=TRUE). Para usar en la pantalla de detalle de CFDI.';
