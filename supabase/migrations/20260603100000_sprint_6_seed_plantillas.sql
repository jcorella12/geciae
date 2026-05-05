-- ============================================================================
-- Seed Sprint 6: etapas + tareas + documentos por plantilla
-- ============================================================================
-- PSE Solar Residencial: 5 etapas (levantamiento, diseño, contrato, instalación, CFE).
-- PSE Solar Comercial: 5 etapas similares + análisis demanda.
-- PSE Solar Industrial: 6 etapas (incluye estudios CFE MT).
-- Limson Mantenimiento Contractual: onboarding + 4 visitas + cierre.
-- Limson Servicio Puntual: diagnóstico + reparación + entrega.
-- Limson Instalación Externa: similar a comercial sin CFE.
-- ============================================================================

-- Helper para insertar tareas dentro de una etapa por código de plantilla
DO $$
DECLARE
  e_id UUID;
BEGIN
  -- ===== PSE Solar Residencial =====
  INSERT INTO plantilla_etapas (plantilla_codigo, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion)
  VALUES
    ('solar_residencial', 1, 'Levantamiento técnico', 'Visita al sitio, evaluación, propuesta inicial.', 5, FALSE, NULL),
    ('solar_residencial', 2, 'Diseño + cotización', 'Diseño eléctrico + propuesta económica firme.', 7, FALSE, NULL),
    ('solar_residencial', 3, 'Contrato firmado', 'Cliente firma + anticipo.', 3, TRUE, 30.00),
    ('solar_residencial', 4, 'Instalación física', 'Montaje paneles + cableado + inversor + puesta marcha.', 30, TRUE, 60.00),
    ('solar_residencial', 5, 'Trámites CFE NetMet', 'Documentación + interconexión + cambio de medidor.', 45, TRUE, 10.00)
  ON CONFLICT (plantilla_codigo, numero) DO NOTHING;

  -- Tareas Etapa 1 Residencial
  SELECT id INTO e_id FROM plantilla_etapas WHERE plantilla_codigo = 'solar_residencial' AND numero = 1;
  INSERT INTO plantilla_tareas (etapa_id, numero, titulo, descripcion, rol_responsable, obligatoria, bloquea_avance) VALUES
    (e_id, 1, 'Confirmar 3-partes (cliente/ventas/ingeniería)', NULL, 'vendedor', TRUE, TRUE),
    (e_id, 2, 'Visita técnica + fotos', 'Aplicar checklist 6 pasos', 'ingenieria', TRUE, TRUE),
    (e_id, 3, 'Recibo CFE últimos 6 meses', 'Para análisis demanda', 'vendedor', TRUE, TRUE),
    (e_id, 4, 'INE/RFC del titular', NULL, 'vendedor', TRUE, FALSE)
  ON CONFLICT (etapa_id, numero) DO NOTHING;

  -- Tareas Etapa 2 Residencial
  SELECT id INTO e_id FROM plantilla_etapas WHERE plantilla_codigo = 'solar_residencial' AND numero = 2;
  INSERT INTO plantilla_tareas (etapa_id, numero, titulo, rol_responsable, obligatoria, bloquea_avance) VALUES
    (e_id, 1, 'Diseño preliminar (kWp, paneles, inversor)', 'ingenieria', TRUE, TRUE),
    (e_id, 2, 'Cotización en sistema (CRM)', 'vendedor', TRUE, TRUE),
    (e_id, 3, 'Presentación + cierre con cliente', 'vendedor', TRUE, FALSE)
  ON CONFLICT (etapa_id, numero) DO NOTHING;

  -- Tareas Etapa 3 Residencial
  SELECT id INTO e_id FROM plantilla_etapas WHERE plantilla_codigo = 'solar_residencial' AND numero = 3;
  INSERT INTO plantilla_tareas (etapa_id, numero, titulo, rol_responsable, obligatoria, bloquea_avance) VALUES
    (e_id, 1, 'Contrato firmado físico/digital', 'vendedor', TRUE, TRUE),
    (e_id, 2, 'Anticipo recibido y conciliado', 'finanzas', TRUE, TRUE),
    (e_id, 3, 'Programar fecha de instalación', 'pm', TRUE, FALSE)
  ON CONFLICT (etapa_id, numero) DO NOTHING;

  -- Tareas Etapa 4 Residencial
  SELECT id INTO e_id FROM plantilla_etapas WHERE plantilla_codigo = 'solar_residencial' AND numero = 4;
  INSERT INTO plantilla_tareas (etapa_id, numero, titulo, rol_responsable, obligatoria, bloquea_avance) VALUES
    (e_id, 1, 'Compra de materiales (OC)', 'pm', TRUE, TRUE),
    (e_id, 2, 'Cuadrilla en sitio (uniforme + EPP)', 'pm', TRUE, TRUE),
    (e_id, 3, 'Instalación montaje + cableado', 'cuadrilla', TRUE, TRUE),
    (e_id, 4, 'Puesta en marcha + monitoreo inicial', 'ingenieria', TRUE, TRUE),
    (e_id, 5, 'Acta entrega-recepción firmada', 'pm', TRUE, TRUE),
    (e_id, 6, 'Cobro hito 60% confirmado', 'finanzas', TRUE, TRUE)
  ON CONFLICT (etapa_id, numero) DO NOTHING;

  -- Tareas Etapa 5 Residencial (CFE)
  SELECT id INTO e_id FROM plantilla_etapas WHERE plantilla_codigo = 'solar_residencial' AND numero = 5;
  INSERT INTO plantilla_tareas (etapa_id, numero, titulo, rol_responsable, obligatoria, bloquea_avance) VALUES
    (e_id, 1, 'Solicitud interconexión CFE', 'verificador', TRUE, TRUE),
    (e_id, 2, 'Verificación UVIE (si aplica)', 'verificador', FALSE, FALSE),
    (e_id, 3, 'Cambio medidor bidireccional', 'verificador', TRUE, TRUE),
    (e_id, 4, 'Cobro final 10% + entrega expediente', 'finanzas', TRUE, TRUE)
  ON CONFLICT (etapa_id, numero) DO NOTHING;

  -- ===== PSE Solar Comercial (estructura similar, escalada) =====
  INSERT INTO plantilla_etapas (plantilla_codigo, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion) VALUES
    ('solar_comercial', 1, 'Análisis de demanda + levantamiento', NULL, 7, FALSE, NULL),
    ('solar_comercial', 2, 'Diseño + cotización ejecutiva', NULL, 14, FALSE, NULL),
    ('solar_comercial', 3, 'Contrato + anticipo', NULL, 7, TRUE, 30.00),
    ('solar_comercial', 4, 'Instalación', NULL, 45, TRUE, 60.00),
    ('solar_comercial', 5, 'Trámites CFE comercial + cierre', NULL, 60, TRUE, 10.00)
  ON CONFLICT (plantilla_codigo, numero) DO NOTHING;

  -- ===== PSE Solar Industrial =====
  INSERT INTO plantilla_etapas (plantilla_codigo, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion) VALUES
    ('solar_industrial', 1, 'Estudios eléctricos preliminares', 'Demanda HM/HS, factor potencia, calidad de energía', 14, FALSE, NULL),
    ('solar_industrial', 2, 'Ingeniería ejecutiva', 'Diseño detallado + planos as-design + memoria de cálculo', 30, FALSE, NULL),
    ('solar_industrial', 3, 'Contrato + anticipo + permisos', NULL, 14, TRUE, 25.00),
    ('solar_industrial', 4, 'Procura', 'Compra equipos críticos (paneles, inversores, transformador)', 60, TRUE, 30.00),
    ('solar_industrial', 5, 'Instalación + interconexión MT', NULL, 90, TRUE, 35.00),
    ('solar_industrial', 6, 'Pruebas + entrega + CFE', NULL, 60, TRUE, 10.00)
  ON CONFLICT (plantilla_codigo, numero) DO NOTHING;

  -- ===== Limson Mantenimiento Contractual =====
  INSERT INTO plantilla_etapas (plantilla_codigo, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion) VALUES
    ('limson_mantenimiento_contractual', 1, 'Onboarding', 'Inspección inicial + plan anual + cliente firma', 7, TRUE, 25.00),
    ('limson_mantenimiento_contractual', 2, 'Visita 1 (mes 1)', NULL, 1, TRUE, 18.75),
    ('limson_mantenimiento_contractual', 3, 'Visita 2 (mes 4)', NULL, 1, TRUE, 18.75),
    ('limson_mantenimiento_contractual', 4, 'Visita 3 (mes 7)', NULL, 1, TRUE, 18.75),
    ('limson_mantenimiento_contractual', 5, 'Visita 4 (mes 10)', NULL, 1, TRUE, 18.75),
    ('limson_mantenimiento_contractual', 6, 'Cierre anual + reporte', NULL, 7, TRUE, 0.00)
  ON CONFLICT (plantilla_codigo, numero) DO NOTHING;

  SELECT id INTO e_id FROM plantilla_etapas WHERE plantilla_codigo = 'limson_mantenimiento_contractual' AND numero = 1;
  INSERT INTO plantilla_tareas (etapa_id, numero, titulo, rol_responsable, obligatoria, bloquea_avance) VALUES
    (e_id, 1, 'Inspección inicial completa', 'ingenieria', TRUE, TRUE),
    (e_id, 2, 'Generar plan anual personalizado', 'pm', TRUE, TRUE),
    (e_id, 3, 'Cliente firma contrato anual', 'vendedor', TRUE, TRUE)
  ON CONFLICT (etapa_id, numero) DO NOTHING;

  -- ===== Limson Servicio Puntual =====
  INSERT INTO plantilla_etapas (plantilla_codigo, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion) VALUES
    ('limson_servicio_puntual', 1, 'Diagnóstico', NULL, 1, FALSE, NULL),
    ('limson_servicio_puntual', 2, 'Reparación / servicio', NULL, 1, FALSE, NULL),
    ('limson_servicio_puntual', 3, 'Entrega + cobro 100%', NULL, 1, TRUE, 100.00)
  ON CONFLICT (plantilla_codigo, numero) DO NOTHING;

  -- ===== Limson Instalación Externa =====
  INSERT INTO plantilla_etapas (plantilla_codigo, numero, nombre, descripcion, duracion_estimada_dias, hito_facturacion, porcentaje_facturacion) VALUES
    ('limson_instalacion_externa', 1, 'Levantamiento técnico', NULL, 5, FALSE, NULL),
    ('limson_instalacion_externa', 2, 'Diseño + cotización', NULL, 7, FALSE, NULL),
    ('limson_instalacion_externa', 3, 'Contrato + anticipo', NULL, 3, TRUE, 30.00),
    ('limson_instalacion_externa', 4, 'Instalación', NULL, 30, TRUE, 60.00),
    ('limson_instalacion_externa', 5, 'Verificación final + entrega', NULL, 7, TRUE, 10.00)
  ON CONFLICT (plantilla_codigo, numero) DO NOTHING;
