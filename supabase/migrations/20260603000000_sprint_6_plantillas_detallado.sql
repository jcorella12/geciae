-- ============================================================================
-- Sprint 6 detallado — plantilla_etapas + plantilla_tareas + plantilla_documentos
-- ============================================================================
-- Para cada `plantillas_proyecto` definimos las etapas (orden), las tareas
-- por etapa (con sub-tareas e hitos), y los documentos requeridos por
-- plantilla. Cuando se crea un proyecto con una plantilla, un trigger
-- copia las etapas+tareas+documentos como expediente del proyecto.
-- ============================================================================

-- 1. Etapas por plantilla
CREATE TABLE IF NOT EXISTS plantilla_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_codigo plantilla_proyecto NOT NULL,
  numero INTEGER NOT NULL,  -- orden 1, 2, 3...
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_estimada_dias INTEGER,
  hito_facturacion BOOLEAN DEFAULT FALSE,  -- al completar, ¿se factura?
  porcentaje_facturacion NUMERIC(5, 2),  -- ej. 25.00 si es anticipo
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (plantilla_codigo, numero)
);

CREATE INDEX IF NOT EXISTS idx_plantilla_etapas_codigo
  ON plantilla_etapas(plantilla_codigo, numero);

COMMENT ON TABLE plantilla_etapas IS
  'Etapas ordenadas para cada plantilla de proyecto. Hito_facturacion + pct para generar factura al completar.';

-- 2. Tareas por etapa (sub-tareas)
CREATE TABLE IF NOT EXISTS plantilla_tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id UUID NOT NULL REFERENCES plantilla_etapas(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,  -- orden dentro de la etapa
  titulo TEXT NOT NULL,
  descripcion TEXT,
  rol_responsable TEXT,  -- 'pm', 'vendedor', 'ingenieria', 'verificador', etc.
  duracion_estimada_dias NUMERIC(4, 1),
  obligatoria BOOLEAN DEFAULT TRUE NOT NULL,
  bloquea_avance BOOLEAN DEFAULT FALSE NOT NULL,  -- impide pasar a siguiente etapa
  observaciones TEXT,
  UNIQUE (etapa_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_plantilla_tareas_etapa
  ON plantilla_tareas(etapa_id);

-- 3. Documentos requeridos por plantilla (a nivel proyecto, no etapa)
CREATE TABLE IF NOT EXISTS plantilla_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_codigo plantilla_proyecto NOT NULL,
  codigo_documento TEXT NOT NULL,  -- ej. 'CONTRATO', 'AVAL_CFE', 'PLANO_AS_BUILT'
  nombre TEXT NOT NULL,
  descripcion TEXT,
  obligatorio BOOLEAN DEFAULT TRUE NOT NULL,
  requerido_para_estado TEXT,  -- ej. 'contrato_firmado', 'en_ejecucion', 'entregado'
  rol_responsable TEXT,
  observaciones TEXT,
  UNIQUE (plantilla_codigo, codigo_documento)
);

CREATE INDEX IF NOT EXISTS idx_plantilla_docs_codigo
  ON plantilla_documentos(plantilla_codigo);

COMMENT ON TABLE plantilla_documentos IS
  'Catálogo de documentos requeridos por plantilla. requerido_para_estado bloquea cambio de estado si no existe.';

-- 4. SGC: codificación de documentos del sistema de gestión de calidad
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_doc_sgc') THEN
    CREATE TYPE tipo_doc_sgc AS ENUM (
      'FP',  -- Formato de Proceso
      'FO',  -- Formato Operativo
      'MA',  -- Manual
      'PO'   -- Procedimiento Operativo
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS sgc_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_doc_sgc NOT NULL,
  codigo TEXT NOT NULL,  -- FP-001, FO-014, MA-002, PO-007
  nombre TEXT NOT NULL,
  descripcion TEXT,
  area TEXT,  -- 'comercial', 'ingenieria', 'finanzas', etc.
  vigente BOOLEAN DEFAULT TRUE NOT NULL,
  fecha_aprobacion DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tipo, codigo)
);

CREATE INDEX IF NOT EXISTS idx_sgc_tipo_codigo ON sgc_documentos(tipo, codigo);

CREATE TABLE IF NOT EXISTS sgc_documento_revisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES sgc_documentos(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  fecha DATE NOT NULL,
  cambios_descripcion TEXT,
  url_pdf TEXT,
  responsable_id UUID REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (documento_id, revision)
);

CREATE INDEX IF NOT EXISTS idx_sgc_rev_doc
  ON sgc_documento_revisiones(documento_id, revision DESC);

-- Vincular pasos PSE con documentos SGC (relación M:N)
CREATE TABLE IF NOT EXISTS plantilla_etapas_sgc (
  etapa_id UUID NOT NULL REFERENCES plantilla_etapas(id) ON DELETE CASCADE,
  sgc_documento_id UUID NOT NULL REFERENCES sgc_documentos(id) ON DELETE RESTRICT,
  PRIMARY KEY (etapa_id, sgc_documento_id)
);

