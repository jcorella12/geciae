-- Sprint 24 — Activos: Vehículos del grupo (propios + arrendados).
-- Bitácora de kilometraje, combustible, mantenimientos.

CREATE TYPE estatus_vehiculo AS ENUM (
  'activo',
  'mantenimiento',
  'reparacion',
  'fuera_servicio',
  'baja'
);

CREATE TYPE tipo_propiedad_vehiculo AS ENUM (
  'propio',
  'arrendamiento_financiero',
  'arrendamiento_puro',
  'rentado_corto_plazo',
  'comodato'
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,

  -- Identificación
  placa TEXT,
  numero_economico TEXT,  -- número interno
  serie TEXT,  -- VIN
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  anio INTEGER CHECK (anio BETWEEN 1980 AND 2100),
  color TEXT,

  -- Categorización
  tipo TEXT,  -- pickup, sedan, suv, camion, etc.
  uso TEXT,  -- operativo, ejecutivo, transporte_personal, etc.
  combustible TEXT,  -- gasolina, diesel, electrico, hibrido

  -- Propiedad
  tipo_propiedad tipo_propiedad_vehiculo NOT NULL DEFAULT 'propio',
  fecha_adquisicion DATE,
  costo_adquisicion NUMERIC(12, 2),
  proveedor_id UUID REFERENCES proveedores(id),  -- si arrendado/rentado
  gasto_recurrente_id UUID REFERENCES gastos_recurrentes(id),  -- vincula con la mensualidad
  fecha_termino_contrato DATE,  -- si arrendado

  -- Estado
  estatus estatus_vehiculo NOT NULL DEFAULT 'activo',
  km_actual INTEGER DEFAULT 0,
  fecha_ultimo_servicio DATE,
  km_proximo_servicio INTEGER,
  fecha_proximo_servicio DATE,

  -- Documentación
  poliza_seguro TEXT,
  fecha_vencimiento_seguro DATE,
  tarjeta_circulacion_url TEXT,
  factura_url TEXT,

  -- Asignación actual
  asignado_a UUID REFERENCES auth.users(id),
  proyecto_asignado_id UUID REFERENCES proyectos(id),

  observaciones TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(empresa_id, placa)
);

CREATE INDEX IF NOT EXISTS idx_veh_empresa ON vehiculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_veh_asignado ON vehiculos(asignado_a) WHERE estatus = 'activo';
CREATE INDEX IF NOT EXISTS idx_veh_estatus ON vehiculos(estatus);

-- Bitácora: cualquier evento del vehículo (carga combustible, mantenimiento, kilometraje, etc.)
CREATE TYPE tipo_evento_vehiculo AS ENUM (
  'carga_combustible',
  'lectura_km',
  'mantenimiento_preventivo',
  'mantenimiento_correctivo',
  'reparacion',
  'verificacion',
  'tenencia',
  'siniestro',
  'multa',
  'lavado',
  'otros'
);

CREATE TABLE IF NOT EXISTS vehiculos_bitacora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehiculo_id UUID NOT NULL REFERENCES vehiculos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo tipo_evento_vehiculo NOT NULL,
  descripcion TEXT NOT NULL,

  -- Combustible
  litros NUMERIC(8, 3),
  precio_por_litro NUMERIC(8, 4),

  -- Costos
  monto NUMERIC(10, 2),
  iva NUMERIC(10, 2),
  proveedor_id UUID REFERENCES proveedores(id),
  proveedor_nombre TEXT,
  cfdi_relacionado_id UUID REFERENCES cfdi(id),

  -- Kilometraje
  km_lectura INTEGER,
  km_recorridos INTEGER,  -- delta vs lectura anterior

  -- Quien
  conductor_id UUID REFERENCES auth.users(id),
  capturado_por UUID REFERENCES auth.users(id),

  -- Adjuntos
  comprobante_url TEXT,

  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vb_vehiculo
  ON vehiculos_bitacora(vehiculo_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_vb_tipo
  ON vehiculos_bitacora(tipo);

-- Trigger: al insertar bitácora con km_lectura, actualizar el km_actual del vehículo
CREATE OR REPLACE FUNCTION actualizar_km_vehiculo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.km_lectura IS NOT NULL AND NEW.km_lectura > 0 THEN
    UPDATE vehiculos
    SET km_actual = NEW.km_lectura,
        updated_at = NOW()
    WHERE id = NEW.vehiculo_id
      AND (km_actual IS NULL OR km_actual < NEW.km_lectura);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vb_km ON vehiculos_bitacora;
CREATE TRIGGER trg_vb_km
  AFTER INSERT ON vehiculos_bitacora
  FOR EACH ROW EXECUTE FUNCTION actualizar_km_vehiculo();

-- RLS
ALTER TABLE vehiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos_bitacora ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS veh_select ON vehiculos;
CREATE POLICY veh_select ON vehiculos FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR asignado_a = auth.uid()
  );

