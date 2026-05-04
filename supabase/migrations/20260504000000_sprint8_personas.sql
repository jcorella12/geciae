-- Sprint 8 — Personas: viáticos, documentos, REPSE, RLS

-- 1. Vigencia REPSE para empleados de categoría 'repse'
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS vigencia_repse_hasta DATE,
  ADD COLUMN IF NOT EXISTS folio_repse TEXT;

-- 2. Documentos por empleado (CSF, INE, contrato firmado, alta IMSS, etc.)
CREATE TABLE IF NOT EXISTS empleados_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  -- Tipos: ine, curp, csf, acta_nacimiento, comprobante_domicilio,
  --        rfc_homoclave, nss, contrato, alta_imss, examen_medico,
  --        capacitacion_repse, otro
  nombre_archivo TEXT NOT NULL,
  url_storage TEXT NOT NULL,
  fecha_emision DATE,
  fecha_vencimiento DATE,
  observaciones TEXT,
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_empdocs_empleado ON empleados_documentos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_empdocs_vencimiento ON empleados_documentos(fecha_vencimiento)
  WHERE fecha_vencimiento IS NOT NULL;

-- 3. Tabla de viáticos / gastos de empleado
CREATE TABLE IF NOT EXISTS viaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  proyecto_id UUID REFERENCES proyectos(id),
  fecha_gasto DATE NOT NULL,
  concepto TEXT NOT NULL,
  -- Categoría: hospedaje, alimentos, transporte, combustible, peajes,
  --            estacionamiento, papeleria, telefono, otros
  categoria TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  url_ticket TEXT, -- foto/PDF del ticket
  url_xml TEXT,    -- XML si tiene CFDI
  cfdi_id UUID REFERENCES cfdi(id),
  observaciones TEXT,
  estado TEXT DEFAULT 'pendiente',
  -- pendiente, aprobado, rechazado, reembolsado
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  fecha_reembolso DATE,
  motivo_rechazo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_viaticos_empleado ON viaticos(empleado_id);
CREATE INDEX IF NOT EXISTS idx_viaticos_estado ON viaticos(estado);
CREATE INDEX IF NOT EXISTS idx_viaticos_proyecto ON viaticos(proyecto_id) WHERE proyecto_id IS NOT NULL;

-- 4. Storage bucket para documentos de empleado
INSERT INTO storage.buckets (id, name, public)
VALUES ('empleados', 'empleados', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('viaticos', 'viaticos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS para tablas de personas
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_desempeno ENABLE ROW LEVEL SECURITY;
ALTER TABLE finiquitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE viaticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos_asignados ENABLE ROW LEVEL SECURITY;

-- Empleados: visibles para usuarios de la misma empresa
DROP POLICY IF EXISTS empleados_select ON empleados;
CREATE POLICY empleados_select ON empleados
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_id = auth.uid() -- el propio empleado
  );

DROP POLICY IF EXISTS empleados_modify ON empleados;
CREATE POLICY empleados_modify ON empleados
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = empleados.empresa_id
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  )
  WITH CHECK (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = empleados.empresa_id
        AND rol = 'director'::rol_usuario
        AND activo = TRUE
    )
  );

-- Contratos: heredan visibilidad del empleado
DROP POLICY IF EXISTS contratos_select ON contratos_laborales;
CREATE POLICY contratos_select ON contratos_laborales
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = contratos_laborales.empleado_id
        AND (
          e.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR e.usuario_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS contratos_modify ON contratos_laborales;
CREATE POLICY contratos_modify ON contratos_laborales
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = contratos_laborales.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- Vacaciones: el empleado ve las suyas, director ve las de su empresa
DROP POLICY IF EXISTS vacaciones_select ON vacaciones_solicitudes;
CREATE POLICY vacaciones_select ON vacaciones_solicitudes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = vacaciones_solicitudes.empleado_id
        AND (
          e.usuario_id = auth.uid()
          OR usuario_es_ceo()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas ue
            WHERE ue.usuario_id = auth.uid()
              AND ue.empresa_id = e.empresa_id
              AND ue.rol IN ('director'::rol_usuario, 'ceo'::rol_usuario)
              AND ue.activo = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS vacaciones_insert ON vacaciones_solicitudes;
CREATE POLICY vacaciones_insert ON vacaciones_solicitudes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = vacaciones_solicitudes.empleado_id
        AND (e.usuario_id = auth.uid() OR usuario_es_ceo())
    )
  );

