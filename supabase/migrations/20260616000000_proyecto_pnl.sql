-- ============================================================================
-- Sprint V.1 — Estado de Resultados por Proyecto (P&L)
-- ============================================================================

-- 1. Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_costo_proyecto') THEN
    CREATE TYPE categoria_costo_proyecto AS ENUM (
      'materiales',
      'mano_obra_ingenieria',
      'mano_obra_campo',
      'subcontratos',
      'activos_compartidos',
      'levantamientos',
      'logistica',
      'garantia_provision',
      'indirectos_centros',
      'otros'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_costo_imputado') THEN
    CREATE TYPE tipo_costo_imputado AS ENUM (
      'provision_garantia',
      'ajuste_manual',
      'subcontrato_externo',
      'viaticos_no_facturados',
      'capacitacion_proyecto',
      'mejora_cliente',
      'penalizacion',
      'otro'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_hora_trabajada') THEN
    CREATE TYPE tipo_hora_trabajada AS ENUM (
      'ingenieria_propia',
      'campo_estimado'
    );
  END IF;
END$$;

-- 2. Presupuesto del proyecto
CREATE TABLE IF NOT EXISTS proyecto_presupuesto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  ingreso_total NUMERIC(14,2) NOT NULL CHECK (ingreso_total >= 0),

  presupuesto_materiales NUMERIC(12,2) DEFAULT 0,
  presupuesto_mano_obra_ingenieria NUMERIC(12,2) DEFAULT 0,
  presupuesto_mano_obra_campo NUMERIC(12,2) DEFAULT 0,
  presupuesto_subcontratos NUMERIC(12,2) DEFAULT 0,
  presupuesto_activos_compartidos NUMERIC(12,2) DEFAULT 0,
  presupuesto_logistica NUMERIC(12,2) DEFAULT 0,
  presupuesto_indirectos NUMERIC(12,2) DEFAULT 0,
  presupuesto_otros NUMERIC(12,2) DEFAULT 0,

  porcentaje_provision_garantia NUMERIC(5,2) DEFAULT 3.0
    CHECK (porcentaje_provision_garantia >= 0 AND porcentaje_provision_garantia <= 30),
  margen_objetivo_pct NUMERIC(5,2),

  cotizacion_id UUID REFERENCES cotizaciones(id) ON DELETE SET NULL,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  observaciones TEXT,

  cerrado BOOLEAN DEFAULT FALSE,
  cerrado_por UUID REFERENCES auth.users(id),
  cerrado_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id)
);

CREATE INDEX IF NOT EXISTS idx_proy_presupuesto_proyecto
  ON proyecto_presupuesto(proyecto_id);

-- 3. Costos imputados manualmente
CREATE TABLE IF NOT EXISTS proyecto_costos_imputados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id),

  fecha DATE NOT NULL,
  tipo tipo_costo_imputado NOT NULL,
  categoria categoria_costo_proyecto NOT NULL,
  concepto TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto >= 0),

  centro_id UUID REFERENCES centros(id) ON DELETE SET NULL,
  comprobante_url TEXT,

  justificacion TEXT NOT NULL,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,

  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_costos_imp_proyecto
  ON proyecto_costos_imputados(proyecto_id, fecha DESC) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_costos_imp_empresa
  ON proyecto_costos_imputados(empresa_id, fecha DESC);

