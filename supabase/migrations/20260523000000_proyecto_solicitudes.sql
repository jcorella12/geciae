-- ============================================================================
-- Sprint 4.1 — Solicitudes dentro de proyectos (puente PM ↔ administración)
--
-- 7 tipos: compra / facturación / anticipo proveedor / cambio alcance /
-- reembolso gasto / OT inter-co / genérica
--
-- Estados: solicitada → en_revision → aprobada → ejecutada → cerrada
-- (rechazada cierra el flujo desde cualquier estado)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_solicitud_proyecto') THEN
    CREATE TYPE tipo_solicitud_proyecto AS ENUM (
      'compra',
      'facturacion',
      'anticipo_proveedor',
      'cambio_alcance',
      'reembolso_gasto',
      'ot_inter_co',
      'generica'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_solicitud') THEN
    CREATE TYPE estado_solicitud AS ENUM (
      'solicitada',
      'en_revision',
      'aprobada',
      'rechazada',
      'ejecutada',
      'cerrada'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'urgencia_solicitud') THEN
    CREATE TYPE urgencia_solicitud AS ENUM (
      'baja', 'normal', 'alta', 'critica'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS proyecto_solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  numero TEXT,
  tipo tipo_solicitud_proyecto NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  monto_estimado NUMERIC(14, 2),
  urgencia urgencia_solicitud DEFAULT 'normal' NOT NULL,
  estado estado_solicitud DEFAULT 'solicitada' NOT NULL,
  solicitante_id UUID NOT NULL REFERENCES auth.users(id),
  asignado_a_id UUID REFERENCES auth.users(id),
  -- Campos contextuales por tipo (claves heterogéneas)
  -- compra: { proveedor_id, proveedor_nombre }
  -- facturacion: { hito, cliente_id }
  -- anticipo_proveedor: { proveedor_id, porcentaje }
  -- cambio_alcance: { razon, requiere_ceo }
  -- reembolso_gasto: { concepto, beneficiario_id }
  -- ot_inter_co: { empresa_destino_id, servicio_id }
  campos_tipo JSONB DEFAULT '{}'::jsonb,
  -- Vínculos a entidades creadas como resultado (4.3)
  -- { oc_id, cfdi_id, ot_id, gasto_id, ... }
  entidades_relacionadas JSONB DEFAULT '{}'::jsonb,
  razon_rechazo TEXT,
  resuelta_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_solicitudes_proyecto
  ON proyecto_solicitudes(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_estado
  ON proyecto_solicitudes(estado)
  WHERE estado IN ('solicitada', 'en_revision');
CREATE INDEX IF NOT EXISTS idx_solicitudes_asignado
  ON proyecto_solicitudes(asignado_a_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_solicitante
  ON proyecto_solicitudes(solicitante_id);

CREATE TABLE IF NOT EXISTS solicitud_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud_id UUID NOT NULL REFERENCES proyecto_solicitudes(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES auth.users(id),
  texto TEXT NOT NULL CHECK (length(texto) > 0),
  menciones UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comentarios_solicitud
  ON solicitud_comentarios(solicitud_id, created_at DESC);

-- Campo administrador del proyecto (asignación opcional)
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS administrador_id UUID REFERENCES auth.users(id);

-- Vínculo de adjuntos vía proyecto_documentos
ALTER TABLE proyecto_documentos
  ADD COLUMN IF NOT EXISTS solicitud_id UUID
    REFERENCES proyecto_solicitudes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proyecto_documentos_solicitud
  ON proyecto_documentos(solicitud_id) WHERE solicitud_id IS NOT NULL;

-- updated_at trigger
CREATE OR REPLACE FUNCTION proyecto_solicitudes_touch()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitudes_touch ON proyecto_solicitudes;
CREATE TRIGGER trg_solicitudes_touch
  BEFORE UPDATE ON proyecto_solicitudes
  FOR EACH ROW EXECUTE FUNCTION proyecto_solicitudes_touch();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE proyecto_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitud_comentarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ps_select ON proyecto_solicitudes;
CREATE POLICY ps_select ON proyecto_solicitudes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_solicitudes.proyecto_id
        AND (
          p.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR p.pm_id = auth.uid()
          OR p.vendedor_id = auth.uid()
          OR p.administrador_id = auth.uid()
        )
    )
    OR proyecto_solicitudes.solicitante_id = auth.uid()
    OR proyecto_solicitudes.asignado_a_id = auth.uid()
  );

DROP POLICY IF EXISTS ps_modify ON proyecto_solicitudes;
CREATE POLICY ps_modify ON proyecto_solicitudes
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_solicitudes.proyecto_id
        AND (
          p.pm_id = auth.uid()
          OR p.administrador_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = p.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
    OR proyecto_solicitudes.asignado_a_id = auth.uid()
    OR proyecto_solicitudes.solicitante_id = auth.uid()
  );

DROP POLICY IF EXISTS sc_select ON solicitud_comentarios;
CREATE POLICY sc_select ON solicitud_comentarios
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proyecto_solicitudes s
      WHERE s.id = solicitud_comentarios.solicitud_id
      -- la RLS de proyecto_solicitudes controla la visibilidad implícitamente
    )
  );

DROP POLICY IF EXISTS sc_insert ON solicitud_comentarios;
CREATE POLICY sc_insert ON solicitud_comentarios
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid());

