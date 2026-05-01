-- ============================================================================
-- Seed: 4 empresas del Grupo PSENERGIA + unidades de negocio
-- ============================================================================
-- IMPORTANTE: los RFCs, regímenes fiscales y direcciones son PLACEHOLDERS.
-- Reemplazar con los datos fiscales reales antes de Fase 1 productiva
-- (Sprint 6 — timbrado de CFDI requerirá RFCs reales).
-- ============================================================================

INSERT INTO empresas (codigo, razon_social, nombre_comercial, rfc, regimen_fiscal, cp_fiscal, direccion_fiscal, identidad_visual, activa)
VALUES
  (
    'PSE',
    'PSENERGIA, S.A. DE C.V.',
    'PSENERGIA',
    'PEN000000XXX',
    '601',
    '83000',
    jsonb_build_object('estado', 'Sonora', 'municipio', 'Hermosillo', 'pais', 'México'),
    jsonb_build_object('color_primario', '#2D8B5A', 'color_acento', '#E89B45'),
    TRUE
  ),
  (
    'CIAE',
    'CIAE, S.A. DE C.V.',
    'CIAE',
    'CIA000000XXX',
    '601',
    '83000',
    jsonb_build_object('estado', 'Sonora', 'municipio', 'Hermosillo', 'pais', 'México'),
    jsonb_build_object('color_primario', '#1F6B47'),
    TRUE
  ),
  (
    'IED',
    'INGENIERÍA ELÉCTRICA DEL DESIERTO, S.A. DE C.V.',
    'IED',
    'IED000000XXX',
    '601',
    '83000',
    jsonb_build_object('estado', 'Sonora', 'municipio', 'Hermosillo', 'pais', 'México'),
    jsonb_build_object('color_primario', '#A86A2D'),
    TRUE
  ),
  (
    'LIMSON',
    'LIMSON, S.A. DE C.V.',
    'Limson',
    'LIM000000XXX',
    '601',
    '83000',
    jsonb_build_object('estado', 'Sonora', 'municipio', 'Hermosillo', 'pais', 'México'),
    jsonb_build_object('color_primario', '#8FBF5F'),
    TRUE
  )
ON CONFLICT (codigo) DO NOTHING;

-- Unidades de negocio
-- PSENERGIA: 1 unidad — Solar
-- CIAE: 3 unidades — Organismo Certificador, UVIE, Capacitación
-- IED: 1 unidad — Eléctrico Industrial
-- Limson: 1 unidad — Mantenimiento

INSERT INTO unidades_negocio (empresa_id, codigo, nombre, descripcion, activa)
SELECT e.id, u.codigo, u.nombre, u.descripcion, TRUE
FROM empresas e
JOIN (VALUES
  ('PSE',    'SOLAR',   'Solar Fotovoltaico',          'Sistemas solares fotovoltaicos B2C/B2B, foco industrial'),
  ('CIAE',   'OC',      'Organismo Certificador',      'Acreditado EMA — recibe procesos de CE/EI externos'),
  ('CIAE',   'UVIE',    'UVIE',                        'Unidad de Verificación NOM-001-SEDE'),
  ('CIAE',   'CAP',     'Capacitación',                'Cursos presenciales y online (Kajabi LMS)'),
  ('IED',    'ELEC',    'Eléctrico Industrial',        'Construcción eléctrica industrial, subestaciones, MT'),
  ('LIMSON', 'MANT',    'Mantenimiento',               'Limpieza/mantenimiento solar y eléctrico + mano de obra')
) AS u(empresa_codigo, codigo, nombre, descripcion)
  ON e.codigo = u.empresa_codigo
ON CONFLICT (empresa_id, codigo) DO NOTHING;
