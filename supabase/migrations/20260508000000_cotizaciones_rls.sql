-- Sprint 17 — Cotizaciones: RLS + función generar número + trigger de totales.

-- ============================================================
-- RLS para oportunidades, cotizaciones, conceptos, actividades
-- ============================================================
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades_comerciales ENABLE ROW LEVEL SECURITY;

-- Oportunidades: visibles para empresas del usuario o vendedor asignado
DROP POLICY IF EXISTS oportunidades_select ON oportunidades;
CREATE POLICY oportunidades_select ON oportunidades
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR vendedor_id = auth.uid()
  );

DROP POLICY IF EXISTS oportunidades_modify ON oportunidades;
CREATE POLICY oportunidades_modify ON oportunidades
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR vendedor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = oportunidades.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- Cotizaciones: visibles para empresas del usuario
DROP POLICY IF EXISTS cotizaciones_select ON cotizaciones;
CREATE POLICY cotizaciones_select ON cotizaciones
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('vendedor')
  );

DROP POLICY IF EXISTS cotizaciones_modify ON cotizaciones;
CREATE POLICY cotizaciones_modify ON cotizaciones
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = cotizaciones.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
    OR usuario_tiene_atributo('vendedor')
  );

-- Conceptos: heredan
DROP POLICY IF EXISTS cot_conceptos_all ON cotizaciones_conceptos;
CREATE POLICY cot_conceptos_all ON cotizaciones_conceptos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cotizaciones c
      WHERE c.id = cotizaciones_conceptos.cotizacion_id
        AND (
          c.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR usuario_tiene_atributo('vendedor')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cotizaciones c
      WHERE c.id = cotizaciones_conceptos.cotizacion_id
        AND (
          c.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR usuario_tiene_atributo('vendedor')
        )
    )
  );

-- Actividades comerciales
DROP POLICY IF EXISTS act_com_select ON actividades_comerciales;
CREATE POLICY act_com_select ON actividades_comerciales
  FOR SELECT TO authenticated
  USING (
    capturado_por = auth.uid()
    OR usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM oportunidades o
      WHERE o.id = actividades_comerciales.oportunidad_id
        AND (
          o.empresa_id IN (SELECT empresas_del_usuario())
          OR o.vendedor_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS act_com_insert ON actividades_comerciales;
CREATE POLICY act_com_insert ON actividades_comerciales
  FOR INSERT TO authenticated
  WITH CHECK (capturado_por = auth.uid());

-- ============================================================
-- Función para generar número de cotización (CO-YYYY-NNNN por empresa)
-- ============================================================
CREATE OR REPLACE FUNCTION generar_numero_cotizacion(p_empresa_id UUID)
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
  FROM cotizaciones
  WHERE empresa_id = p_empresa_id
    AND numero LIKE 'CO-' || anio || '-%'
    AND numero ~ ('^CO-' || anio || '-\d{4}$');
  RETURN 'CO-' || anio || '-' || LPAD(consecutivo::TEXT, 4, '0');
END;
$$;

-- ============================================================
-- Trigger: auto-calcular fecha_vencimiento desde vigencia_dias
-- y totales si no están seteados
-- ============================================================
CREATE OR REPLACE FUNCTION cotizacion_completar_calculados()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Fecha vencimiento = fecha_emision + vigencia_dias
  IF NEW.fecha_vencimiento IS NULL AND NEW.fecha_emision IS NOT NULL AND NEW.vigencia_dias IS NOT NULL THEN
    NEW.fecha_vencimiento := NEW.fecha_emision + NEW.vigencia_dias;
  END IF;
  -- Total si no viene
  IF NEW.total IS NULL THEN
    NEW.total := COALESCE(NEW.subtotal, 0)
      - COALESCE(NEW.descuento, 0)
      + COALESCE(NEW.iva, 0)
      - COALESCE(NEW.retenciones, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotizacion_calculados ON cotizaciones;
CREATE TRIGGER trg_cotizacion_calculados
  BEFORE INSERT OR UPDATE ON cotizaciones
  FOR EACH ROW
  EXECUTE FUNCTION cotizacion_completar_calculados();

-- ============================================================
-- Trigger: cuando se inserta/actualiza un concepto, recalcular totales
-- ============================================================
CREATE OR REPLACE FUNCTION recalcular_totales_cotizacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cotizacion_id UUID;
  v_subtotal NUMERIC;
  v_descuento NUMERIC;
  v_iva NUMERIC;
BEGIN
  v_cotizacion_id := COALESCE(NEW.cotizacion_id, OLD.cotizacion_id);

  SELECT
    COALESCE(SUM(importe), 0),
    COALESCE(SUM(descuento), 0),
    COALESCE(SUM(importe * COALESCE(iva_tasa, 0.16)), 0)
  INTO v_subtotal, v_descuento, v_iva
  FROM cotizaciones_conceptos
  WHERE cotizacion_id = v_cotizacion_id;

  UPDATE cotizaciones
  SET
    subtotal = v_subtotal,
    iva = v_iva,
    total = v_subtotal - v_descuento + v_iva
  WHERE id = v_cotizacion_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_cot_concepto ON cotizaciones_conceptos;
CREATE TRIGGER trg_recalc_cot_concepto
  AFTER INSERT OR UPDATE OR DELETE ON cotizaciones_conceptos
  FOR EACH ROW
  EXECUTE FUNCTION recalcular_totales_cotizacion();

-- ============================================================
-- Vista: cotizaciones con datos enriquecidos para listado
-- ============================================================
CREATE OR REPLACE VIEW v_cotizaciones_lista AS
SELECT
  c.id,
  c.empresa_id,
  c.cliente_id,
  c.oportunidad_id,
  c.numero,
  c.version,
  c.fecha_emision,
  c.fecha_vencimiento,
  c.vigencia_dias,
  c.subtotal,
  c.descuento,
  c.iva,
  c.total,
  c.estado,
  c.enviada_a_cliente,
  c.fecha_envio,
  c.vista_por_cliente,
  c.aprobada_internamente,
  c.created_at,
  e.codigo AS empresa_codigo,
  e.razon_social AS empresa_razon_social,
  cl.razon_social AS cliente_razon_social,
  cl.rfc AS cliente_rfc,
  cl.nombre_comercial AS cliente_nombre_comercial,
  -- Estado computado: vencida si pasó la fecha y aún está en borrador/enviada
  CASE
    WHEN c.estado IN ('borrador', 'enviada')
      AND c.fecha_vencimiento IS NOT NULL
      AND c.fecha_vencimiento < CURRENT_DATE
    THEN 'vencida'
    ELSE c.estado
  END AS estado_computado,
  (SELECT COUNT(*) FROM cotizaciones_conceptos cc WHERE cc.cotizacion_id = c.id) AS num_conceptos
FROM cotizaciones c
LEFT JOIN empresas e ON e.id = c.empresa_id
LEFT JOIN clientes cl ON cl.id = c.cliente_id;

-- ============================================================
-- Storage bucket para PDFs de cotizaciones
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('cotizaciones', 'cotizaciones', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS cot_storage_select ON storage.objects;
CREATE POLICY cot_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cotizaciones');

DROP POLICY IF EXISTS cot_storage_insert ON storage.objects;
CREATE POLICY cot_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cotizaciones');

DROP POLICY IF EXISTS cot_storage_delete ON storage.objects;
CREATE POLICY cot_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'cotizaciones'
    AND (
      usuario_es_ceo()
      OR usuario_tiene_atributo('vendedor')
    )
  );