DROP POLICY IF EXISTS vacaciones_update ON vacaciones_solicitudes;
CREATE POLICY vacaciones_update ON vacaciones_solicitudes
  FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = vacaciones_solicitudes.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- Evaluaciones, finiquitos: solo CEO + director
DROP POLICY IF EXISTS evaluaciones_all ON evaluaciones_desempeno;
CREATE POLICY evaluaciones_all ON evaluaciones_desempeno
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = evaluaciones_desempeno.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS finiquitos_all ON finiquitos;
CREATE POLICY finiquitos_all ON finiquitos
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = finiquitos.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- Documentos del empleado: ve director + propio empleado
DROP POLICY IF EXISTS empdocs_select ON empleados_documentos;
CREATE POLICY empdocs_select ON empleados_documentos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = empleados_documentos.empleado_id
        AND (
          e.usuario_id = auth.uid()
          OR usuario_es_ceo()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas ue
            WHERE ue.usuario_id = auth.uid()
              AND ue.empresa_id = e.empresa_id
              AND ue.rol = 'director'::rol_usuario
              AND ue.activo = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS empdocs_modify ON empleados_documentos;
CREATE POLICY empdocs_modify ON empleados_documentos
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = empleados_documentos.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- Viáticos: el propio empleado captura, director aprueba
DROP POLICY IF EXISTS viaticos_select ON viaticos;
CREATE POLICY viaticos_select ON viaticos
  FOR SELECT TO authenticated
  USING (
    capturado_por = auth.uid()
    OR usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = viaticos.empleado_id AND e.usuario_id = auth.uid()
    )
    OR (empresa_id IN (SELECT empresas_del_usuario()) AND EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.empresa_id = viaticos.empresa_id
        AND ue.rol IN ('director'::rol_usuario, 'ceo'::rol_usuario)
        AND ue.activo = TRUE
    ))
  );

DROP POLICY IF EXISTS viaticos_insert ON viaticos;
CREATE POLICY viaticos_insert ON viaticos
  FOR INSERT TO authenticated
  WITH CHECK (
    capturado_por = auth.uid()
    AND empresa_id IN (SELECT empresas_del_usuario())
  );

DROP POLICY IF EXISTS viaticos_update ON viaticos;
CREATE POLICY viaticos_update ON viaticos
  FOR UPDATE TO authenticated
  USING (
    usuario_es_ceo()
    OR (capturado_por = auth.uid() AND estado = 'pendiente')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid()
        AND ue.empresa_id = viaticos.empresa_id
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- Capacitaciones de empleados
DROP POLICY IF EXISTS empcaps_select ON empleados_capacitaciones;
CREATE POLICY empcaps_select ON empleados_capacitaciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = empleados_capacitaciones.empleado_id
        AND (
          e.usuario_id = auth.uid()
          OR usuario_es_ceo()
          OR e.empresa_id IN (SELECT empresas_del_usuario())
        )
    )
  );

DROP POLICY IF EXISTS empcaps_modify ON empleados_capacitaciones;
CREATE POLICY empcaps_modify ON empleados_capacitaciones
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = empleados_capacitaciones.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- Activos asignados
DROP POLICY IF EXISTS activos_select ON activos_asignados;
CREATE POLICY activos_select ON activos_asignados
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empleados e
      WHERE e.id = activos_asignados.empleado_id
        AND (
          e.usuario_id = auth.uid()
          OR usuario_es_ceo()
          OR e.empresa_id IN (SELECT empresas_del_usuario())
        )
    )
  );

DROP POLICY IF EXISTS activos_modify ON activos_asignados;
CREATE POLICY activos_modify ON activos_asignados
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM empleados e
      JOIN usuarios_empresas ue ON ue.empresa_id = e.empresa_id
      WHERE e.id = activos_asignados.empleado_id
        AND ue.usuario_id = auth.uid()
        AND ue.rol = 'director'::rol_usuario
        AND ue.activo = TRUE
    )
  );

-- 6. Storage policies para empleados y viáticos
DROP POLICY IF EXISTS empleados_storage_select ON storage.objects;
CREATE POLICY empleados_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('empleados', 'viaticos'));

