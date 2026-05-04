-- Datos demo (idempotente — usa ON CONFLICT DO NOTHING).
-- Para limpiar: DELETE FROM clientes WHERE rfc LIKE 'DEMO%' OR rfc IN (...);
-- Empresas ya están seedeadas (PSE, CIAE, IED, LIMSON).

-- ===== Clientes (5) — solar/comercial/gubernamental =====
INSERT INTO clientes (
  razon_social, nombre_comercial, rfc, regimen_fiscal, uso_cfdi_default,
  cp_fiscal, tipo, segmento, riesgo, score_pago, activo
) VALUES
  (
    'Inmobiliaria Granada SA de CV', 'Inmob. Granada',
    'IGR240514AB1', '601', 'G03', '11000',
    'comercial', 'real_estate', 'bajo', 0.92, TRUE
  ),
  (
    'Logística del Bajío SAPI de CV', 'Logística Bajío',
    'LBA231012XY8', '601', 'G03', '76140',
    'industrial', 'logistica', 'medio', 0.78, TRUE
  ),
  (
    'Grupo Comercial MZ SA de CV', 'Grupo MZ',
    'GMZ220304QQ1', '601', 'G03', '42000',
    'comercial', 'retail', 'medio', 0.65, TRUE
  ),
  (
    'Banco del Norte SA Institución de Banca Múltiple',
    'Banca Norte', 'BNO180624RS5',
    '601', 'G03', '64000',
    'industrial', 'financiero', 'bajo', 0.95, TRUE
  ),
  (
    'Municipio de Tlalnepantla de Baz', 'Mun. Tlalnepantla',
    'MTL850101AAA', '603', 'G03', '54000',
    'gubernamental', 'gobierno_local', 'alto', 0.55, TRUE
  )
ON CONFLICT (rfc) DO NOTHING;

-- ===== Proveedores (5) — materiales/servicios/transporte =====
INSERT INTO proveedores (
  razon_social, nombre_comercial, rfc, regimen_fiscal, cp_fiscal,
  tipo_proveedor, clasificacion_interna, requiere_repse,
  semaforo, esta_aprobado, fecha_aprobacion, activo
) VALUES
  (
    'CEMEX México SA de CV', 'CEMEX',
    'CME880201XY3', '601', '64480',
    'materiales', 'estrategico', FALSE,
    'verde', TRUE, '2024-03-15', TRUE
  ),
  (
    'Ferretería Vallejo del Norte SA de CV', 'Ferre Vallejo',
    'FVN150607BR2', '601', '07440',
    'materiales', 'recurrente', FALSE,
    'verde', TRUE, '2024-04-22', TRUE
  ),
  (
    'Transportes Especializados del Centro SA de CV',
    'Trans. Especializados',
    'TEC200102PQ4', '601', '54200',
    'transportista', 'importante', FALSE,
    'amarillo', TRUE, '2024-06-10', TRUE
  ),
  (
    'Constructora del Pacífico SA de CV', 'Constructora Pacífico',
    'CPA160815RT9', '601', '44180',
    'subcontratista', 'estrategico', TRUE,
    'verde', TRUE, '2024-02-03', TRUE
  ),
  (
    'Servicios Eléctricos Industriales SA de CV', 'SEI',
    'SEI180420WW7', '601', '54050',
    'servicios', 'recurrente', FALSE,
    'rojo', FALSE, NULL, TRUE
  )
ON CONFLICT (rfc) DO NOTHING;

-- ===== Vincular clientes a empresas (Inmob. Granada con CIAE; Logística Bajío con CIAE+IED; etc.) =====
INSERT INTO clientes_empresas (cliente_id, empresa_id, fecha_primera_operacion, activo)
SELECT c.id, e.id, '2024-03-01'::date, TRUE
FROM clientes c, empresas e
WHERE c.rfc = 'IGR240514AB1' AND e.codigo = 'CIAE'
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

INSERT INTO clientes_empresas (cliente_id, empresa_id, fecha_primera_operacion, activo)
SELECT c.id, e.id, '2023-11-01'::date, TRUE
FROM clientes c, empresas e
WHERE c.rfc = 'LBA231012XY8' AND e.codigo IN ('CIAE', 'IED')
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

INSERT INTO clientes_empresas (cliente_id, empresa_id, fecha_primera_operacion, activo)
SELECT c.id, e.id, '2024-01-15'::date, TRUE
FROM clientes c, empresas e
WHERE c.rfc = 'GMZ220304QQ1' AND e.codigo = 'CIAE'
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

INSERT INTO clientes_empresas (cliente_id, empresa_id, fecha_primera_operacion, activo)
SELECT c.id, e.id, '2024-02-20'::date, TRUE
FROM clientes c, empresas e
WHERE c.rfc = 'BNO180624RS5' AND e.codigo = 'PSE'
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

INSERT INTO clientes_empresas (cliente_id, empresa_id, fecha_primera_operacion, activo)
SELECT c.id, e.id, '2024-04-01'::date, TRUE
FROM clientes c, empresas e
WHERE c.rfc = 'MTL850101AAA' AND e.codigo IN ('CIAE', 'PSE')
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

-- ===== Proyectos (5) =====
-- Para evitar problemas de auth.users en demo, se omite vendedor_id/pm_id (NULL).
DO $$
DECLARE
  v_emp_pse  UUID;
  v_emp_ciae UUID;
  v_emp_ied  UUID;
  v_cli_inmob UUID;
  v_cli_log UUID;
  v_cli_mz UUID;
  v_cli_banca UUID;
  v_cli_mun UUID;