-- 5. Expediente del proyecto: copia de docs requeridos + estado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_doc_expediente') THEN
    CREATE TYPE estado_doc_expediente AS ENUM (
      'pendiente',
      'en_revision',
      'aprobado',
      'no_aplica'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS proyecto_expediente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  codigo_documento TEXT NOT NULL,  -- copiado de plantilla_documentos
  nombre TEXT NOT NULL,
  obligatorio BOOLEAN DEFAULT TRUE NOT NULL,
  requerido_para_estado TEXT,
  estado estado_doc_expediente NOT NULL DEFAULT 'pendiente',
  url_archivo TEXT,
  fecha_recibido DATE,
  fecha_aprobacion DATE,
  responsable_id UUID REFERENCES auth.users(id),
  observaciones TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proyecto_id, codigo_documento)
);

CREATE INDEX IF NOT EXISTS idx_pe_proyecto ON proyecto_expediente(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_pe_estado ON proyecto_expediente(estado);

CREATE TRIGGER set_updated_at_pe
  BEFORE UPDATE ON proyecto_expediente
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 6. Trigger: al crear proyecto con plantilla, copiar etapas → proyecto_tareas
--    (si la tabla existe) y documentos → proyecto_expediente
CREATE OR REPLACE FUNCTION trg_proyecto_aplicar_plantilla()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_etapa RECORD;
  v_tarea RECORD;
  v_doc RECORD;
  v_proyecto_tareas_existe BOOLEAN;
BEGIN
  IF NEW.plantilla_tipo IS NULL THEN RETURN NEW; END IF;

  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'proyecto_tareas')
    INTO v_proyecto_tareas_existe;

  -- Copiar tareas (etapas + sub-tareas) → proyecto_tareas si la tabla existe
  IF v_proyecto_tareas_existe THEN
    FOR v_etapa IN
      SELECT * FROM plantilla_etapas WHERE plantilla_codigo = NEW.plantilla_tipo ORDER BY numero
    LOOP
      -- Tarea-resumen de la etapa
      EXECUTE format(
        'INSERT INTO proyecto_tareas (proyecto_id, titulo, descripcion, es_hito, estado, orden) VALUES ($1, $2, $3, $4, ''pendiente'', $5)'
      ) USING NEW.id,
        format('Etapa %s: %s', v_etapa.numero, v_etapa.nombre),
        v_etapa.descripcion,
        v_etapa.hito_facturacion,
        v_etapa.numero * 100;

      FOR v_tarea IN
        SELECT * FROM plantilla_tareas WHERE etapa_id = v_etapa.id ORDER BY numero
      LOOP
        EXECUTE format(
          'INSERT INTO proyecto_tareas (proyecto_id, titulo, descripcion, estado, orden) VALUES ($1, $2, $3, ''pendiente'', $4)'
        ) USING NEW.id,
          v_tarea.titulo,
          v_tarea.descripcion,
          v_etapa.numero * 100 + v_tarea.numero;
      END LOOP;
    END LOOP;
  END IF;

  -- Copiar documentos requeridos → proyecto_expediente
  FOR v_doc IN
    SELECT * FROM plantilla_documentos WHERE plantilla_codigo = NEW.plantilla_tipo
  LOOP
    INSERT INTO proyecto_expediente
      (proyecto_id, codigo_documento, nombre, obligatorio, requerido_para_estado, capturado_por)
    VALUES
      (NEW.id, v_doc.codigo_documento, v_doc.nombre, v_doc.obligatorio, v_doc.requerido_para_estado, NEW.capturado_por)
    ON CONFLICT (proyecto_id, codigo_documento) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_proyecto_aplicar_plantilla ON proyectos;
CREATE TRIGGER tr_proyecto_aplicar_plantilla
  AFTER INSERT ON proyectos
  FOR EACH ROW
  WHEN (NEW.plantilla_tipo IS NOT NULL)
  EXECUTE FUNCTION trg_proyecto_aplicar_plantilla();

-- 7. Bloqueo: no permitir cambiar a un estado si faltan docs obligatorios
CREATE OR REPLACE FUNCTION trg_proyecto_validar_expediente()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_faltan INTEGER;
BEGIN
  IF OLD.estado = NEW.estado THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_faltan
  FROM proyecto_expediente
  WHERE proyecto_id = NEW.id
    AND obligatorio = TRUE
    AND estado <> 'aprobado'
    AND estado <> 'no_aplica'
    AND requerido_para_estado = NEW.estado::TEXT;

  IF v_faltan > 0 THEN
    RAISE EXCEPTION
      'No se puede cambiar a estado "%": faltan % documentos obligatorios del expediente. Revisa /proyectos/%/expediente.',
      NEW.estado, v_faltan, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_proyecto_validar_expediente ON proyectos;