DROP POLICY IF EXISTS empleados_storage_insert ON storage.objects;
CREATE POLICY empleados_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('empleados', 'viaticos'));

DROP POLICY IF EXISTS empleados_storage_delete ON storage.objects;
CREATE POLICY empleados_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('empleados', 'viaticos')
    AND usuario_es_ceo()
  );

-- 7. Vista helper: saldo de vacaciones por empleado
-- Tabla LFT 2023+ (años de antigüedad → días):
-- 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6-10: 22, 11-15: 24, 16-20: 26, 21-25: 28, 26-30: 30, 31+: 32
CREATE OR REPLACE FUNCTION dias_vacaciones_lft(
  p_fecha_ingreso DATE,
  p_fecha_corte DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  anios INTEGER;
BEGIN
  anios := EXTRACT(YEAR FROM AGE(p_fecha_corte, p_fecha_ingreso))::INTEGER;
  IF anios < 1 THEN
    -- Proporcional al primer año (12 días anuales)
    RETURN GREATEST(
      0,
      ROUND(
        12 * (p_fecha_corte - p_fecha_ingreso)::NUMERIC / 365
      )::INTEGER
    );
  END IF;
  RETURN CASE
    WHEN anios = 1 THEN 12
    WHEN anios = 2 THEN 14
    WHEN anios = 3 THEN 16
    WHEN anios = 4 THEN 18
    WHEN anios = 5 THEN 20
    WHEN anios BETWEEN 6 AND 10 THEN 22
    WHEN anios BETWEEN 11 AND 15 THEN 24
    WHEN anios BETWEEN 16 AND 20 THEN 26
    WHEN anios BETWEEN 21 AND 25 THEN 28
    WHEN anios BETWEEN 26 AND 30 THEN 30
    ELSE 32
  END;
END;
$$;

CREATE OR REPLACE VIEW v_saldo_vacaciones AS
SELECT
  e.id AS empleado_id,
  e.empresa_id,
  e.nombre_completo,
  e.fecha_ingreso,
  dias_vacaciones_lft(e.fecha_ingreso) AS dias_anuales_lft,
  COALESCE(
    (
      SELECT SUM(dias)
      FROM vacaciones_solicitudes vs
      WHERE vs.empleado_id = e.id
        AND vs.tipo = 'vacaciones'
        AND vs.estado = 'aprobada'
        AND vs.fecha_inicio >= DATE_TRUNC(
          'year', AGE(CURRENT_DATE, e.fecha_ingreso)::INTERVAL + e.fecha_ingreso
        )
    ),
    0
  ) AS dias_tomados_periodo,
  GREATEST(
    0,
    dias_vacaciones_lft(e.fecha_ingreso) - COALESCE(
      (
        SELECT SUM(dias)
        FROM vacaciones_solicitudes vs
        WHERE vs.empleado_id = e.id
          AND vs.tipo = 'vacaciones'
          AND vs.estado = 'aprobada'
          AND vs.fecha_inicio >= DATE_TRUNC(
            'year',
            AGE(CURRENT_DATE, e.fecha_ingreso)::INTERVAL + e.fecha_ingreso
          )
      ),
      0
    )
  ) AS dias_disponibles
FROM empleados e
WHERE e.activo = TRUE;

-- 8. Vista de empleados REPSE con vencimiento próximo (90 días)
CREATE OR REPLACE VIEW v_repse_alertas AS
SELECT
  id,
  empresa_id,
  nombre_completo,
  numero_empleado,
  vigencia_repse_hasta,
  folio_repse,
  CASE
    WHEN vigencia_repse_hasta IS NULL THEN 'sin_constancia'
    WHEN vigencia_repse_hasta < CURRENT_DATE THEN 'vencida'
    WHEN vigencia_repse_hasta < CURRENT_DATE + INTERVAL '30 days' THEN 'urgente'
    WHEN vigencia_repse_hasta < CURRENT_DATE + INTERVAL '90 days' THEN 'proxima'
    ELSE 'vigente'
  END AS estado_repse,
  (vigencia_repse_hasta - CURRENT_DATE) AS dias_para_vencer
FROM empleados
WHERE activo = TRUE AND categoria = 'repse';
