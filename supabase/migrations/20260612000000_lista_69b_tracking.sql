-- ============================================================================
-- Tracking de la lista 69-B SAT y alerta automática cada 6 meses.
--
-- El SAT publica/actualiza la lista 69-B mensualmente, pero no es necesario
-- importarla cada mes. Política GECIAE: refrescar cada 6 meses como mínimo.
--
-- Esta migración:
--   1. Crea tabla lista_69b_meta para guardar fecha de última importación
--      (la importación real la hace scripts/flagear_lista_69b.py)
--   2. Crea función que revisa antigüedad y, si pasaron >180 días sin
--      actualizar, crea una notificación para CEO/aprobador financiero
--   3. Programa cron diario que ejecuta esa revisión
-- ============================================================================

CREATE TABLE IF NOT EXISTS lista_69b_meta (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton
  ultima_actualizacion DATE NOT NULL,
  total_rfcs INTEGER NOT NULL,
  total_definitivos INTEGER,
  total_presuntos INTEGER,
  total_desvirtuados INTEGER,
  total_sentencia_favorable INTEGER,
  fuente_csv TEXT, -- ruta o URL del archivo importado
  importado_por UUID REFERENCES auth.users(id),
  matches_clientes INTEGER DEFAULT 0,
  matches_proveedores INTEGER DEFAULT 0,
  observaciones TEXT,
  ultima_alerta_enviada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lista_69b_meta IS
  'Singleton (id=1) que guarda metadata de la última importación de la lista 69-B SAT. Se actualiza desde scripts/flagear_lista_69b.py.';

ALTER TABLE lista_69b_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lista_69b_meta_select ON lista_69b_meta;
CREATE POLICY lista_69b_meta_select ON lista_69b_meta
  FOR SELECT TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('aprobador_financiero')
    OR usuario_tiene_atributo('contralor')
  );

DROP POLICY IF EXISTS lista_69b_meta_modify ON lista_69b_meta;
CREATE POLICY lista_69b_meta_modify ON lista_69b_meta
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo() OR usuario_tiene_atributo('tesorero_corporativo')
  );

-- ============================================================================
-- Helper: días desde la última actualización (positivo si está vencida)
-- ============================================================================
CREATE OR REPLACE FUNCTION lista_69b_dias_desde_actualizacion()
RETURNS INTEGER
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (CURRENT_DATE - ultima_actualizacion)::INTEGER,
    9999
  )
  FROM lista_69b_meta
  WHERE id = 1
  LIMIT 1;
$$;

COMMENT ON FUNCTION lista_69b_dias_desde_actualizacion IS
  'Días transcurridos desde la última importación. 9999 si nunca se ha cargado.';

-- ============================================================================
-- Función: revisar y, si pasaron >180 días desde la última actualización,
-- crear notificación para el CEO y rol financiero. Idempotente: solo crea
-- una alerta cada 30 días para no spamear.
-- ============================================================================
CREATE OR REPLACE FUNCTION revisar_alerta_69b()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  meta RECORD;
  dias INTEGER;
  destinatarios INTEGER := 0;
  destino RECORD;
BEGIN
  SELECT * INTO meta FROM lista_69b_meta WHERE id = 1 LIMIT 1;

  -- Si nunca se ha cargado, no se alerta (es trabajo de configuración inicial)
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  dias := CURRENT_DATE - meta.ultima_actualizacion;

  -- < 180 días: todo bien
  IF dias < 180 THEN
    RETURN 0;
  END IF;

  -- Ya alertamos en los últimos 30 días: no spamear
  IF meta.ultima_alerta_enviada_at IS NOT NULL
     AND meta.ultima_alerta_enviada_at > NOW() - INTERVAL '30 days' THEN
    RETURN 0;
  END IF;

  -- Encontrar destinatarios: CEO + tesorero_corporativo + aprobador_financiero
  FOR destino IN
    SELECT DISTINCT ue.usuario_id, ue.empresa_id
    FROM usuarios_empresas ue
    WHERE ue.activo = TRUE
      AND (
        ue.rol = 'ceo'::rol_usuario
        OR 'tesorero_corporativo' = ANY(ue.atributos)
        OR 'aprobador_financiero' = ANY(ue.atributos)
      )
  LOOP
    INSERT INTO notificaciones (
      usuario_id, empresa_id, tipo, severidad, titulo, mensaje, url,
      entidad_tipo, entidad_id
    )
    VALUES (
      destino.usuario_id,
      destino.empresa_id,
      'lista_69b_vencida',
      CASE WHEN dias > 365 THEN 'critical' ELSE 'warning' END,
      'Lista 69-B SAT debe actualizarse',
      'Han pasado ' || dias || ' días desde la última importación de la ' ||
        'lista 69-B (política: cada 6 meses). Descarga el listado actualizado ' ||
        'desde sat.gob.mx y ejecuta scripts/flagear_lista_69b.py.',
      '/finanzas/configuracion/lista-69b',
      'lista_69b_meta',
      NULL
    );
    destinatarios := destinatarios + 1;
  END LOOP;

  -- Marcar fecha de última alerta para anti-spam
  UPDATE lista_69b_meta
  SET ultima_alerta_enviada_at = NOW(), updated_at = NOW()
  WHERE id = 1;

  RETURN destinatarios;
END;
$$;

COMMENT ON FUNCTION revisar_alerta_69b IS
  'Crea notificación a CEO/financieros si pasaron >180 días sin actualizar la lista 69-B. Anti-spam: máximo 1 alerta cada 30 días.';

-- ============================================================================
-- Cron diario: revisar a las 09:00 MX (15:00 UTC)
-- ============================================================================
DO $$
DECLARE
  jobid BIGINT;
BEGIN
  SELECT cron.jobid INTO jobid
  FROM cron.job
  WHERE cron.jobname = 'revisar_alerta_69b_diario';
  IF jobid IS NOT NULL THEN
    PERFORM cron.unschedule(jobid);
  END IF;
EXCEPTION WHEN undefined_table OR undefined_column OR insufficient_privilege THEN
  NULL;
END $$;

SELECT cron.schedule(
  'revisar_alerta_69b_diario',
  '0 15 * * *',
  $$ SELECT revisar_alerta_69b(); $$
);

-- ============================================================================
-- Seed: cargar el snapshot que ya importamos hoy (2026-05-05) si no existe
-- ============================================================================
INSERT INTO lista_69b_meta (
  id, ultima_actualizacion, total_rfcs,
  total_definitivos, total_presuntos, total_desvirtuados, total_sentencia_favorable,
  fuente_csv, matches_clientes, matches_proveedores,
  observaciones
)
VALUES (
  1, '2026-05-02', 14038,
  11435, 821, 340, 1442,
  'Listado_completo_69-B.csv (SAT al 31-marzo-2026)', 1, 0,
  'Importación inicial. Próxima revisión: 2026-11-02.'
)
ON CONFLICT (id) DO NOTHING;