-- 4. Horas trabajadas
CREATE TABLE IF NOT EXISTS proyecto_horas_trabajadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES empleados(id) ON DELETE SET NULL,
  registrado_por UUID NOT NULL REFERENCES auth.users(id),

  tipo tipo_hora_trabajada NOT NULL,
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,
  horas NUMERIC(5,2) NOT NULL CHECK (horas >= 0 AND horas <= 60),

  cuadrilla_descripcion TEXT,
  num_personas INTEGER,

  tarifa_aplicada NUMERIC(10,2),
  costo_calculado NUMERIC(10,2) GENERATED ALWAYS AS (horas * COALESCE(tarifa_aplicada, 0)) STORED,

  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (semana_fin >= semana_inicio),
  CHECK (
    (tipo = 'ingenieria_propia' AND empleado_id IS NOT NULL AND num_personas IS NULL)
    OR
    (tipo = 'campo_estimado' AND num_personas IS NOT NULL AND num_personas > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_horas_proyecto_semana
  ON proyecto_horas_trabajadas(proyecto_id, semana_inicio DESC);
CREATE INDEX IF NOT EXISTS idx_horas_empleado_semana
  ON proyecto_horas_trabajadas(empleado_id, semana_inicio DESC) WHERE empleado_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_horas_registrador
  ON proyecto_horas_trabajadas(registrado_por, semana_inicio DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_horas_ingenieria
  ON proyecto_horas_trabajadas(empleado_id, proyecto_id, semana_inicio)
  WHERE tipo = 'ingenieria_propia';

-- 5. updated_at triggers
DROP TRIGGER IF EXISTS set_updated_at_proy_presupuesto ON proyecto_presupuesto;
CREATE TRIGGER set_updated_at_proy_presupuesto BEFORE UPDATE ON proyecto_presupuesto
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_costos_imp ON proyecto_costos_imputados;
CREATE TRIGGER set_updated_at_costos_imp BEFORE UPDATE ON proyecto_costos_imputados
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_horas ON proyecto_horas_trabajadas;
CREATE TRIGGER set_updated_at_horas BEFORE UPDATE ON proyecto_horas_trabajadas
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 6. RLS
ALTER TABLE proyecto_presupuesto ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_costos_imputados ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyecto_horas_trabajadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pp_select ON proyecto_presupuesto;
CREATE POLICY pp_select ON proyecto_presupuesto FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proyectos p
    WHERE p.id = proyecto_presupuesto.proyecto_id
      AND (p.empresa_id IN (SELECT empresas_del_usuario()) OR usuario_es_ceo())
  ));

DROP POLICY IF EXISTS pp_modify ON proyecto_presupuesto;
CREATE POLICY pp_modify ON proyecto_presupuesto FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM proyectos p
    WHERE p.id = proyecto_presupuesto.proyecto_id
      AND (
        usuario_es_ceo() OR EXISTS (
          SELECT 1 FROM usuarios_empresas
          WHERE usuario_id = auth.uid() AND empresa_id = p.empresa_id
            AND (rol = 'director'::rol_usuario OR 'contralor' = ANY(atributos))
            AND activo = TRUE
        )
      )
  ));

DROP POLICY IF EXISTS pci_select ON proyecto_costos_imputados;
CREATE POLICY pci_select ON proyecto_costos_imputados FOR SELECT TO authenticated
  USING (empresa_id IN (SELECT empresas_del_usuario()) OR usuario_es_ceo());

DROP POLICY IF EXISTS pci_modify ON proyecto_costos_imputados;
CREATE POLICY pci_modify ON proyecto_costos_imputados FOR ALL TO authenticated
  USING (
    usuario_es_ceo() OR EXISTS (
      SELECT 1 FROM usuarios_empresas ue
      WHERE ue.usuario_id = auth.uid() AND ue.empresa_id = proyecto_costos_imputados.empresa_id
        AND (ue.rol = 'director'::rol_usuario OR 'contralor' = ANY(ue.atributos))
        AND ue.activo = TRUE
    )
  );