CREATE TRIGGER tr_proyecto_validar_expediente
  BEFORE UPDATE OF estado ON proyectos
  FOR EACH ROW EXECUTE FUNCTION trg_proyecto_validar_expediente();

-- 8. Heredar levantamiento al ganar oportunidad
-- Cuando una oportunidad pasa a estado='ganado' y tiene levantamientos
-- vinculados, marcamos esos levantamientos como convertidos al proyecto
-- creado (si existe vínculo).
CREATE OR REPLACE FUNCTION trg_oportunidad_ganada_hereda_levantamientos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_proyecto_id UUID;
BEGIN
  IF NEW.estado <> 'ganado' OR OLD.estado = 'ganado' THEN RETURN NEW; END IF;

  -- Buscar proyecto creado de esta oportunidad por código heredado o
  -- vinculo directo. Heurística simple: el proyecto más reciente con
  -- nombre que contenga el de la oportunidad o creado en los últimos 30 días
  -- por el mismo vendedor con cliente coincidente.
  SELECT p.id INTO v_proyecto_id
  FROM proyectos p
  WHERE p.cliente_id = NEW.cliente_id
    AND p.empresa_id = NEW.empresa_id
    AND p.activo = TRUE
    AND p.created_at >= NEW.fecha_cierre_real - INTERVAL '30 days'
  ORDER BY p.created_at DESC
  LIMIT 1;

  -- Marcar levantamientos vinculados como convertidos
  IF v_proyecto_id IS NOT NULL THEN
    UPDATE levantamientos
    SET estado = 'convertido_a_venta',
        proyecto_destino_id = v_proyecto_id,
        reasignado_at = NOW()
    WHERE oportunidad_id = NEW.id
      AND estado IN ('completado', 'en_curso');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_oportunidad_hereda_lev ON oportunidades;
CREATE TRIGGER tr_oportunidad_hereda_lev
  AFTER UPDATE OF estado ON oportunidades
  FOR EACH ROW EXECUTE FUNCTION trg_oportunidad_ganada_hereda_levantamientos();

-- 9. RLS
ALTER TABLE plantilla_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantilla_etapas_sgc ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_documento_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_expediente ENABLE ROW LEVEL SECURITY;

-- Plantillas: lectura pública autenticada, modificación CEO
DROP POLICY IF EXISTS pe_select ON plantilla_etapas;
CREATE POLICY pe_select ON plantilla_etapas FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS pe_modify ON plantilla_etapas;
CREATE POLICY pe_modify ON plantilla_etapas FOR ALL TO authenticated USING (usuario_es_ceo());

DROP POLICY IF EXISTS pt_select ON plantilla_tareas;
CREATE POLICY pt_select ON plantilla_tareas FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS pt_modify ON plantilla_tareas;
CREATE POLICY pt_modify ON plantilla_tareas FOR ALL TO authenticated USING (usuario_es_ceo());

DROP POLICY IF EXISTS pd_select ON plantilla_documentos;
CREATE POLICY pd_select ON plantilla_documentos FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS pd_modify ON plantilla_documentos;
CREATE POLICY pd_modify ON plantilla_documentos FOR ALL TO authenticated USING (usuario_es_ceo());

DROP POLICY IF EXISTS pesg_all ON plantilla_etapas_sgc;
CREATE POLICY pesg_all ON plantilla_etapas_sgc FOR ALL TO authenticated USING (usuario_es_ceo());

DROP POLICY IF EXISTS sgc_select ON sgc_documentos;
CREATE POLICY sgc_select ON sgc_documentos FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS sgc_modify ON sgc_documentos;
CREATE POLICY sgc_modify ON sgc_documentos FOR ALL TO authenticated
  USING (usuario_es_ceo() OR usuario_tiene_atributo('coordinador_calidad'));

DROP POLICY IF EXISTS sgc_rev_select ON sgc_documento_revisiones;
CREATE POLICY sgc_rev_select ON sgc_documento_revisiones FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS sgc_rev_modify ON sgc_documento_revisiones;
CREATE POLICY sgc_rev_modify ON sgc_documento_revisiones FOR ALL TO authenticated
  USING (usuario_es_ceo() OR usuario_tiene_atributo('coordinador_calidad'));

-- Expediente: lectura por empresa del proyecto, modificación director/operativo
DROP POLICY IF EXISTS pex_select ON proyecto_expediente;
CREATE POLICY pex_select ON proyecto_expediente FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proyectos p
    WHERE p.id = proyecto_expediente.proyecto_id
      AND (p.empresa_id IN (SELECT empresas_del_usuario()) OR usuario_es_ceo())
  ));

DROP POLICY IF EXISTS pex_modify ON proyecto_expediente;
CREATE POLICY pex_modify ON proyecto_expediente FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proyectos p
    WHERE p.id = proyecto_expediente.proyecto_id
      AND (
        usuario_es_ceo()
        OR usuario_tiene_rol_en_empresa(p.empresa_id, ARRAY['director', 'operativo'])
      )
  ));