DROP POLICY IF EXISTS veh_modify ON vehiculos;
CREATE POLICY veh_modify ON vehiculos FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = vehiculos.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

DROP POLICY IF EXISTS vb_select ON vehiculos_bitacora;
CREATE POLICY vb_select ON vehiculos_bitacora FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehiculos v
      WHERE v.id = vehiculos_bitacora.vehiculo_id
        AND (
          v.empresa_id IN (SELECT empresas_del_usuario())
          OR usuario_es_ceo()
          OR v.asignado_a = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS vb_modify ON vehiculos_bitacora;
CREATE POLICY vb_modify ON vehiculos_bitacora FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehiculos v
      WHERE v.id = vehiculos_bitacora.vehiculo_id
        AND (
          usuario_es_ceo()
          OR v.asignado_a = auth.uid()
          OR EXISTS (
            SELECT 1 FROM usuarios_empresas
            WHERE usuario_id = auth.uid()
              AND empresa_id = v.empresa_id
              AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
              AND activo = TRUE
          )
        )
    )
  );

-- Vista enriquecida con TCO (total cost of ownership) calculado de bitácora últimos 12 meses
CREATE OR REPLACE VIEW v_vehiculos_lista AS
SELECT
  v.id,
  v.empresa_id,
  e.codigo AS empresa_codigo,
  v.placa,
  v.numero_economico,
  v.marca,
  v.modelo,
  v.anio,
  v.color,
  v.tipo,
  v.uso,
  v.combustible,
  v.tipo_propiedad,
  v.estatus,
  v.km_actual,
  v.fecha_ultimo_servicio,
  v.km_proximo_servicio,
  v.fecha_proximo_servicio,
  v.fecha_vencimiento_seguro,
  v.fecha_termino_contrato,
  v.asignado_a,
  v.proyecto_asignado_id,
  v.gasto_recurrente_id,
  -- Costos últimos 12 meses
  COALESCE(
    (SELECT SUM(monto) FROM vehiculos_bitacora vb
     WHERE vb.vehiculo_id = v.id
       AND vb.fecha >= CURRENT_DATE - INTERVAL '12 months'),
    0
  ) AS gasto_12m,
  COALESCE(
    (SELECT SUM(monto) FROM vehiculos_bitacora vb
     WHERE vb.vehiculo_id = v.id
       AND vb.tipo = 'carga_combustible'
       AND vb.fecha >= CURRENT_DATE - INTERVAL '12 months'),
    0
  ) AS combustible_12m,
  COALESCE(
    (SELECT SUM(monto) FROM vehiculos_bitacora vb
     WHERE vb.vehiculo_id = v.id
       AND vb.tipo IN ('mantenimiento_preventivo', 'mantenimiento_correctivo', 'reparacion')
       AND vb.fecha >= CURRENT_DATE - INTERVAL '12 months'),
    0
  ) AS mantenimiento_12m,
  -- Mensualidad (si arrendado)
  COALESCE(
    (SELECT g.monto FROM gastos_recurrentes g WHERE g.id = v.gasto_recurrente_id),
    0
  ) AS mensualidad_arrendamiento,
  v.created_at
FROM vehiculos v
LEFT JOIN empresas e ON e.id = v.empresa_id;