DROP POLICY IF EXISTS pht_select ON proyecto_horas_trabajadas;
CREATE POLICY pht_select ON proyecto_horas_trabajadas FOR SELECT TO authenticated
  USING (
    registrado_por = auth.uid()
    OR (empleado_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM empleados e WHERE e.id = empleado_id AND e.usuario_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM proyectos p
      WHERE p.id = proyecto_horas_trabajadas.proyecto_id
        AND (
          p.pm_id = auth.uid()
          OR usuario_es_ceo()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas ue
            WHERE ue.usuario_id = auth.uid() AND ue.empresa_id = p.empresa_id
              AND (ue.rol IN ('director'::rol_usuario, 'operativo'::rol_usuario) OR 'contralor' = ANY(ue.atributos))
              AND ue.activo = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS pht_insert ON proyecto_horas_trabajadas;
CREATE POLICY pht_insert ON proyecto_horas_trabajadas FOR INSERT TO authenticated
  WITH CHECK (
    registrado_por = auth.uid()
    AND (
      (tipo = 'ingenieria_propia' AND EXISTS (
        SELECT 1 FROM empleados e WHERE e.id = empleado_id AND e.usuario_id = auth.uid()
      ))
      OR
      (tipo = 'campo_estimado' AND EXISTS (
        SELECT 1 FROM proyectos p
        WHERE p.id = proyecto_horas_trabajadas.proyecto_id
          AND (p.pm_id = auth.uid() OR usuario_es_ceo() OR EXISTS (
            SELECT 1 FROM usuarios_empresas ue
            WHERE ue.usuario_id = auth.uid() AND ue.empresa_id = p.empresa_id
              AND ue.rol = 'director'::rol_usuario AND ue.activo = TRUE
          ))
      ))
    )
  );

DROP POLICY IF EXISTS pht_update ON proyecto_horas_trabajadas;
CREATE POLICY pht_update ON proyecto_horas_trabajadas FOR UPDATE TO authenticated
  USING (registrado_por = auth.uid() OR usuario_es_ceo());

-- 7. Función calcular_provision_garantia
CREATE OR REPLACE FUNCTION calcular_provision_garantia(p_proyecto_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
  v_ingreso NUMERIC;
  v_pct NUMERIC;
BEGIN
  SELECT ingreso_total, porcentaje_provision_garantia
  INTO v_ingreso, v_pct
  FROM proyecto_presupuesto
  WHERE proyecto_id = p_proyecto_id;

  IF v_ingreso IS NULL THEN RETURN 0; END IF;
  RETURN ROUND(v_ingreso * COALESCE(v_pct, 0) / 100, 2);
END;
$$;

-- 8. Vista consolidada P&L
CREATE OR REPLACE VIEW v_proyecto_pnl_resumen AS
WITH ingresos_proyecto AS (
  SELECT proyecto_id, SUM(total) AS facturado
  FROM cfdi
  WHERE proyecto_id IS NOT NULL
    AND tipo = 'ingreso'::tipo_cfdi
    AND es_emitido = TRUE
    AND estado IN ('timbrado'::estado_cfdi, 'enviado_cliente'::estado_cfdi, 'pagado'::estado_cfdi)
  GROUP BY proyecto_id
),
costos_oc AS (
  SELECT proyecto_id, SUM(total) AS costo_materiales_oc
  FROM ordenes_compra
  WHERE proyecto_id IS NOT NULL
    AND estado IN ('aprobada'::estado_oc, 'enviada'::estado_oc, 'parcial_recibida'::estado_oc, 'recibida'::estado_oc, 'pagada'::estado_oc)
  GROUP BY proyecto_id
),
costos_ot AS (
  SELECT proyecto_id, SUM(total) AS costo_ot
  FROM ordenes_trabajo_inter_co
  WHERE proyecto_id IS NOT NULL
    AND estado IN ('aprobada'::estado_ot, 'completada_origen'::estado_ot, 'confirmada_destino'::estado_ot, 'facturada'::estado_ot, 'cobrada'::estado_ot)
  GROUP BY proyecto_id
),
costos_centros AS (
  SELECT proyecto_id,
         SUM(CASE WHEN tipo IN ('gasto_directo'::tipo_movimiento_centro, 'reparto_recibido'::tipo_movimiento_centro) THEN monto ELSE 0 END) AS costos_via_centros
  FROM centros_movimientos
  WHERE proyecto_id IS NOT NULL
  GROUP BY proyecto_id
),
costos_levantamientos AS (
  SELECT proyecto_destino_id AS proyecto_id, SUM(costo_calculado) AS costo_levantamientos
  FROM levantamientos
  WHERE proyecto_destino_id IS NOT NULL
    AND estado = 'convertido_a_venta'
  GROUP BY proyecto_destino_id
),
costos_horas AS (
  SELECT proyecto_id,
         SUM(CASE WHEN tipo = 'ingenieria_propia'::tipo_hora_trabajada THEN costo_calculado ELSE 0 END) AS costo_horas_ingenieria,
         SUM(CASE WHEN tipo = 'campo_estimado'::tipo_hora_trabajada THEN costo_calculado ELSE 0 END) AS costo_horas_campo
  FROM proyecto_horas_trabajadas
  GROUP BY proyecto_id
),
costos_imputados AS (
  SELECT proyecto_id,
         SUM(CASE WHEN categoria = 'garantia_provision'::categoria_costo_proyecto THEN monto ELSE 0 END) AS provision_garantia,
         SUM(CASE WHEN categoria != 'garantia_provision'::categoria_costo_proyecto THEN monto ELSE 0 END) AS otros_imputados
  FROM proyecto_costos_imputados
  WHERE activo = TRUE
  GROUP BY proyecto_id
)
SELECT
  p.id AS proyecto_id,
  p.codigo, p.nombre, p.empresa_id, p.estado, p.cliente_id,

  pp.ingreso_total AS ingreso_presupuestado,
  COALESCE(pp.presupuesto_materiales, 0) AS presupuesto_materiales,
  COALESCE(pp.presupuesto_mano_obra_ingenieria, 0) AS presupuesto_ing,
  COALESCE(pp.presupuesto_mano_obra_campo, 0) AS presupuesto_campo,
  COALESCE(pp.presupuesto_subcontratos, 0) AS presupuesto_subcontratos,
  COALESCE(pp.presupuesto_indirectos, 0) AS presupuesto_indirectos,
  COALESCE(pp.margen_objetivo_pct, 0) AS margen_objetivo_pct,

  COALESCE(ip.facturado, 0) AS ingreso_facturado,
  COALESCE(pp.ingreso_total, 0) - COALESCE(ip.facturado, 0) AS ingreso_por_facturar,

  COALESCE(co.costo_materiales_oc, 0) AS costo_materiales_oc,
  COALESCE(cot.costo_ot, 0) AS costo_subcontratos,
  COALESCE(ch.costo_horas_ingenieria, 0) AS costo_horas_ingenieria,
  COALESCE(ch.costo_horas_campo, 0) AS costo_horas_campo,
  COALESCE(cl.costo_levantamientos, 0) AS costo_levantamientos,

  COALESCE(co.costo_materiales_oc, 0)
    + COALESCE(cot.costo_ot, 0)
    + COALESCE(ch.costo_horas_ingenieria, 0)
    + COALESCE(ch.costo_horas_campo, 0)
    + COALESCE(cl.costo_levantamientos, 0) AS costos_directos_total,

  COALESCE(cc.costos_via_centros, 0) AS costos_indirectos_centros,
  COALESCE(cim.provision_garantia, 0) AS provision_garantia,
  COALESCE(cim.otros_imputados, 0) AS otros_imputados,
  COALESCE(cc.costos_via_centros, 0) + COALESCE(cim.provision_garantia, 0)
    + COALESCE(cim.otros_imputados, 0) AS costos_indirectos_total,

  COALESCE(co.costo_materiales_oc, 0) + COALESCE(cot.costo_ot, 0)
    + COALESCE(ch.costo_horas_ingenieria, 0) + COALESCE(ch.costo_horas_campo, 0)
    + COALESCE(cl.costo_levantamientos, 0) + COALESCE(cc.costos_via_centros, 0)
    + COALESCE(cim.provision_garantia, 0) + COALESCE(cim.otros_imputados, 0)
    AS costos_totales,

  COALESCE(pp.ingreso_total, 0)
    - (COALESCE(co.costo_materiales_oc, 0)
       + COALESCE(cot.costo_ot, 0) + COALESCE(ch.costo_horas_ingenieria, 0)
       + COALESCE(ch.costo_horas_campo, 0) + COALESCE(cl.costo_levantamientos, 0))
    AS margen_contribucion,

  COALESCE(pp.ingreso_total, 0)
    - (COALESCE(co.costo_materiales_oc, 0)
       + COALESCE(cot.costo_ot, 0) + COALESCE(ch.costo_horas_ingenieria, 0)
       + COALESCE(ch.costo_horas_campo, 0) + COALESCE(cl.costo_levantamientos, 0)
       + COALESCE(cc.costos_via_centros, 0) + COALESCE(cim.provision_garantia, 0)
       + COALESCE(cim.otros_imputados, 0))
    AS margen_neto

FROM proyectos p
LEFT JOIN proyecto_presupuesto pp ON pp.proyecto_id = p.id
LEFT JOIN ingresos_proyecto ip ON ip.proyecto_id = p.id
LEFT JOIN costos_oc co ON co.proyecto_id = p.id
LEFT JOIN costos_ot cot ON cot.proyecto_id = p.id
LEFT JOIN costos_centros cc ON cc.proyecto_id = p.id
LEFT JOIN costos_levantamientos cl ON cl.proyecto_id = p.id
LEFT JOIN costos_horas ch ON ch.proyecto_id = p.id
LEFT JOIN costos_imputados cim ON cim.proyecto_id = p.id;

COMMENT ON VIEW v_proyecto_pnl_resumen IS
  'P&L consolidado por proyecto: presupuesto vs real, costos directos e indirectos, margen contribución y neto.';

-- 9. Vista detalle por movimiento
CREATE OR REPLACE VIEW v_proyecto_pnl_detalle AS
SELECT 'oc'::TEXT AS fuente, oc.proyecto_id, oc.fecha_emision AS fecha,
       'materiales'::categoria_costo_proyecto AS categoria,
       oc.numero AS referencia, COALESCE(oc.comentarios, 'OC ' || oc.numero) AS descripcion,
       oc.total AS monto
FROM ordenes_compra oc
WHERE oc.proyecto_id IS NOT NULL
  AND oc.estado IN ('aprobada'::estado_oc, 'enviada'::estado_oc, 'parcial_recibida'::estado_oc, 'recibida'::estado_oc, 'pagada'::estado_oc)

UNION ALL
SELECT 'ot'::TEXT, ot.proyecto_id, ot.fecha_solicitud,
       'subcontratos'::categoria_costo_proyecto, ot.numero,
       ot.descripcion, ot.total
FROM ordenes_trabajo_inter_co ot
WHERE ot.proyecto_id IS NOT NULL
  AND ot.estado IN ('aprobada'::estado_ot, 'completada_origen'::estado_ot, 'confirmada_destino'::estado_ot, 'facturada'::estado_ot, 'cobrada'::estado_ot)

UNION ALL
SELECT 'horas'::TEXT, ph.proyecto_id, ph.semana_inicio,
       (CASE ph.tipo WHEN 'ingenieria_propia' THEN 'mano_obra_ingenieria'
                     ELSE 'mano_obra_campo' END)::categoria_costo_proyecto,
       ph.semana_inicio::TEXT,
       (CASE ph.tipo WHEN 'ingenieria_propia' THEN 'Horas ingeniería: ' || ph.horas
                     ELSE 'Horas campo: ' || COALESCE(ph.cuadrilla_descripcion, '') END),
       ph.costo_calculado
FROM proyecto_horas_trabajadas ph

UNION ALL
SELECT 'imp'::TEXT, ci.proyecto_id, ci.fecha,
       ci.categoria, ci.tipo::TEXT, ci.concepto, ci.monto
FROM proyecto_costos_imputados ci
WHERE ci.activo = TRUE

UNION ALL
SELECT 'centro'::TEXT, cm.proyecto_id, cm.fecha,
       'indirectos_centros'::categoria_costo_proyecto, cm.tipo::TEXT,
       cm.concepto, cm.monto
FROM centros_movimientos cm
WHERE cm.proyecto_id IS NOT NULL
  AND cm.tipo IN ('gasto_directo'::tipo_movimiento_centro, 'reparto_recibido'::tipo_movimiento_centro)

UNION ALL
SELECT 'cfdi'::TEXT, cfdi.proyecto_id, cfdi.fecha_emision::DATE,
       NULL::categoria_costo_proyecto, COALESCE(cfdi.folio, ''),
       'CFDI emitido a cliente', -cfdi.total
FROM cfdi
WHERE cfdi.proyecto_id IS NOT NULL AND cfdi.tipo = 'ingreso'::tipo_cfdi
  AND cfdi.es_emitido = TRUE
  AND cfdi.estado IN ('timbrado'::estado_cfdi, 'enviado_cliente'::estado_cfdi, 'pagado'::estado_cfdi);