END $$;

-- ===== Documentos requeridos por plantilla =====

INSERT INTO plantilla_documentos (plantilla_codigo, codigo_documento, nombre, obligatorio, requerido_para_estado, rol_responsable)
VALUES
  -- PSE Residencial
  ('solar_residencial', 'CONTRATO', 'Contrato firmado', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_residencial', 'INE_TITULAR', 'INE del titular', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_residencial', 'CFE_RECIBO', 'Último recibo CFE', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_residencial', 'PLANO_AS_BUILT', 'Plano as-built', TRUE, 'entregado', 'ingenieria'),
  ('solar_residencial', 'ACTA_ENTREGA', 'Acta entrega-recepción', TRUE, 'entregado', 'pm'),
  ('solar_residencial', 'CFE_INTERCONEXION', 'Constancia interconexión CFE', TRUE, 'entregado', 'verificador'),
  -- PSE Comercial
  ('solar_comercial', 'CONTRATO', 'Contrato firmado', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_comercial', 'CSF_CLIENTE', 'CSF del cliente', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_comercial', 'CFE_RECIBO_12M', 'Recibos CFE últimos 12 meses', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_comercial', 'PROYECTO_EJECUTIVO', 'Proyecto ejecutivo eléctrico', TRUE, 'en_ejecucion', 'ingenieria'),
  ('solar_comercial', 'PLANO_AS_BUILT', 'Plano as-built', TRUE, 'entregado', 'ingenieria'),
  ('solar_comercial', 'ACTA_ENTREGA', 'Acta entrega-recepción', TRUE, 'entregado', 'pm'),
  ('solar_comercial', 'CFE_INTERCONEXION', 'Constancia interconexión CFE', TRUE, 'entregado', 'verificador'),
  -- PSE Industrial
  ('solar_industrial', 'CONTRATO', 'Contrato firmado', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_industrial', 'CSF_CLIENTE', 'CSF del cliente', TRUE, 'contrato_firmado', 'vendedor'),
  ('solar_industrial', 'ESTUDIO_CALIDAD', 'Estudio de calidad de energía', TRUE, 'planeacion', 'ingenieria'),
  ('solar_industrial', 'MEMORIA_CALCULO', 'Memoria de cálculo eléctrico', TRUE, 'en_ejecucion', 'ingenieria'),
  ('solar_industrial', 'DICTAMEN_UVIE', 'Dictamen UVIE NOM-001', TRUE, 'entregado', 'verificador'),
  ('solar_industrial', 'PLANO_AS_BUILT', 'Plano as-built', TRUE, 'entregado', 'ingenieria'),
  ('solar_industrial', 'ACTA_ENTREGA', 'Acta entrega-recepción', TRUE, 'entregado', 'pm'),
  ('solar_industrial', 'CFE_INTERCONEXION', 'Constancia interconexión MT', TRUE, 'entregado', 'verificador'),
  -- Limson Contractual
  ('limson_mantenimiento_contractual', 'CONTRATO_ANUAL', 'Contrato anual firmado', TRUE, 'contrato_firmado', 'vendedor'),
  ('limson_mantenimiento_contractual', 'INSPECCION_INICIAL', 'Reporte inspección inicial', TRUE, 'planeacion', 'ingenieria'),
  ('limson_mantenimiento_contractual', 'PLAN_ANUAL', 'Plan anual personalizado', TRUE, 'planeacion', 'pm'),
  -- Limson Puntual
  ('limson_servicio_puntual', 'ORDEN_SERVICIO', 'Orden de servicio firmada', TRUE, 'contrato_firmado', 'vendedor'),
  ('limson_servicio_puntual', 'ACTA_ENTREGA', 'Acta de entrega', TRUE, 'entregado', 'pm'),
  -- Limson Externa
  ('limson_instalacion_externa', 'CONTRATO', 'Contrato firmado', TRUE, 'contrato_firmado', 'vendedor'),
  ('limson_instalacion_externa', 'PLANO_AS_BUILT', 'Plano as-built', TRUE, 'entregado', 'ingenieria'),
  ('limson_instalacion_externa', 'ACTA_ENTREGA', 'Acta entrega-recepción', TRUE, 'entregado', 'pm')
ON CONFLICT (plantilla_codigo, codigo_documento) DO NOTHING;

-- ===== SGC documentos seed (mínimos) =====
INSERT INTO sgc_documentos (tipo, codigo, nombre, area, vigente)
VALUES
  ('FP', 'FP-001', 'Proceso comercial — venta de proyecto solar', 'comercial', TRUE),
  ('FP', 'FP-002', 'Proceso ingeniería — diseño y ejecución', 'ingenieria', TRUE),
  ('FP', 'FP-003', 'Proceso financiero — cobranza y pagos', 'finanzas', TRUE),
  ('FO', 'FO-001', 'Solicitud de levantamiento técnico', 'comercial', TRUE),
  ('FO', 'FO-002', 'Acta de entrega-recepción', 'pm', TRUE),
  ('FO', 'FO-003', 'Reporte mensual cliente', 'pm', TRUE),
  ('MA', 'MA-001', 'Manual de la organización', 'direccion', TRUE),
  ('PO', 'PO-001', 'Procedimiento control de cambios', 'calidad', TRUE)
ON CONFLICT (tipo, codigo) DO NOTHING;