DROP POLICY IF EXISTS sc_update ON solicitud_comentarios;
CREATE POLICY sc_update ON solicitud_comentarios
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid());

-- ============================================================================
-- Trigger numero secuencial por proyecto (SOL-0001, SOL-0002...)
-- ============================================================================

CREATE OR REPLACE FUNCTION asignar_numero_solicitud()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  siguiente INTEGER;
BEGIN
  SELECT COALESCE(
    MAX((REGEXP_MATCHES(numero, 'SOL-(\d+)'))[1]::INTEGER),
    0
  ) + 1
  INTO siguiente
  FROM proyecto_solicitudes
  WHERE proyecto_id = NEW.proyecto_id;
  NEW.numero := 'SOL-' || LPAD(siguiente::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_solicitud_numero ON proyecto_solicitudes;
CREATE TRIGGER trg_solicitud_numero
  BEFORE INSERT ON proyecto_solicitudes
  FOR EACH ROW WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION asignar_numero_solicitud();

-- ============================================================================
-- Vista enriquecida
-- ============================================================================

CREATE OR REPLACE VIEW v_proyecto_solicitudes_lista AS
SELECT
  s.id,
  s.proyecto_id,
  s.empresa_id,
  s.numero,
  s.tipo,
  s.titulo,
  s.descripcion,
  s.monto_estimado,
  s.urgencia,
  s.estado,
  s.solicitante_id,
  s.asignado_a_id,
  s.campos_tipo,
  s.entidades_relacionadas,
  s.razon_rechazo,
  s.resuelta_at,
  s.created_at,
  s.updated_at,
  p.codigo AS proyecto_codigo,
  p.nombre AS proyecto_nombre,
  p.pm_id,
  p.administrador_id,
  e.codigo AS empresa_codigo,
  (
    SELECT COUNT(*) FROM solicitud_comentarios
    WHERE solicitud_id = s.id
  )::INTEGER AS num_comentarios,
  (
    SELECT COUNT(*) FROM proyecto_documentos
    WHERE solicitud_id = s.id
  )::INTEGER AS num_adjuntos,
  (CURRENT_DATE - s.created_at::date) AS dias_abierta
FROM proyecto_solicitudes s
LEFT JOIN proyectos p ON p.id = s.proyecto_id
LEFT JOIN empresas e ON e.id = s.empresa_id;

COMMENT ON VIEW v_proyecto_solicitudes_lista IS
  'Solicitudes de proyecto enriquecidas con códigos + counts de comentarios/adjuntos.';
