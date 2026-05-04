-- Sprint 20 — Gastos recurrentes / obligaciones periódicas (indirectos).
-- Captura arrendamientos de vehículos, rentas de inmuebles, telefonía, software,
-- seguros, vigilancia, etc. Permite calcular indirectos mensuales por empresa.

CREATE TYPE categoria_gasto_recurrente AS ENUM (
  'arrendamiento_vehiculo',
  'renta_inmueble',
  'telefonia_internet',
  'software_saas',
  'seguros',
  'vigilancia',
  'mantenimiento',
  'limpieza',
  'servicios_publicos',  -- luz, agua, gas
  'membresia_camara',
  'asesoria_contable',
  'asesoria_legal',
  'otros_indirectos'
);

CREATE TYPE frecuencia_gasto AS ENUM (
  'mensual',
  'bimestral',
  'trimestral',
  'semestral',
  'anual'
);

CREATE TABLE IF NOT EXISTS gastos_recurrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  categoria categoria_gasto_recurrente NOT NULL,
  descripcion TEXT NOT NULL,
  proveedor_id UUID REFERENCES proveedores(id),
  proveedor_nombre TEXT, -- si no se vincula a un proveedor en catálogo

  -- Monto y frecuencia
  monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  moneda TEXT NOT NULL DEFAULT 'MXN',
  iva_incluido BOOLEAN DEFAULT TRUE,
  frecuencia frecuencia_gasto NOT NULL DEFAULT 'mensual',
  dia_pago INTEGER CHECK (dia_pago BETWEEN 1 AND 31),

  -- Vigencia
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE, -- NULL = indefinido
  activo BOOLEAN DEFAULT TRUE,

  -- Identificación específica (para arrendamiento vehículo)
  identificador TEXT, -- placa, número de unidad, número contrato
  contrato_url TEXT, -- path en bucket si está digitalizado

  -- Vinculación opcional con CFDI/OC para tracking real
  cfdi_relacionado_id UUID REFERENCES cfdi(id),

  -- Metadata
  observaciones TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_rec_empresa
  ON gastos_recurrentes(empresa_id) WHERE activo = TRUE;
CREATE INDEX IF NOT EXISTS idx_gastos_rec_categoria
  ON gastos_recurrentes(categoria);

-- RLS
ALTER TABLE gastos_recurrentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gastos_rec_select ON gastos_recurrentes;
CREATE POLICY gastos_rec_select ON gastos_recurrentes
  FOR SELECT TO authenticated
  USING (
    empresa_id IN (SELECT empresas_del_usuario())
    OR usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR usuario_tiene_atributo('aprobador_financiero')
    OR usuario_tiene_atributo('auditor_interno')
  );

DROP POLICY IF EXISTS gastos_rec_modify ON gastos_recurrentes;
CREATE POLICY gastos_rec_modify ON gastos_recurrentes
  FOR ALL TO authenticated
  USING (
    usuario_es_ceo()
    OR usuario_tiene_atributo('tesorero_corporativo')
    OR EXISTS (
      SELECT 1 FROM usuarios_empresas
      WHERE usuario_id = auth.uid()
        AND empresa_id = gastos_recurrentes.empresa_id
        AND rol IN ('director'::rol_usuario, 'operativo'::rol_usuario)
        AND activo = TRUE
    )
  );

-- Vista enriquecida con monto_mensualizado (normaliza a mensual según frecuencia)
CREATE OR REPLACE VIEW v_gastos_recurrentes_lista AS
SELECT
  g.id,
  g.empresa_id,
  e.codigo AS empresa_codigo,
  g.categoria,
  g.descripcion,
  g.proveedor_id,
  p.razon_social AS proveedor_razon_social,
  COALESCE(p.razon_social, g.proveedor_nombre) AS proveedor_display,
  g.monto,
  g.moneda,
  g.iva_incluido,
  g.frecuencia,
  g.dia_pago,
  -- Monto mensualizado para sumas comparables
  CASE g.frecuencia
    WHEN 'mensual' THEN g.monto
    WHEN 'bimestral' THEN g.monto / 2
    WHEN 'trimestral' THEN g.monto / 3
    WHEN 'semestral' THEN g.monto / 6
    WHEN 'anual' THEN g.monto / 12
  END AS monto_mensualizado,
  g.fecha_inicio,
  g.fecha_fin,
  g.activo,
  g.identificador,
  g.contrato_url,
  g.observaciones,
  g.created_at
FROM gastos_recurrentes g
LEFT JOIN empresas e ON e.id = g.empresa_id
LEFT JOIN proveedores p ON p.id = g.proveedor_id;

-- Bucket para contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-recurrentes', 'contratos-recurrentes', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS contr_rec_storage_select ON storage.objects;
CREATE POLICY contr_rec_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contratos-recurrentes');

DROP POLICY IF EXISTS contr_rec_storage_insert ON storage.objects;
CREATE POLICY contr_rec_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contratos-recurrentes');
