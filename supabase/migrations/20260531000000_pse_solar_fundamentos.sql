-- ============================================================================
-- Sprint 6 — PSE Solar Workflow (fundamentos)
--
-- Este sprint implementa solo las CORRECCIONES anchor del Sprint 6 v1.0
-- listadas en el plan reescrito (sección "Cambios respecto al Sprint 6 v1.0"):
--
--   - verificador_id opcional en proyectos (NO se crea atributo nuevo,
--     se reusa pm_id existente para el PM)
--   - modalidad_pago_propuesta en oportunidades/cotizaciones (lo que se
--     está discutiendo)
--   - modalidad_pago en proyectos (definitivo al firmar)
--   - plantilla_tipo en proyectos (residencial/comercial/industrial)
--
-- El plan recomienda regenerar los 4 prompts detallados (6.1-6.4) en una
-- conversación nueva con todos los aprendizajes acumulados, aplicando:
--   - Plantillas de proyecto con etapas, sub-tareas, hitos, docs requeridos
--   - Expediente cliente con checklist diferenciado por tipo+modalidad
--   - Decisiones Paso 5 explícitas
--   - Codificación SGC (FP, FO, MA, PO con revisiones)
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plantilla_proyecto') THEN
    CREATE TYPE plantilla_proyecto AS ENUM (
      'solar_residencial',
      'solar_comercial',
      'solar_industrial',
      'mantenimiento_solar',
      'limpieza_solar',
      'otro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'modalidad_pago_proyecto') THEN
    CREATE TYPE modalidad_pago_proyecto AS ENUM (
      'contado',
      'credito_directo',
      'leasing',
      'arrendamiento_puro',
      'fideicomiso',
      'mixto',
      'por_definir'
    );
  END IF;
END$$;

-- 2. Proyectos: verificador, modalidad_pago, plantilla_tipo
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS verificador_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS modalidad_pago modalidad_pago_proyecto,
  ADD COLUMN IF NOT EXISTS plantilla_tipo plantilla_proyecto;

CREATE INDEX IF NOT EXISTS idx_proyectos_verificador
  ON proyectos(verificador_id) WHERE verificador_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proyectos_plantilla
  ON proyectos(plantilla_tipo) WHERE plantilla_tipo IS NOT NULL;

COMMENT ON COLUMN proyectos.verificador_id IS
  'Usuario verificador externo (UVIE, EMA) cuando aplica. Distinto al pm_id.';
COMMENT ON COLUMN proyectos.modalidad_pago IS
  'Modalidad de pago definitiva al firmar contrato. Diferente a la propuesta en oportunidad/cotización (que aún se discute).';
COMMENT ON COLUMN proyectos.plantilla_tipo IS
  'Plantilla base del proyecto. Define etapas, sub-tareas, hitos y documentos requeridos (Sprint 6.1 detallado).';

-- 3. Oportunidades y cotizaciones: modalidad_pago_propuesta
ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS modalidad_pago_propuesta modalidad_pago_proyecto;

ALTER TABLE cotizaciones
  ADD COLUMN IF NOT EXISTS modalidad_pago_propuesta modalidad_pago_proyecto;

COMMENT ON COLUMN oportunidades.modalidad_pago_propuesta IS
  'Modalidad de pago en discusión. Se traslada a proyectos.modalidad_pago al ganar+firmar.';
COMMENT ON COLUMN cotizaciones.modalidad_pago_propuesta IS
  'Modalidad de pago propuesta en cotización. Se traslada a proyectos.modalidad_pago al promover a proyecto.';

-- 4. Tabla v_proyectos_pse_solar: lista enfocada para PSE Solar
CREATE OR REPLACE VIEW v_proyectos_pse_solar AS
SELECT
  p.id,
  p.codigo,
  p.nombre,
  p.empresa_id,
  p.marca_visible_id,
  p.cliente_id,
  p.estado,
  p.semaforo,
  p.plantilla_tipo,
  p.modalidad_pago,
  p.capacidad_kwp,
  p.fecha_contrato,
  p.fecha_inicio_planeado,
  p.fecha_fin_planeado,
  p.monto_contratado,
  p.pm_id,
  p.verificador_id,
  p.vendedor_id
FROM proyectos p
WHERE p.activo = TRUE
  AND p.plantilla_tipo IN ('solar_residencial', 'solar_comercial', 'solar_industrial');

COMMENT ON VIEW v_proyectos_pse_solar IS
  'Proyectos PSE Solar (residencial/comercial/industrial). Base para reportes específicos.';