BEGIN
  SELECT id INTO v_emp_pse FROM empresas WHERE codigo = 'PSE';
  SELECT id INTO v_emp_ciae FROM empresas WHERE codigo = 'CIAE';
  SELECT id INTO v_emp_ied FROM empresas WHERE codigo = 'IED';
  SELECT id INTO v_cli_inmob FROM clientes WHERE rfc = 'IGR240514AB1';
  SELECT id INTO v_cli_log FROM clientes WHERE rfc = 'LBA231012XY8';
  SELECT id INTO v_cli_mz FROM clientes WHERE rfc = 'GMZ220304QQ1';
  SELECT id INTO v_cli_banca FROM clientes WHERE rfc = 'BNO180624RS5';
  SELECT id INTO v_cli_mun FROM clientes WHERE rfc = 'MTL850101AAA';

  -- Proyecto 1: Torre Polanco · Etapa 2 (CIAE — construcción)
  INSERT INTO proyectos (
    empresa_id, cliente_id, codigo, nombre, descripcion, tipo, estado,
    fecha_contrato, fecha_inicio_planeado, fecha_fin_planeado,
    monto_contratado, monto_facturado, presupuesto_costo, costo_real,
    semaforo, capacidad_kwp, observaciones, activo
  ) VALUES (
    v_emp_ciae, v_cli_inmob, 'PRY-2024-031',
    'Torre Polanco · Etapa 2',
    'Construcción etapa 2 de torre habitacional · 18 niveles',
    'electrico_industrial', 'en_ejecucion',
    '2024-02-15', '2024-03-01', '2025-06-30',
    48200000.00, 32600000.00, 38500000.00, 27800000.00,
    'amarillo', NULL,
    'Proyecto en tiempo pero con desviación de 4 puntos vs curva-S.', TRUE
  )
  ON CONFLICT (empresa_id, codigo) DO NOTHING;

  -- Proyecto 2: Bodega Industrial Querétaro (IED — inmobiliario)
  INSERT INTO proyectos (
    empresa_id, cliente_id, codigo, nombre, descripcion, tipo, estado,
    fecha_contrato, fecha_inicio_planeado, fecha_fin_planeado,
    monto_contratado, monto_facturado, presupuesto_costo, costo_real,
    semaforo, observaciones, activo
  ) VALUES (
    v_emp_ied, v_cli_log, 'PRY-2024-028',
    'Bodega Industrial Querétaro',
    'Bodega 8,400 m² con cuartos fríos · Parque Industrial El Marqués',
    'electrico_industrial', 'en_ejecucion',
    '2024-01-08', '2024-02-01', '2024-09-30',
    28400000.00, 26100000.00, 22800000.00, 21200000.00,
    'verde',
    'Proyecto adelantado vs plan. Entrega en 6 semanas.', TRUE
  )
  ON CONFLICT (empresa_id, codigo) DO NOTHING;

  -- Proyecto 3: Centro Comercial Pachuca (CIAE — gran obra con riesgo)
  INSERT INTO proyectos (
    empresa_id, cliente_id, codigo, nombre, descripcion, tipo, estado,
    fecha_contrato, fecha_inicio_planeado, fecha_fin_planeado,
    monto_contratado, monto_facturado, presupuesto_costo, costo_real,
    semaforo, observaciones, activo
  ) VALUES (
    v_emp_ciae, v_cli_mz, 'PRY-2024-035',
    'Centro Comercial Pachuca',
    'Plaza comercial 22,000 m² · 80 locales + estacionamiento',
    'electrico_industrial', 'en_ejecucion',
    '2024-03-20', '2024-04-15', '2025-12-15',
    91000000.00, 37300000.00, 75200000.00, 58700000.00,
    'rojo',
    'Sobrecosto 8% en cimentación. Cliente moroso (12 días vencido). Revisar.',
    TRUE
  )
  ON CONFLICT (empresa_id, codigo) DO NOTHING;

  -- Proyecto 4: Solar Banca Norte Hermosillo (PSE — solar comercial)
  INSERT INTO proyectos (
    empresa_id, cliente_id, codigo, nombre, descripcion, tipo, estado,
    fecha_contrato, fecha_inicio_planeado, fecha_fin_planeado,
    monto_contratado, monto_facturado, presupuesto_costo,
    semaforo, capacidad_kwp, observaciones, activo
  ) VALUES (
    v_emp_pse, v_cli_banca, 'PRY-2024-039',
    'Solar Sucursal Banca Norte · Hermosillo',
    'Sistema fotovoltaico 480 kWp en 12 sucursales · ahorro proyectado 38%',
    'solar_comercial', 'planeacion',
    '2024-04-10', '2024-05-20', '2024-12-15',
    12600000.00, 3100000.00, 10800000.00,
    'verde', 480.00,
    'Diseño aprobado, esperando arribo de inversores.', TRUE
  )
  ON CONFLICT (empresa_id, codigo) DO NOTHING;

  -- Proyecto 5: PTAR Tlalnepantla (CIAE — gubernamental)
  INSERT INTO proyectos (
    empresa_id, cliente_id, codigo, nombre, descripcion, tipo, estado,
    fecha_contrato, fecha_inicio_planeado, fecha_fin_planeado,
    monto_contratado, monto_facturado, presupuesto_costo,
    semaforo, observaciones, activo
  ) VALUES (
    v_emp_ciae, v_cli_mun, 'PRY-2024-041',
    'Planta Tratamiento Tlalnepantla',
    'PTAR 120 L/s · obra civil + equipo electromecánico',
    'electrico_industrial', 'planeacion',
    '2024-04-25', '2024-05-15', '2026-03-30',
    64500000.00, 5200000.00, 56000000.00,
    'amarillo',
    'Movimiento de tierras retrasado por permisos municipales.', TRUE
  )
  ON CONFLICT (empresa_id, codigo) DO NOTHING;

END $$;
