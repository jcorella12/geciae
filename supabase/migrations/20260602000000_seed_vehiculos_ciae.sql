-- ============================================================================
-- Seed: alta inicial de vehículos CIAE basado en Reporte Gasolina Abril 2026
-- ============================================================================
-- Idempotente: ON CONFLICT (empresa_id, placa) actualiza km_actual y
-- observaciones, no duplica. Las observaciones marcan los vehículos que
-- probablemente son propiedad de empleados con prestación gasolina (Luci,
-- Alan), para que se ajuste manualmente el tipo_propiedad si aplica.
-- ============================================================================

INSERT INTO vehiculos
  (empresa_id, placa, numero_economico, marca, modelo, km_actual, tipo,
   combustible, tipo_propiedad, estatus, observaciones)
SELECT
  (SELECT id FROM empresas WHERE codigo = 'CIAE' LIMIT 1),
  v.placa, v.eco, v.marca, v.modelo, v.km, v.tipo,
  'gasolina', 'propio'::tipo_propiedad_vehiculo, 'activo'::estatus_vehiculo,
  v.notas
FROM (VALUES
  ('VB0675A', NULL,    'Chevrolet',     'Oroch',                35168, 'pickup', 'Alias gasolina: OROCH'),
  ('WCY754B', NULL,    'Renault',       'Kwid',                 29795, 'sedan',  'Alias gasolina: KWID05'),
  ('VA0332A', NULL,    'Por confirmar', 'ESTACA7',                  0, NULL,     'Alias gasolina: ESTACA7. Confirmar marca/modelo.'),
  ('WEG822B', NULL,    'Renault',       'Kwid',                 13654, 'sedan',  'Alias gasolina: KWID06'),
  ('WBF296B', NULL,    'Hyundai',       'Tucson',               72189, 'suv',    'Alias gasolina: TUCSON'),
  ('UV4741A', '04',    'Renault',       'Kangoo',               23920, 'panel',  'Alias gasolina: KANGOO 04'),
  ('UZ7188A', NULL,    'Nissan',        'Frontier',                 0, 'pickup', 'Alias gasolina: FRONTIER. Sin lectura km en abril.'),
  ('WKX022B', NULL,    'Nissan',        'Versa',                12911, 'sedan',  'Alias gasolina: VERSA'),
  ('VVX546A', NULL,    'Mazda',         'Por confirmar modelo',     0, 'sedan',  'Alias gasolina: MAZDA. Confirmar modelo.'),
  ('WBB883A', 'LUCI',  'Toyota',        'Camry',                    0, 'sedan',  'Alias gasolina: CAMRY LUCI. Posible vehículo propiedad de empleada Luci con prestación gasolina (verificar tipo_propiedad).'),
  ('WFF1212', 'ALAN',  'Hyundai',       'Tucson',                   0, 'suv',    'Alias gasolina: TUCSON ALAN. Posible vehículo propiedad de empleado Alan con prestación gasolina (verificar tipo_propiedad).'),
  ('VUY390C', NULL,    'Chevrolet',     'Cobalt',                   0, 'sedan',  'Alias gasolina: COBALT. Sin lectura km confiable.'),
  ('WKL690B', NULL,    'Renault',       'Arkana',               23868, 'suv',    'Alias gasolina: ARKANA. Usa SUPREME (premium).')
) AS v(placa, eco, marca, modelo, km, tipo, notas)
ON CONFLICT (empresa_id, placa) DO UPDATE
  SET km_actual = EXCLUDED.km_actual,
      observaciones = EXCLUDED.observaciones;
