-- ============================================================================
-- Sprint 7 — Parte 2: tabla plantillas_proyecto + seed PSE/Limson
--
-- Esta migración corre DESPUÉS de 20260601000000 (que ya añadió los valores
-- de enum), por lo que los INSERTs pueden usar 'limson_*' sin error.
-- ============================================================================

-- 1. Tabla seed de plantillas_proyecto (metadata mínima)
CREATE TABLE IF NOT EXISTS plantillas_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo plantilla_proyecto NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  empresa_recomendada_id UUID REFERENCES empresas(id),
  duracion_estimada_dias INTEGER,
  requiere_tramites_cfe BOOLEAN DEFAULT FALSE,
  requiere_levantamiento_tecnico BOOLEAN DEFAULT FALSE,
  notas TEXT,
  activa BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plantillas_empresa
  ON plantillas_proyecto(empresa_recomendada_id) WHERE activa = TRUE;

COMMENT ON TABLE plantillas_proyecto IS
  'Catálogo de plantillas de proyecto. Sprint 6.1/7.1 detallado agregará etapas, sub-tareas, hitos y documentos.';

-- 2. Seed
INSERT INTO plantillas_proyecto (codigo, nombre, descripcion, duracion_estimada_dias, requiere_tramites_cfe, requiere_levantamiento_tecnico, notas)
VALUES
  ('solar_residencial', 'PSE Solar Residencial',
   'Casa-habitación. Trámites CFE NetMet. Cliente persona física típicamente.',
   90, TRUE, TRUE, 'Levantamiento previo + diseño + instalación + trámites CFE.'),
  ('solar_comercial', 'PSE Solar Comercial',
   'Negocios PyME, oficinas. Tarifas comerciales.',
   120, TRUE, TRUE, 'Análisis de demanda + diseño + trámites CFE comercial.'),
  ('solar_industrial', 'PSE Solar Industrial',
   'Industria mediana/grande. HM/HS, posible interconexión MT.',
   180, TRUE, TRUE, 'Estudios profundos + ingeniería + interconexión MT.'),
  ('mantenimiento_solar', 'Mantenimiento Solar',
   'Contractual o puntual. No requiere trámites CFE.',
   1, FALSE, FALSE, 'Visitas programadas o respuesta a falla.'),
  ('limpieza_solar', 'Limpieza de Paneles',
   'Servicio puntual o programado.',
   1, FALSE, FALSE, '1 día típicamente.'),
  ('limson_mantenimiento_contractual', 'Limson Mantenimiento Contractual',
   'Visitas calendarizadas mensuales/trimestrales por 12 meses.',
   365, FALSE, FALSE, 'Onboarding + 4 visitas + cierre anual. Hito facturación: anticipo 25% + mensualidades.'),
  ('limson_servicio_puntual', 'Limson Servicio Puntual',
   'Diagnóstico + reparación + entrega. 1-3 días típicamente.',
   3, FALSE, FALSE, 'Hito facturación: 100% al completar.'),
  ('limson_instalacion_externa', 'Limson Instalación Externa',
   'Instalación solar para clientes que NO son de PSE. Cliente ya tiene contrato CFE.',
   60, FALSE, TRUE, 'Sin trámites CFE (cliente ya los tiene). Verificación final eléctrica.'),
  ('otro', 'Otro', 'Plantilla libre.', NULL, FALSE, FALSE, NULL)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  duracion_estimada_dias = EXCLUDED.duracion_estimada_dias,
  requiere_tramites_cfe = EXCLUDED.requiere_tramites_cfe,
  requiere_levantamiento_tecnico = EXCLUDED.requiere_levantamiento_tecnico,
  notas = EXCLUDED.notas;

-- 3. Vincular empresa_recomendada_id (PSE vs Limson)
UPDATE plantillas_proyecto
SET empresa_recomendada_id = (SELECT id FROM empresas WHERE codigo = 'PSE' LIMIT 1)
WHERE codigo IN ('solar_residencial', 'solar_comercial', 'solar_industrial')
  AND empresa_recomendada_id IS NULL;

UPDATE plantillas_proyecto
SET empresa_recomendada_id = (SELECT id FROM empresas WHERE codigo = 'LIMSON' LIMIT 1)
WHERE codigo IN ('limson_mantenimiento_contractual', 'limson_servicio_puntual', 'limson_instalacion_externa')
  AND empresa_recomendada_id IS NULL;

-- 4. RLS
ALTER TABLE plantillas_proyecto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plantillas_select ON plantillas_proyecto;
CREATE POLICY plantillas_select ON plantillas_proyecto
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS plantillas_modify ON plantillas_proyecto;
CREATE POLICY plantillas_modify ON plantillas_proyecto
  FOR ALL TO authenticated USING (usuario_es_ceo());

-- 5. Vista consolidada de proyectos por marca
CREATE OR REPLACE VIEW v_proyectos_por_marca AS
SELECT
  p.marca_visible_id,
  emp_marca.codigo AS marca_codigo,
  emp_marca.nombre_comercial AS marca_nombre,
  COUNT(*)::INTEGER AS total_proyectos,
  COUNT(*) FILTER (WHERE p.estado IN ('en_ejecucion', 'planeacion', 'en_cierre'))::INTEGER AS activos,
  COUNT(*) FILTER (WHERE p.estado = 'entregado')::INTEGER AS entregados,
  COALESCE(SUM(p.monto_contratado), 0)::NUMERIC AS total_contratado,
  COALESCE(SUM(p.monto_facturado), 0)::NUMERIC AS total_facturado,
  COUNT(*) FILTER (WHERE p.empresa_id <> p.marca_visible_id)::INTEGER AS cross_marca
FROM proyectos p
JOIN empresas emp_marca ON emp_marca.id = p.marca_visible_id
WHERE p.activo = TRUE
GROUP BY p.marca_visible_id, emp_marca.codigo, emp_marca.nombre_comercial;

COMMENT ON VIEW v_proyectos_por_marca IS
  'Reporte agrupado por marca visible. cross_marca = cuántos proyectos opera otra empresa bajo esta marca.';
