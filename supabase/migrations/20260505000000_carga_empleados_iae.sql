-- Carga de 13 empleados desde empleados.xlsx

DO $$
DECLARE
  v_emp_pse  UUID;
  v_emp_ciae UUID;
BEGIN
  SELECT id INTO v_emp_pse FROM empresas WHERE codigo = 'PSE';
  SELECT id INTO v_emp_ciae FROM empresas WHERE codigo = 'CIAE';

  -- 1. Ibrahim Garcia Enriquez (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '001', 'Ibrahim Garcia Enriquez', 'GAEI981107HSRRNB00',
    'GAEI981107K80', '23139819736',
    'i.garcia@ciae.com.mx', '(662) 401-5636', '1998-11-07'::DATE, '2023-01-24'::DATE,
    'masculino', 'soltero', 'planta'::categoria_personal, 'Ingenieria', 'Calidad', 533.23,
    '{"calle": "Voltaire", "numero_exterior": "6", "colonia": "Las Lomas", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83293"}'::JSONB, '{"cuenta": "151 049 8063", "clabe": "012180015104980631"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 2. Jesus Angel Meneses Gastelum (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '006', 'Jesus Angel Meneses Gastelum', 'MEGJ930127HSLNSS03',
    'MEGJ930127KH4', '24109302364',
    'jesus@ciae.com.mx', '(662) 168-2070', '1993-01-27'::DATE, '2022-04-01'::DATE,
    'masculino', 'casado', 'planta'::categoria_personal, 'Ingenieria', 'ingenieria', 776.99,
    '{"calle": "Alce", "numero_exterior": "49", "colonia": "Casa Linda", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83284"}'::JSONB, '{"cuenta": "2348237", "clabe": "002760903423482378"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 3. Noe Fernando Madrid Bahena (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '008', 'Noe Fernando Madrid Bahena', 'MABN981107HSLDHX07',
    'MABN981107JB1', '35179879735',
    'noe@ciae.com.mx', '(662) 307-3448', '1998-11-07'::DATE, '2023-01-01'::DATE,
    'masculino', 'soltero', 'planta'::categoria_personal, 'Ingenieria', 'ingenieria', 533.23,
    '{"calle": "Sonora", "numero_exterior": "208", "colonia": "V 8", "municipio": "Santa Ana", "estado": "Sonora", "cp": "84600"}'::JSONB, '{"cuenta": "155 755 6333", "clabe": "012180015575563331"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 4. Esmeralda Rascon Rivas (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '009', 'Esmeralda Rascon Rivas', 'RARE970817MSRSVS03',
    'RARE970817CR1', '01139736951',
    'esmeraldarascon43@gmail.com', '(662) 374-0695', '1997-08-17'::DATE, '2023-02-01'::DATE,
    'femenino', 'soltero', 'planta'::categoria_personal, 'Administrativo', 'administracion', 550.65,
    '{"calle": "Ejido", "numero_exterior": "46", "colonia": "El Apache", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83287"}'::JSONB, '{"cuenta": "1553006525", "clabe": "012760015530065252"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 5. Ivana Maria Villaseñor Ibarra (PSE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_pse, '010', 'Ivana Maria Villaseñor Ibarra', 'VIII960415MSRLBV05',
    'VIII960415JZ3', '08189622353',
    'ivana@psenergia.com.mx', '(662) 127-1491', '1996-04-15'::DATE, '2023-01-01'::DATE,
    'femenino', 'casado', 'planta'::categoria_personal, 'Ventas', 'ingenieria', 446.09,
    '{"calle": "Mision de Pitaqui", "numero_exterior": "1", "colonia": "Colina Blanca", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83148"}'::JSONB, '{"cuenta": "60-56142939-2", "clabe": "014760605614293921"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 6. Gabriela Acosta Ruiz (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '011', 'Gabriela Acosta Ruiz', 'AORG010117MSRCZBA6',
    'AORG010117EB3', '35160143729',
    'gabriela@ciae.com.mx', NULL, '2001-01-17'::DATE, '2023-06-05'::DATE,
    'femenino', 'soltero', 'planta'::categoria_personal, 'Cursos y Capacitaciones', 'ingenieria', 498.8,
    '{"calle": "Arroy Cuchujaqui", "numero_exterior": "7", "colonia": "Rio Grande", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83288"}'::JSONB, '{"cuenta": "4152 3138 1890 9272", "clabe": "012760015629061523"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 7. Joaquin Corella Puente (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '012', 'Joaquin Corella Puente', 'COPJ861202HSRRNQ06',
    'COPJ861202QX4', '24058647785',
    'joaquin@ciae.com.mx', NULL, '1986-12-02'::DATE, '2023-11-01'::DATE,
    'masculino', 'casado', 'planta'::categoria_personal, 'Cursos y Capacitaciones', 'ingenieria', 278.8,
    '{"calle": "2", "numero_exterior": "5", "colonia": "La Victoria", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83304"}'::JSONB, '{"cuenta": "0102262142", "clabe": "012760001022621422"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 8. Marcos Alberto Pedroza Rendon (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '013', 'Marcos Alberto Pedroza Rendon', 'PERM861027HSRDNR03',
    'PERM8610279H5', '24038630398',
    NULL, NULL, '1986-10-27'::DATE, '2023-11-13'::DATE,
    'masculino', 'casado', 'planta'::categoria_personal, 'Ventas', 'ingenieria', 278.8,
    '{"calle": "Calle de la Reforma", "numero_exterior": "218", "colonia": "Centenario", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83260"}'::JSONB, '{"clabe": "072760004461011892"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 9. Karina Alessandra Flores Alvarado (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '015', 'Karina Alessandra Flores Alvarado', 'FOAK010622MSRLLRA8',
    'FOAK010622M61', '58160107809',
    'kaalvarado54@gmail.com', '(622) 118-7006', '2001-06-22'::DATE, '2025-03-01'::DATE,
    'femenino', 'soltero', 'planta'::categoria_personal, 'Ingenieria', 'ingenieria', 349.84,
    '{"calle": "FELIPE BARSENAS", "numero_exterior": "SIN NUMERO", "numero_interior": "SIN NUMERO", "colonia": "PETROLERA", "municipio": "GUAYMAS", "estado": "Sonora", "cp": "85456"}'::JSONB, '{"cuenta": "4152 3140 5972 9148", "clabe": "012180015632777785"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 10. Jorge Francisco Robles Arvayo (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '016', 'Jorge Francisco Robles Arvayo', 'ROAJ980227HSRBRR03',
    'ROAJ9802276Y7', '64159815949',
    'Jorbles227@gmail.com', '(662) 111-8571', '1998-02-27'::DATE, '2025-03-01'::DATE,
    'masculino', 'soltero', 'planta'::categoria_personal, 'Ingenieria', 'ingenieria', 349.84,
    '{"calle": "PROYECTISTAS", "numero_exterior": "153", "colonia": "ALTARES RANCHO GRANDE", "municipio": "HERMOSILLO", "estado": "Sonora", "cp": "83296"}'::JSONB, '{"cuenta": "157 350 0091", "clabe": "012760015735000915"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 11. Ofelia Vanderly Napoles Mizrahi (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '017', 'Ofelia Vanderly Napoles Mizrahi', 'NAMO980725MSLPZF03',
    'NAMO980725LC6', '90149806615',
    'vanderlynm@gmail.com', NULL, '1998-07-25'::DATE, '2024-04-01'::DATE,
    'femenino', 'soltero', 'planta'::categoria_personal, 'Ingenieria', 'ingenieria', 365.53,
    '{"calle": "San Xavier", "numero_exterior": "113", "numero_interior": "SN", "colonia": "Tubac", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83117"}'::JSONB, '{"clabe": "072760012607830146"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 12. Andres Gutierrez Astiazaran (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '021', 'Andres Gutierrez Astiazaran', 'GUAA911206HSRTSN06',
    'GUAA911206657', '02209130620',
    NULL, NULL, '1991-12-06'::DATE, '2024-06-16'::DATE,
    'masculino', NULL, 'planta'::categoria_personal, 'Ingenieria', 'ingenieria', 278.8,
    '{"calle": "Doctor Aguilar", "numero_exterior": "113", "colonia": "Prados Del Centenario", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83260"}'::JSONB, '{"cuenta": "1151098469", "clabe": "072760011510984698"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

  -- 13. LUCINA RUIZ PANTALEON (CIAE)
  INSERT INTO empleados (
    empresa_id, numero_empleado, nombre_completo, curp, rfc, nss,
    email_personal, telefono, fecha_nacimiento, fecha_ingreso,
    genero, estado_civil, categoria, puesto, area, salario_base,
    domicilio, cuenta_bancaria, activo
  ) VALUES (
    v_emp_ciae, '030', 'LUCINA RUIZ PANTALEON', 'RUPL810630MOCZNC06',
    'RUPL810630SX0', '24028121069',
    'lruiz@ciae.com.mx', NULL, '1981-06-30'::DATE, '2025-04-01'::DATE,
    'femenino', 'soltero', 'planta'::categoria_personal, 'Administrativo', NULL, 568.04,
    '{"calle": "Cezzane", "numero_exterior": "77", "colonia": "Soleil Residencial", "municipio": "Hermosillo", "estado": "Sonora", "cp": "83287"}'::JSONB, '{"cuenta": "4152 3136 3880 4109", "clabe": "012760015293424541"}'::JSONB, TRUE
  ) ON CONFLICT (curp) DO UPDATE SET
    empresa_id = EXCLUDED.empresa_id,
    numero_empleado = EXCLUDED.numero_empleado,
    nombre_completo = EXCLUDED.nombre_completo,
    rfc = COALESCE(EXCLUDED.rfc, empleados.rfc),
    nss = COALESCE(EXCLUDED.nss, empleados.nss),
    email_personal = COALESCE(EXCLUDED.email_personal, empleados.email_personal),
    telefono = COALESCE(EXCLUDED.telefono, empleados.telefono),
    fecha_nacimiento = COALESCE(EXCLUDED.fecha_nacimiento, empleados.fecha_nacimiento),
    fecha_ingreso = EXCLUDED.fecha_ingreso,
    genero = COALESCE(EXCLUDED.genero, empleados.genero),
    estado_civil = COALESCE(EXCLUDED.estado_civil, empleados.estado_civil),
    puesto = EXCLUDED.puesto,
    area = EXCLUDED.area,
    salario_base = EXCLUDED.salario_base,
    domicilio = EXCLUDED.domicilio,
    cuenta_bancaria = EXCLUDED.cuenta_bancaria,
    activo = EXCLUDED.activo,
    updated_at = NOW();

END $$;
