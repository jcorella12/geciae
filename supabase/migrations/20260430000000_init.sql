-- ============================================================================
-- Sistema ERP Grupo PSENERGIA - Esquema Detallado
-- ============================================================================
-- Este archivo es DDL ejecutable en Supabase / PostgreSQL 15+.
-- Se debe ejecutar en orden, con extensiones primero.
-- ============================================================================

-- ============================================================================
-- EXTENSIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Para búsqueda full-text
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- Para normalización en búsqueda

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE rol_usuario AS ENUM ('ceo', 'director', 'operativo', 'empleado', 'cliente');

CREATE TYPE categoria_personal AS ENUM ('planta', 'por_obra', 'repse');

CREATE TYPE estado_proyecto AS ENUM (
  'cotizacion',
  'contrato_firmado',
  'planeacion',
  'en_ejecucion',
  'en_cierre',
  'entregado',
  'en_om',
  'cerrado',
  'cancelado'
);

CREATE TYPE estado_oportunidad AS ENUM (
  'lead',
  'calificado',
  'visita_tecnica',
  'cotizacion_proceso',
  'cotizacion_enviada',
  'negociacion',
  'ganado',
  'perdido'
);

CREATE TYPE estado_oc AS ENUM (
  'borrador',
  'pendiente_aprobacion',
  'aprobada',
  'enviada',
  'parcial_recibida',
  'recibida',
  'pagada',
  'cancelada'
);

CREATE TYPE estado_ot AS ENUM (
  'solicitada',
  'aprobada',
  'en_proceso',
  'completada_origen',
  'confirmada_destino',
  'lista_cobrar',
  'facturada',
  'cobrada',
  'cancelada'
);

CREATE TYPE estado_cfdi AS ENUM (
  'borrador',
  'timbrado',
  'enviado_cliente',
  'pagado',
  'cancelado'
);

CREATE TYPE tipo_cfdi AS ENUM (
  'ingreso',
  'egreso',  -- Nota de crédito
  'traslado',  -- Carta porte
  'pago',  -- Complemento de pago
  'nomina'  -- CFDI de nómina recibido
);

CREATE TYPE estado_prestamo AS ENUM (
  'solicitado',
  'aprobado',
  'ejecutado',
  'confirmado',
  'pagado_total',
  'pagado_parcial',
  'cancelado'
);

CREATE TYPE severidad_no_conformidad AS ENUM (
  'observacion',
  'menor',
  'mayor'
);

CREATE TYPE estado_no_conformidad AS ENUM (
  'abierta',
  'en_analisis',
  'en_accion',
  'cerrada',
  'reabierta'
);

CREATE TYPE nivel_autonomia_ia AS ENUM ('verde', 'amarillo', 'rojo');

CREATE TYPE estado_capacitacion AS ENUM (
  'inscrito',
  'en_proceso',
  'completado',
  'reprobado',
  'no_asistio'
);

CREATE TYPE estado_ticket AS ENUM (
  'abierto',
  'en_proceso',
  'esperando_cliente',
  'resuelto',
  'cerrado'
);

CREATE TYPE prioridad_ticket AS ENUM ('baja', 'media', 'alta', 'critica');

-- ============================================================================
-- TABLAS RAÍZ DE MULTI-TENANCY
-- ============================================================================

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  rfc TEXT NOT NULL UNIQUE,
  curp TEXT,  -- Si persona física
  regimen_fiscal TEXT NOT NULL,  -- Código SAT
  cp_fiscal TEXT NOT NULL,
  direccion_fiscal JSONB,  -- {calle, numero, colonia, municipio, estado, pais}
  representante_legal TEXT,
  rfc_representante TEXT,
  curp_representante TEXT,
  identidad_visual JSONB,  -- {logo_url, color_primario, color_secundario}
  configuracion JSONB,  -- Configuración específica
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unidades_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE TABLE usuarios_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  rol rol_usuario NOT NULL,
  atributos TEXT[] DEFAULT '{}',
  configuracion_atributos JSONB DEFAULT '{}'::JSONB,
  puesto TEXT,
  activo BOOLEAN DEFAULT TRUE,
  desde DATE NOT NULL DEFAULT CURRENT_DATE,
  hasta DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, empresa_id)
);

CREATE INDEX idx_usuarios_empresas_usuario ON usuarios_empresas(usuario_id) WHERE activo = TRUE;
CREATE INDEX idx_usuarios_empresas_empresa ON usuarios_empresas(empresa_id) WHERE activo = TRUE;

-- ============================================================================
-- TABLAS DE CLIENTES
-- ============================================================================

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  rfc TEXT NOT NULL,
  curp TEXT,  -- Si persona física
  regimen_fiscal TEXT,
  uso_cfdi_default TEXT,  -- G03, P01, etc.
  cp_fiscal TEXT,
  direccion_fiscal JSONB,
  direccion_entrega JSONB,
  email_facturacion TEXT,
  tipo TEXT,  -- residencial, comercial, industrial, gubernamental
  segmento TEXT,
  cuenta_bancaria JSONB,  -- Para devoluciones
  observaciones TEXT,
  riesgo TEXT DEFAULT 'bajo',  -- bajo, medio, alto
  score_pago NUMERIC(3,2) DEFAULT 0.5,  -- 0-1, 1 = pagador perfecto
  score_satisfaccion NUMERIC(3,2),  -- 0-1
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfc)
);

CREATE TABLE contactos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  puesto TEXT,
  email TEXT,
  telefono TEXT,
  whatsapp TEXT,
  tipo TEXT,  -- comercial, tecnico, cuentas_pagar, otro
  es_principal BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relación cliente-empresa: con qué empresas del grupo opera el cliente
CREATE TABLE clientes_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  fecha_primera_operacion DATE,
  vendedor_asignado_id UUID REFERENCES auth.users(id),
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(cliente_id, empresa_id)
);

-- ============================================================================
-- TABLAS DE PROVEEDORES
-- ============================================================================

CREATE TABLE proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  rfc TEXT NOT NULL,
  curp TEXT,
  regimen_fiscal TEXT,
  cp_fiscal TEXT,
  direccion_fiscal JSONB,
  representante_legal TEXT,
  rfc_representante TEXT,
  beneficiario_controlador JSONB,  -- {nombre, curp, fecha_nacimiento, nacionalidad}
  tipo_proveedor TEXT,  -- materiales, servicios, subcontratista, transportista, etc.
  categoria_sat TEXT,
  cuenta_bancaria JSONB,  -- {clabe, banco, titular}
  clasificacion_interna TEXT,  -- estrategico, importante, recurrente, ocasional
  requiere_repse BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  semaforo TEXT DEFAULT 'verde',  -- verde, amarillo, rojo, negro
  evaluacion_promedio NUMERIC(3,2),
  esta_aprobado BOOLEAN DEFAULT FALSE,
  fecha_aprobacion DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfc)
);

CREATE TABLE contactos_proveedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  puesto TEXT,
  email TEXT,
  telefono TEXT,
  tipo TEXT,
  es_principal BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proveedores_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  fecha_primera_operacion DATE,
  activo BOOLEAN DEFAULT TRUE,
  UNIQUE(proveedor_id, empresa_id)
);

CREATE TABLE proveedores_documentacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,  -- csf, opinion_32d, repse, lista_69b, identificacion_legal, etc.
  url_archivo TEXT,
  fecha_emision DATE,
  fecha_vencimiento DATE,
  numero_referencia TEXT,
  observaciones TEXT,
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prov_doc_vencimiento ON proveedores_documentacion(fecha_vencimiento) WHERE activo = TRUE;

CREATE TABLE proveedores_evaluaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  criterios JSONB,  -- {tiempos_entrega: 8, calidad: 9, ...}
  calificacion_total NUMERIC(3,2),
  observaciones TEXT,
  evaluado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE proveedores_personal_repse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id),  -- A qué empresa del grupo está asignado
  proyecto_id UUID,  -- Opcional: proyecto específico
  nombre_completo TEXT NOT NULL,
  curp TEXT,
  nss TEXT,
  puesto TEXT,
  fecha_inicio DATE,
  fecha_fin DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE EMPLEADOS
-- ============================================================================

CREATE TABLE empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  usuario_id UUID REFERENCES auth.users(id),  -- NULL si no tiene cuenta
  numero_empleado TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  rfc TEXT,
  curp TEXT NOT NULL,
  nss TEXT,
  fecha_nacimiento DATE,
  genero TEXT,
  estado_civil TEXT,
  email_personal TEXT,
  telefono TEXT,
  whatsapp TEXT,
  domicilio JSONB,
  contacto_emergencia JSONB,
  categoria categoria_personal NOT NULL,
  puesto TEXT NOT NULL,
  area TEXT,
  jefe_directo_id UUID REFERENCES empleados(id),
  fecha_ingreso DATE NOT NULL,
  fecha_baja DATE,
  motivo_baja TEXT,
  cuenta_bancaria JSONB,
  salario_base NUMERIC(12,2),
  prestaciones JSONB,
  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero_empleado),
  UNIQUE(curp)
);

CREATE INDEX idx_empleados_empresa ON empleados(empresa_id) WHERE activo = TRUE;
CREATE INDEX idx_empleados_usuario ON empleados(usuario_id) WHERE usuario_id IS NOT NULL;

CREATE TABLE contratos_laborales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- indeterminado, por_obra, periodo_prueba, capacitacion_inicial
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,  -- Para por_obra
  obra_o_proyecto TEXT,  -- Para por_obra
  url_pdf_firmado TEXT,
  fecha_firma TIMESTAMPTZ,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vacaciones_solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- vacaciones, permiso_con_goce, permiso_sin_goce, incapacidad
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias INTEGER NOT NULL,
  motivo TEXT,
  estado TEXT DEFAULT 'pendiente',  -- pendiente, aprobada, rechazada, cancelada
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  url_incapacidad TEXT,  -- Para incapacidades
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evaluaciones_desempeno (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  evaluador_id UUID NOT NULL REFERENCES auth.users(id),
  criterios JSONB,
  calificacion_total NUMERIC(3,2),
  fortalezas TEXT,
  areas_oportunidad TEXT,
  plan_desarrollo TEXT,
  comentarios_empleado TEXT,
  fecha_completada DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE finiquitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
  fecha_baja DATE NOT NULL,
  motivo_baja TEXT NOT NULL,
  camino_cierre TEXT,  -- privada, reforzada, ratificada
  conceptos JSONB,  -- Detalle de cálculo
  total_neto NUMERIC(12,2) NOT NULL,
  url_convenio_terminacion TEXT,
  url_recibo_finiquito TEXT,
  fecha_pago DATE,
  estado TEXT DEFAULT 'borrador',  -- borrador, aprobado, pagado, ratificado
  aprobado_por UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bolsa_talento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES empleados(id),  -- Si vino de empleado anterior
  nombre_completo TEXT NOT NULL,
  curp TEXT,
  rfc TEXT,
  email TEXT,
  telefono TEXT,
  especialidades TEXT[],
  ubicacion TEXT,
  evaluacion_cierre NUMERIC(3,2),
  recomendado_volver_contratar BOOLEAN,
  observaciones TEXT,
  disponible BOOLEAN DEFAULT TRUE,
  fecha_disponibilidad DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  modalidad TEXT,  -- presencial, online, mixto
  duracion_horas NUMERIC(5,1),
  instructor_id UUID REFERENCES auth.users(id),
  instructor_externo TEXT,
  costo NUMERIC(10,2),
  genera_dc3 BOOLEAN DEFAULT FALSE,
  vigencia_constancia_meses INTEGER,
  obligatorio_para_puestos TEXT[],
  catalogo_publico BOOLEAN DEFAULT FALSE,  -- Si es del catálogo de CIAE Capacitación para externos
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE empleados_capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  capacitacion_id UUID NOT NULL REFERENCES capacitaciones(id),
  fecha_programada DATE,
  fecha_inicio DATE,
  fecha_fin DATE,
  estado estado_capacitacion DEFAULT 'inscrito',
  calificacion_pre NUMERIC(5,2),
  calificacion_post NUMERIC(5,2),
  fecha_evaluacion_eficacia DATE,
  resultado_eficacia TEXT,
  url_constancia TEXT,
  fecha_vencimiento DATE,  -- Calculado de fecha_fin + vigencia
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activos_asignados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- vehiculo, epp, equipo_medicion, herramienta, uniforme
  descripcion TEXT NOT NULL,
  identificador TEXT,  -- Placa, número de serie, etc.
  fecha_asignacion DATE NOT NULL,
  fecha_devolucion DATE,
  observaciones TEXT,
  fecha_proximo_servicio DATE,
  fecha_proxima_calibracion DATE,
  fecha_proxima_reposicion DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE viajes_solicitudes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  proyecto_id UUID,
  destino TEXT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT NOT NULL,
  presupuesto_estimado NUMERIC(10,2),
  anticipo_otorgado NUMERIC(10,2),
  total_comprobado NUMERIC(10,2),
  estado TEXT DEFAULT 'solicitado',  -- solicitado, aprobado, en_curso, completado, comprobado
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  reporte TEXT,
  comprobantes JSONB,  -- Array de {url, monto, concepto, lugar, cfdi_uuid}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE PROYECTOS Y OPERACIÓN
-- ============================================================================

CREATE TABLE proyectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  unidad_negocio_id UUID REFERENCES unidades_negocio(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT,  -- solar_residencial, solar_comercial, solar_industrial, electrico_industrial, mantenimiento_solar, capacitacion, certificacion, etc.
  oportunidad_id UUID,  -- Origen comercial
  vendedor_id UUID REFERENCES auth.users(id),
  pm_id UUID REFERENCES auth.users(id),
  fecha_contrato DATE,
  fecha_inicio_planeado DATE,
  fecha_fin_planeado DATE,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  estado estado_proyecto DEFAULT 'cotizacion',
  monto_contratado NUMERIC(14,2),
  monto_facturado NUMERIC(14,2) DEFAULT 0,
  monto_cobrado NUMERIC(14,2) DEFAULT 0,
  saldo_pendiente NUMERIC(14,2),
  presupuesto_costo NUMERIC(14,2),
  costo_real NUMERIC(14,2) DEFAULT 0,
  semaforo TEXT DEFAULT 'verde',
  semaforo_razon TEXT,
  ubicacion JSONB,  -- {direccion, lat, lng}
  capacidad_kwp NUMERIC(10,2),  -- Para solar
  cadencia_reporte_cliente TEXT,  -- diario, semanal, quincenal, mensual, hitos, ninguno
  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE INDEX idx_proyectos_empresa ON proyectos(empresa_id);
CREATE INDEX idx_proyectos_cliente ON proyectos(cliente_id);
CREATE INDEX idx_proyectos_pm ON proyectos(pm_id) WHERE estado IN ('en_ejecucion', 'planeacion', 'en_cierre');
CREATE INDEX idx_proyectos_estado ON proyectos(estado);

CREATE TABLE proyectos_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL,
  fecha_inicio_planeado DATE,
  fecha_fin_planeado DATE,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  porcentaje_avance NUMERIC(5,2) DEFAULT 0,
  es_hito BOOLEAN DEFAULT FALSE,
  monto_facturable NUMERIC(12,2),  -- Si es hito de facturación
  facturado BOOLEAN DEFAULT FALSE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  etapa_id UUID REFERENCES proyectos_etapas(id),
  codigo TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  asignado_id UUID REFERENCES auth.users(id),
  cuadrilla_id UUID,  -- Referencia futura a cuadrillas
  fecha_inicio_planeado DATE,
  fecha_fin_planeado DATE,
  fecha_inicio_real DATE,
  fecha_fin_real DATE,
  duracion_estimada_horas NUMERIC(6,2),
  duracion_real_horas NUMERIC(6,2),
  estado TEXT DEFAULT 'por_hacer',  -- por_hacer, en_proceso, en_revision, completada, bloqueada
  prioridad INTEGER DEFAULT 3,  -- 1-5
  dependencias UUID[],  -- IDs de tareas predecesoras
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bitacoras_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  clima JSONB,  -- {temperatura, condicion, viento}
  personal_en_sitio JSONB,  -- Lista de empleados/cuadrillas
  trabajos_realizados TEXT,
  materiales_consumidos JSONB,
  visitas_externas TEXT,
  incidentes JSONB,  -- Array de {descripcion, gravedad, acciones, fotos}
  observaciones_cliente TEXT,
  pendientes_manana TEXT,
  notas_internas TEXT,
  notas_oficiales TEXT,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  validado_por UUID REFERENCES auth.users(id),
  fecha_validacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(proyecto_id, fecha)
);

CREATE TABLE fotos_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  bitacora_id UUID REFERENCES bitacoras_obra(id),
  url_archivo TEXT NOT NULL,
  url_thumbnail TEXT,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  capturado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ubicacion JSONB,  -- {lat, lng, accuracy}
  etiquetas TEXT[],
  etapa TEXT,
  descripcion TEXT,
  compartible_con_cliente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fotos_proyecto ON fotos_obra(proyecto_id);
CREATE INDEX idx_fotos_etiquetas ON fotos_obra USING GIN(etiquetas);

CREATE TABLE mediciones_protocolos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  norma_aplicable TEXT,  -- NOM-001-SEDE, NMX-J-643, etc.
  tipo_proyecto TEXT[],
  pasos JSONB,  -- Array de {paso, instruccion, medicion_a_capturar, valores_aceptables}
  equipos_requeridos JSONB,
  criterios_aprobacion JSONB,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mediciones_ejecuciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  protocolo_id UUID NOT NULL REFERENCES mediciones_protocolos(id),
  ejecutado_por UUID NOT NULL REFERENCES auth.users(id),
  fecha_ejecucion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resultados JSONB,  -- Mediciones capturadas
  resultado_global TEXT,  -- aprobado, aprobado_con_observaciones, rechazado
  observaciones TEXT,
  url_reporte_pdf TEXT,
  testigo_cliente TEXT,
  firma_cliente TEXT,  -- URL o base64
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE dossier_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  seccion TEXT NOT NULL,  -- contractual, diseno, permisos, procura, bitacora, pruebas, entrega, garantias, financiero
  nombre TEXT NOT NULL,
  descripcion TEXT,
  url_archivo TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  es_compartible_cliente BOOLEAN DEFAULT FALSE,
  subido_por UUID REFERENCES auth.users(id),
  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dossier_proyecto ON dossier_documentos(proyecto_id);
CREATE INDEX idx_dossier_seccion ON dossier_documentos(proyecto_id, seccion);

CREATE TABLE reportes_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- avance, hito, cierre, ad_hoc
  periodo_inicio DATE,
  periodo_fin DATE,
  contenido JSONB,
  url_pdf TEXT,
  generado_por UUID REFERENCES auth.users(id),
  enviado_a_cliente BOOLEAN DEFAULT FALSE,
  fecha_envio TIMESTAMPTZ,
  visto_por_cliente BOOLEAN DEFAULT FALSE,
  fecha_visto TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets_soporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  proyecto_id UUID REFERENCES proyectos(id),
  numero TEXT NOT NULL,
  asunto TEXT NOT NULL,
  descripcion TEXT,
  prioridad prioridad_ticket DEFAULT 'media',
  estado estado_ticket DEFAULT 'abierto',
  asignado_id UUID REFERENCES auth.users(id),
  origen TEXT,  -- portal, email, telefono, deteccion_automatica
  sla_horas INTEGER,
  fecha_resolucion TIMESTAMPTZ,
  satisfaccion_cliente NUMERIC(3,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero)
);

CREATE TABLE tickets_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets_soporte(id) ON DELETE CASCADE,
  autor_id UUID REFERENCES auth.users(id),
  autor_externo TEXT,  -- Si viene del cliente sin cuenta
  contenido TEXT NOT NULL,
  es_publico BOOLEAN DEFAULT TRUE,  -- Visible para cliente o solo interno
  archivos_adjuntos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLAS COMERCIALES
-- ============================================================================

CREATE TABLE oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  vendedor_id UUID REFERENCES auth.users(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado estado_oportunidad DEFAULT 'lead',
  monto_estimado NUMERIC(14,2),
  probabilidad NUMERIC(3,2) DEFAULT 0.5,
  fuente TEXT,  -- web, redes, referido, llamada, evento
  fecha_proxima_accion DATE,
  proxima_accion TEXT,
  fecha_cierre_estimada DATE,
  fecha_cierre_real DATE,
  motivo_perdida TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE actividades_comerciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id UUID REFERENCES oportunidades(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id),
  tipo TEXT NOT NULL,  -- llamada, reunion, correo, visita_tecnica, demo
  fecha TIMESTAMPTZ NOT NULL,
  duracion_minutos INTEGER,
  participantes TEXT,
  notas TEXT,
  resultado TEXT,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  oportunidad_id UUID REFERENCES oportunidades(id),
  numero TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  vigencia_dias INTEGER DEFAULT 30,
  fecha_vencimiento DATE,
  subtotal NUMERIC(14,2),
  descuento NUMERIC(14,2) DEFAULT 0,
  iva NUMERIC(14,2),
  retenciones NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2),
  condiciones_pago TEXT,
  notas TEXT,
  url_pdf TEXT,
  origen TEXT,  -- sistema, sunwise (importado), manual
  estado TEXT DEFAULT 'borrador',  -- borrador, enviada, aceptada, rechazada, vencida
  enviada_a_cliente BOOLEAN DEFAULT FALSE,
  fecha_envio TIMESTAMPTZ,
  vista_por_cliente BOOLEAN DEFAULT FALSE,
  fecha_vista_cliente TIMESTAMPTZ,
  fecha_aceptacion DATE,
  aprobada_internamente BOOLEAN DEFAULT FALSE,
  aprobada_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero, version)
);

CREATE TABLE cotizaciones_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id UUID NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  clave_sat TEXT,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12,4) NOT NULL,
  unidad_sat TEXT,
  precio_unitario NUMERIC(14,4) NOT NULL,
  descuento NUMERIC(14,2) DEFAULT 0,
  importe NUMERIC(14,2) NOT NULL,
  iva_tasa NUMERIC(5,4) DEFAULT 0.16,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contratos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  cotizacion_id UUID REFERENCES cotizaciones(id),
  proyecto_id UUID REFERENCES proyectos(id),
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL,  -- servicios_solar, electrico, mantenimiento, etc.
  fecha_firma DATE,
  fecha_inicio DATE,
  fecha_fin DATE,
  monto_total NUMERIC(14,2),
  plan_pagos JSONB,
  url_pdf_firmado TEXT,
  metodo_firma TEXT,  -- electronica_mifiel, fisica_escaneada
  estado TEXT DEFAULT 'borrador',  -- borrador, en_firma, firmado, vencido, rescindido
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero)
);


-- ============================================================================
-- TABLAS FINANCIERAS
-- ============================================================================

CREATE TABLE catalogo_servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad TEXT,
  costo_base NUMERIC(12,2),
  precio_inter_co NUMERIC(12,2),  -- Con margen 15% default
  precio_externo NUMERIC(12,2),
  margen_inter_co NUMERIC(5,2) DEFAULT 0.15,
  clave_sat TEXT,
  unidad_sat TEXT,
  iva_aplicable BOOLEAN DEFAULT TRUE,
  retenciones JSONB,
  vigencia_inicio DATE,
  vigencia_fin DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE TABLE catalogo_productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  marca TEXT,
  modelo TEXT,
  capacidad NUMERIC(12,4),  -- W, kW, kWh para solar
  unidad_capacidad TEXT,  -- W, kW, kWh
  unidad_medida TEXT,  -- pieza, metro, kg, etc.
  unidad_sat TEXT,
  clave_sat TEXT,
  costo_promedio NUMERIC(12,2),
  precio_lista NUMERIC(12,2),
  stock_minimo NUMERIC(12,2),
  stock_maximo NUMERIC(12,2),
  requiere_serie BOOLEAN DEFAULT FALSE,
  url_datasheet TEXT,
  garantia_meses INTEGER,
  categoria TEXT,  -- panel, inversor, bos, herramienta, equipo_medicion, consumible
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE catalogo_mano_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  categoria TEXT NOT NULL,
  descripcion TEXT,
  costo_hora NUMERIC(10,2),
  costo_dia NUMERIC(10,2),
  precio_hora_externo NUMERIC(10,2),
  precio_dia_externo NUMERIC(10,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, categoria)
);

CREATE TABLE catalogo_viaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destino TEXT NOT NULL,  -- local, nacional_cerca, nacional_lejos, internacional
  hospedaje_dia NUMERIC(10,2),
  alimentacion_dia NUMERIC(10,2),
  transporte_dia NUMERIC(10,2),
  otros_dia NUMERIC(10,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE almacenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT,  -- principal, obra, virtual_cuadrilla
  direccion JSONB,
  responsable_id UUID REFERENCES auth.users(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE TABLE inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  almacen_id UUID NOT NULL REFERENCES almacenes(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES catalogo_productos(id),
  stock NUMERIC(12,4) DEFAULT 0,
  stock_reservado NUMERIC(12,4) DEFAULT 0,
  stock_disponible NUMERIC(12,4) GENERATED ALWAYS AS (stock - stock_reservado) STORED,
  ubicacion_fisica TEXT,
  ultima_entrada TIMESTAMPTZ,
  ultima_salida TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(almacen_id, producto_id)
);

CREATE TABLE productos_serie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES catalogo_productos(id),
  numero_serie TEXT NOT NULL,
  almacen_id UUID REFERENCES almacenes(id),
  proyecto_id UUID REFERENCES proyectos(id),
  cliente_id UUID REFERENCES clientes(id),  -- Cuando se instala
  fecha_compra DATE,
  oc_id UUID,  -- Referencia a OC de origen
  fecha_instalacion DATE,
  ubicacion_actual TEXT,
  garantia_inicio DATE,
  garantia_fin DATE,
  estado TEXT DEFAULT 'en_almacen',  -- en_almacen, asignado_proyecto, instalado, dado_baja, en_garantia
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producto_id, numero_serie)
);

CREATE INDEX idx_serie_proyecto ON productos_serie(proyecto_id);
CREATE INDEX idx_serie_cliente ON productos_serie(cliente_id);

CREATE TABLE inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  almacen_id UUID NOT NULL REFERENCES almacenes(id),
  producto_id UUID NOT NULL REFERENCES catalogo_productos(id),
  serie_id UUID REFERENCES productos_serie(id),
  tipo TEXT NOT NULL,  -- entrada_compra, salida_obra, traspaso, devolucion, ajuste
  cantidad NUMERIC(12,4) NOT NULL,
  proyecto_id UUID REFERENCES proyectos(id),
  oc_id UUID,
  almacen_destino_id UUID REFERENCES almacenes(id),  -- Para traspasos
  motivo TEXT,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  autorizado_por UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ordenes_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
  proveedor_id UUID NOT NULL REFERENCES proveedores(id),
  proyecto_id UUID REFERENCES proyectos(id),
  numero TEXT NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_entrega_esperada DATE,
  fecha_entrega_real DATE,
  subtotal NUMERIC(14,2) NOT NULL,
  descuento NUMERIC(14,2) DEFAULT 0,
  iva NUMERIC(14,2),
  retenciones NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  condiciones_pago TEXT,
  forma_pago TEXT,
  estado estado_oc DEFAULT 'borrador',
  cfdi_recibido_id UUID,  -- FK a cfdi cuando llega factura
  fecha_pago DATE,
  comentarios TEXT,
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  url_pdf TEXT,
  archivos_adjuntos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero)
);

CREATE INDEX idx_oc_empresa ON ordenes_compra(empresa_id);
CREATE INDEX idx_oc_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX idx_oc_proyecto ON ordenes_compra(proyecto_id);
CREATE INDEX idx_oc_estado ON ordenes_compra(estado);

CREATE TABLE ordenes_compra_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oc_id UUID NOT NULL REFERENCES ordenes_compra(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  producto_id UUID REFERENCES catalogo_productos(id),
  clave_sat TEXT,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12,4) NOT NULL,
  unidad_sat TEXT,
  precio_unitario NUMERIC(14,4) NOT NULL,
  importe NUMERIC(14,2) NOT NULL,
  iva_tasa NUMERIC(5,4) DEFAULT 0.16,
  cantidad_recibida NUMERIC(12,4) DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ordenes_trabajo_inter_co (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_origen_id UUID NOT NULL REFERENCES empresas(id),  -- Quien paga
  empresa_destino_id UUID NOT NULL REFERENCES empresas(id),  -- Quien presta servicio
  proyecto_id UUID REFERENCES proyectos(id),
  servicio_id UUID REFERENCES catalogo_servicios(id),
  numero TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_completacion_esperada DATE,
  fecha_completacion_real DATE,
  cantidad NUMERIC(12,4),
  unidad TEXT,
  costo_base NUMERIC(14,2) NOT NULL,
  margen_aplicado NUMERIC(5,4) DEFAULT 0.15,
  precio_inter_co NUMERIC(14,2) NOT NULL,
  iva NUMERIC(14,2),
  retenciones NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  estado estado_ot DEFAULT 'solicitada',
  cfdi_id UUID,  -- Cuando se factura
  fecha_cobro DATE,
  evidencia_completacion JSONB,  -- {url_reporte, fotos, observaciones}
  capturado_por UUID NOT NULL REFERENCES auth.users(id),
  aprobado_origen_por UUID REFERENCES auth.users(id),
  aprobado_destino_por UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_origen_id, numero)
);

CREATE INDEX idx_ot_origen ON ordenes_trabajo_inter_co(empresa_origen_id);
CREATE INDEX idx_ot_destino ON ordenes_trabajo_inter_co(empresa_destino_id);
CREATE INDEX idx_ot_estado ON ordenes_trabajo_inter_co(estado);

CREATE TABLE cfdi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),  -- Empresa del grupo (emisora si tipo=ingreso/egreso, receptora si gasto)
  tipo tipo_cfdi NOT NULL,
  es_emitido BOOLEAN NOT NULL,  -- TRUE = nuestro grupo emite, FALSE = es CFDI de gasto recibido
  serie TEXT,
  folio TEXT,
  uuid_sat UUID,
  fecha_emision TIMESTAMPTZ,
  fecha_timbrado TIMESTAMPTZ,
  rfc_emisor TEXT NOT NULL,
  nombre_emisor TEXT,
  rfc_receptor TEXT NOT NULL,
  nombre_receptor TEXT,
  uso_cfdi TEXT,
  metodo_pago TEXT,  -- PUE, PPD
  forma_pago TEXT,
  moneda TEXT DEFAULT 'MXN',
  tipo_cambio NUMERIC(10,6) DEFAULT 1.0,
  subtotal NUMERIC(14,2) NOT NULL,
  descuento NUMERIC(14,2) DEFAULT 0,
  iva_trasladado NUMERIC(14,2) DEFAULT 0,
  iva_retenido NUMERIC(14,2) DEFAULT 0,
  isr_retenido NUMERIC(14,2) DEFAULT 0,
  total NUMERIC(14,2) NOT NULL,
  cliente_id UUID REFERENCES clientes(id),  -- Si es factura a cliente
  proveedor_id UUID REFERENCES proveedores(id),  -- Si es CFDI recibido de proveedor
  proyecto_id UUID REFERENCES proyectos(id),
  oc_id UUID REFERENCES ordenes_compra(id),
  ot_id UUID REFERENCES ordenes_trabajo_inter_co(id),
  contrato_id UUID REFERENCES contratos_cliente(id),
  url_xml TEXT,
  url_pdf TEXT,
  estado estado_cfdi DEFAULT 'borrador',
  motivo_cancelacion TEXT,
  uuid_sustituye UUID,
  pac_proveedor TEXT,  -- sw_sapien, diverza
  pac_response JSONB,
  enviado_a_receptor BOOLEAN DEFAULT FALSE,
  fecha_envio_receptor TIMESTAMPTZ,
  fecha_pago DATE,
  monto_pagado NUMERIC(14,2) DEFAULT 0,
  saldo_pendiente NUMERIC(14,2),
  capturado_por UUID REFERENCES auth.users(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cfdi_empresa ON cfdi(empresa_id);
CREATE INDEX idx_cfdi_uuid ON cfdi(uuid_sat) WHERE uuid_sat IS NOT NULL;
CREATE INDEX idx_cfdi_cliente ON cfdi(cliente_id) WHERE cliente_id IS NOT NULL;
CREATE INDEX idx_cfdi_proveedor ON cfdi(proveedor_id) WHERE proveedor_id IS NOT NULL;
CREATE INDEX idx_cfdi_estado ON cfdi(estado);
CREATE INDEX idx_cfdi_fecha ON cfdi(fecha_emision DESC);

CREATE TABLE cfdi_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfdi_id UUID NOT NULL REFERENCES cfdi(id) ON DELETE CASCADE,
  orden INTEGER NOT NULL,
  clave_sat TEXT,
  descripcion TEXT NOT NULL,
  cantidad NUMERIC(12,4) NOT NULL,
  unidad_sat TEXT,
  precio_unitario NUMERIC(14,4) NOT NULL,
  importe NUMERIC(14,2) NOT NULL,
  iva_tasa NUMERIC(5,4),
  iva_importe NUMERIC(14,2),
  observaciones TEXT
);

CREATE TABLE cfdi_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cfdi_id UUID NOT NULL REFERENCES cfdi(id),  -- CFDI de pago (complemento)
  cfdi_pagado_id UUID NOT NULL REFERENCES cfdi(id),  -- CFDI ingreso pagado
  fecha_pago TIMESTAMPTZ NOT NULL,
  forma_pago TEXT,
  moneda TEXT DEFAULT 'MXN',
  monto NUMERIC(14,2) NOT NULL,
  cuenta_origen TEXT,
  cuenta_destino TEXT,
  num_operacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lineas_credito_inter_co (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_acreedora_id UUID NOT NULL REFERENCES empresas(id),
  empresa_deudora_id UUID NOT NULL REFERENCES empresas(id),
  monto_autorizado NUMERIC(14,2) NOT NULL,
  monto_utilizado NUMERIC(14,2) DEFAULT 0,
  monto_disponible NUMERIC(14,2) GENERATED ALWAYS AS (monto_autorizado - monto_utilizado) STORED,
  vigencia_inicio DATE NOT NULL,
  vigencia_fin DATE NOT NULL,
  tasa_base TEXT DEFAULT 'tiie_28',
  spread NUMERIC(5,4) DEFAULT 0.06,
  capitaliza_intereses BOOLEAN DEFAULT FALSE,
  dia_corte INTEGER DEFAULT 31,  -- Último del mes
  activa BOOLEAN DEFAULT TRUE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (empresa_acreedora_id != empresa_deudora_id),
  UNIQUE(empresa_acreedora_id, empresa_deudora_id, vigencia_inicio)
);

CREATE TABLE prestamos_inter_co (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linea_id UUID NOT NULL REFERENCES lineas_credito_inter_co(id),
  empresa_acreedora_id UUID NOT NULL REFERENCES empresas(id),
  empresa_deudora_id UUID NOT NULL REFERENCES empresas(id),
  numero TEXT NOT NULL,
  monto NUMERIC(14,2) NOT NULL,
  monto_pagado NUMERIC(14,2) DEFAULT 0,
  saldo_pendiente NUMERIC(14,2),
  fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_ejecucion DATE,
  fecha_confirmacion DATE,
  fecha_vencimiento DATE,
  motivo TEXT,
  estado estado_prestamo DEFAULT 'solicitado',
  solicitado_por UUID NOT NULL REFERENCES auth.users(id),
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  ejecutado_por UUID REFERENCES auth.users(id),
  confirmado_por UUID REFERENCES auth.users(id),
  comprobante_transferencia TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(numero)
);

CREATE TABLE prestamos_intereses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos_inter_co(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  saldo_principal NUMERIC(14,2) NOT NULL,
  tasa_aplicada NUMERIC(8,6) NOT NULL,
  intereses_dia NUMERIC(14,4) NOT NULL,
  intereses_acumulados NUMERIC(14,2) NOT NULL,
  cerrado_mes BOOLEAN DEFAULT FALSE,
  cfdi_intereses_id UUID REFERENCES cfdi(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prestamo_id, fecha)
);

CREATE TABLE bancos_cuentas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  banco TEXT NOT NULL,
  numero_cuenta TEXT NOT NULL,
  clabe TEXT,
  alias TEXT,
  tipo TEXT,  -- cheques, ahorro, inversion
  moneda TEXT DEFAULT 'MXN',
  saldo_actual NUMERIC(14,2),
  fecha_actualizacion_saldo TIMESTAMPTZ,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bancos_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cuenta_id UUID NOT NULL REFERENCES bancos_cuentas(id),
  fecha DATE NOT NULL,
  fecha_aplicacion DATE,
  concepto TEXT,
  referencia TEXT,
  monto NUMERIC(14,2) NOT NULL,
  tipo TEXT,  -- abono, cargo
  saldo_resultante NUMERIC(14,2),
  origen TEXT,  -- import_csv, belvo (futuro), manual
  conciliado BOOLEAN DEFAULT FALSE,
  cfdi_relacionado_id UUID REFERENCES cfdi(id),
  prestamo_relacionado_id UUID REFERENCES prestamos_inter_co(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bancos_mov_cuenta_fecha ON bancos_movimientos(cuenta_id, fecha DESC);
CREATE INDEX idx_bancos_mov_conciliado ON bancos_movimientos(conciliado);

CREATE TABLE presupuestos_proyecto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id UUID NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,  -- materiales, mano_obra, subcontratacion, viaticos, otros
  presupuesto NUMERIC(14,2) NOT NULL,
  ejercido NUMERIC(14,2) DEFAULT 0,
  comprometido NUMERIC(14,2) DEFAULT 0,  -- OC aprobadas no recibidas
  saldo NUMERIC(14,2) GENERATED ALWAYS AS (presupuesto - ejercido - comprometido) STORED,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE encuestas_satisfaccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  proyecto_id UUID REFERENCES proyectos(id),
  ticket_id UUID REFERENCES tickets_soporte(id),
  tipo TEXT,  -- post_proyecto, post_ticket, periodica
  enviada_a TEXT,
  fecha_envio TIMESTAMPTZ,
  fecha_respuesta TIMESTAMPTZ,
  respuestas JSONB,  -- {nps, satisfaccion_general, comentarios, etc.}
  nps INTEGER,
  satisfaccion NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- TABLAS DE CALIDAD Y CUMPLIMIENTO
-- ============================================================================

CREATE TABLE sgc_alcance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  area TEXT NOT NULL,
  unidad_negocio_id UUID REFERENCES unidades_negocio(id),
  procesos_incluidos TEXT[],
  norma TEXT DEFAULT 'ISO_9001:2015',
  fecha_certificacion DATE,
  fecha_renovacion DATE,
  casa_certificadora TEXT,
  numero_certificado TEXT,
  estado TEXT,  -- en_proceso, certificado, suspendido, vencido
  observaciones TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sgc_procesos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT,  -- estrategico, clave, apoyo
  descripcion TEXT,
  dueno_id UUID REFERENCES auth.users(id),
  alcance TEXT,
  entradas TEXT,
  salidas TEXT,
  procedimiento_id UUID,  -- FK a procedimientos
  esta_en_alcance_certificado BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

CREATE TABLE sgc_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID NOT NULL REFERENCES sgc_procesos(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  formula TEXT,
  unidad_medida TEXT,
  meta NUMERIC(14,4),
  periodicidad TEXT,  -- mensual, trimestral, anual
  responsable_id UUID REFERENCES auth.users(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sgc_indicadores_mediciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES sgc_indicadores(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,  -- 2026-04 (mensual), 2026-Q1 (trimestral), 2026 (anual)
  valor NUMERIC(14,4) NOT NULL,
  semaforo TEXT,  -- verde, amarillo, rojo
  observaciones TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(indicador_id, periodo)
);

CREATE TABLE sgc_riesgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proceso_id UUID REFERENCES sgc_procesos(id),
  empresa_id UUID REFERENCES empresas(id),
  descripcion TEXT NOT NULL,
  causa TEXT,
  consecuencia TEXT,
  probabilidad INTEGER,  -- 1-5
  impacto INTEGER,  -- 1-5
  nivel_riesgo INTEGER GENERATED ALWAYS AS (probabilidad * impacto) STORED,
  controles_existentes TEXT,
  controles_adicionales TEXT,
  responsable_id UUID REFERENCES auth.users(id),
  fecha_revision DATE,
  estado TEXT DEFAULT 'identificado',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auditorias_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  proceso_id UUID REFERENCES sgc_procesos(id),
  numero TEXT NOT NULL,
  tipo TEXT,  -- programada, sorpresiva, seguimiento
  fecha_planeada DATE,
  fecha_ejecucion DATE,
  auditor_lider_id UUID NOT NULL REFERENCES auth.users(id),
  auditores_id UUID[],
  alcance TEXT,
  criterios TEXT,
  estado TEXT DEFAULT 'planeada',  -- planeada, en_ejecucion, en_reporte, cerrada
  url_reporte TEXT,
  conclusiones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero)
);

CREATE TABLE auditorias_hallazgos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id UUID NOT NULL REFERENCES auditorias_internas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- conformidad, observacion, no_conformidad_menor, no_conformidad_mayor
  descripcion TEXT NOT NULL,
  evidencia TEXT,
  clausula_iso TEXT,
  no_conformidad_id UUID,  -- FK si genera NC
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE no_conformidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  numero TEXT NOT NULL,
  origen TEXT,  -- auditoria_interna, auditoria_externa, queja_cliente, indicador, deteccion_operativa
  origen_id UUID,
  proceso_id UUID REFERENCES sgc_procesos(id),
  descripcion TEXT NOT NULL,
  evidencia JSONB,
  severidad severidad_no_conformidad,
  responsable_id UUID NOT NULL REFERENCES auth.users(id),
  fecha_deteccion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_compromiso_cierre DATE,
  causa_raiz TEXT,
  estado estado_no_conformidad DEFAULT 'abierta',
  fecha_cierre DATE,
  cerrado_por UUID REFERENCES auth.users(id),
  verificacion_eficacia JSONB,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, numero)
);

CREATE TABLE no_conformidades_acciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_conformidad_id UUID NOT NULL REFERENCES no_conformidades(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- correccion, accion_correctiva, accion_preventiva
  descripcion TEXT NOT NULL,
  responsable_id UUID NOT NULL REFERENCES auth.users(id),
  fecha_compromiso DATE,
  fecha_implementacion DATE,
  evidencia_implementacion TEXT,
  estado TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE revisiones_direccion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  fecha_reunion DATE NOT NULL,
  asistentes JSONB,
  entradas JSONB,  -- Datos de entrada estructurados según ISO 9.3.2
  salidas JSONB,  -- Decisiones tomadas
  acuerdos JSONB,  -- Acciones derivadas
  url_acta TEXT,
  capturado_por UUID REFERENCES auth.users(id),
  aprobada_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE procedimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),  -- NULL = transversal grupo
  proceso_id UUID REFERENCES sgc_procesos(id),
  codigo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT,  -- manual_calidad, procedimiento, instructivo, formato, registro
  descripcion TEXT,
  responsable_id UUID REFERENCES auth.users(id),
  aprobador_id UUID REFERENCES auth.users(id),
  version_actual INTEGER DEFAULT 1,
  estado TEXT DEFAULT 'borrador',  -- borrador, en_revision, aprobado, obsoleto
  fecha_proxima_revision DATE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(codigo, version_actual)
);

CREATE TABLE procedimientos_versiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimiento_id UUID NOT NULL REFERENCES procedimientos(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  url_archivo TEXT,
  fecha_emision DATE,
  cambios_vs_anterior TEXT,
  aprobado_por UUID REFERENCES auth.users(id),
  fecha_aprobacion TIMESTAMPTZ,
  estado TEXT,  -- vigente, obsoleto
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedimiento_id, version)
);

CREATE TABLE pld_operaciones_inusuales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),
  tipo_alerta TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  evidencia JSONB,
  cliente_id UUID REFERENCES clientes(id),
  proveedor_id UUID REFERENCES proveedores(id),
  monto NUMERIC(14,2),
  fecha_deteccion TIMESTAMPTZ DEFAULT NOW(),
  analizado_por UUID REFERENCES auth.users(id),
  fecha_analisis TIMESTAMPTZ,
  resultado_analisis TEXT,  -- legitima, requiere_documentacion, inusual, sospechosa
  reportada_uif BOOLEAN DEFAULT FALSE,
  fecha_reporte_uif TIMESTAMPTZ,
  numero_reporte_uif TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ema_acreditaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id),  -- CIAE
  tipo TEXT,  -- organismo_certificador, uvie
  estandar_acreditado TEXT,
  numero_acreditacion TEXT,
  fecha_inicio DATE,
  fecha_vencimiento DATE,
  proxima_auditoria DATE,
  estado TEXT,
  observaciones TEXT,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ema_certificaciones_emitidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acreditacion_id UUID NOT NULL REFERENCES ema_acreditaciones(id),
  candidato_nombre TEXT NOT NULL,
  candidato_curp TEXT,
  estandar TEXT NOT NULL,
  ce_externo_id UUID REFERENCES proveedores(id),  -- Si fue CE externo
  ei_externo_id UUID REFERENCES proveedores(id),  -- Si fue EI externo
  fecha_evaluacion DATE,
  fecha_dictamen DATE,
  resultado TEXT,  -- aprobado, no_aprobado
  numero_certificado TEXT,
  vigencia_inicio DATE,
  vigencia_fin DATE,
  cliente_pagador_id UUID REFERENCES clientes(id),
  cfdi_id UUID REFERENCES cfdi(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ema_dictamenes_uvie (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acreditacion_id UUID NOT NULL REFERENCES ema_acreditaciones(id),
  numero_dictamen TEXT UNIQUE NOT NULL,
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  proyecto_id UUID REFERENCES proyectos(id),
  ubicacion JSONB,
  capacidad_kva NUMERIC(10,2),
  tipo_instalacion TEXT,
  fecha_inspeccion DATE,
  fecha_dictamen DATE,
  resultado TEXT,  -- aprobado, condicionado, rechazado
  observaciones TEXT,
  url_dictamen TEXT,
  cfdi_id UUID REFERENCES cfdi(id),
  enviado_cfe BOOLEAN DEFAULT FALSE,
  fecha_envio_cfe TIMESTAMPTZ,
  inspector_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLAS DE IA
-- ============================================================================

CREATE TABLE ia_invocaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES empresas(id),
  modulo TEXT,  -- proyectos, finanzas, comercial, personas, calidad, configuracion
  tarea TEXT,  -- extraer_csf, generar_borrador_oc, analizar_riesgo, etc.
  modelo_usado TEXT,  -- haiku, sonnet, opus
  tokens_input INTEGER,
  tokens_output INTEGER,
  costo_usd NUMERIC(10,6),
  costo_mxn NUMERIC(10,4),
  tipo_cache TEXT,  -- hit, miss, parcial
  prompt_template TEXT,
  contexto_input JSONB,
  resultado_output JSONB,
  confidence_score NUMERIC(3,2),
  nivel_autonomia nivel_autonomia_ia,
  ejecutada BOOLEAN,
  validada_por UUID REFERENCES auth.users(id),
  duracion_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ia_usuario ON ia_invocaciones(usuario_id, created_at DESC);
CREATE INDEX idx_ia_empresa ON ia_invocaciones(empresa_id, created_at DESC);
CREATE INDEX idx_ia_modulo ON ia_invocaciones(modulo, tarea);

CREATE TABLE ia_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash_input TEXT UNIQUE NOT NULL,
  tarea TEXT NOT NULL,
  resultado JSONB NOT NULL,
  hits INTEGER DEFAULT 0,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_ultimo_hit TIMESTAMPTZ DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ
);

CREATE INDEX idx_ia_cache_hash ON ia_cache(hash_input);
CREATE INDEX idx_ia_cache_expiracion ON ia_cache(fecha_expiracion);

CREATE TABLE ia_costos_acumulados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo TEXT NOT NULL,  -- 2026-04
  empresa_id UUID REFERENCES empresas(id),
  modulo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  invocaciones INTEGER DEFAULT 0,
  tokens_total BIGINT DEFAULT 0,
  costo_usd NUMERIC(12,6) DEFAULT 0,
  costo_mxn NUMERIC(12,4) DEFAULT 0,
  cache_hit_rate NUMERIC(5,4),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(periodo, empresa_id, modulo, usuario_id)
);

CREATE TABLE ia_configuracion_autonomia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),  -- NULL = aplica al grupo
  modulo TEXT NOT NULL,
  tarea TEXT NOT NULL,
  nivel_autonomia nivel_autonomia_ia DEFAULT 'rojo',
  modelo_preferido TEXT,
  costo_max_por_invocacion_usd NUMERIC(10,4),
  observaciones TEXT,
  configurado_por UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, modulo, tarea)
);

-- ============================================================================
-- TABLAS DE AUDITORÍA Y CONFIGURACIÓN
-- ============================================================================

CREATE TABLE auditoria_acciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  empresa_id UUID REFERENCES empresas(id),
  accion TEXT NOT NULL,
  entidad_tipo TEXT,
  entidad_id UUID,
  datos_antes JSONB,
  datos_despues JSONB,
  ip TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auditoria_usuario ON auditoria_acciones(usuario_id, timestamp DESC);
CREATE INDEX idx_auditoria_entidad ON auditoria_acciones(entidad_tipo, entidad_id);
CREATE INDEX idx_auditoria_empresa ON auditoria_acciones(empresa_id, timestamp DESC);

CREATE TABLE sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  ip TEXT,
  user_agent TEXT,
  empresa_activa_id UUID REFERENCES empresas(id),
  inicio TIMESTAMPTZ DEFAULT NOW(),
  ultima_actividad TIMESTAMPTZ DEFAULT NOW(),
  fin TIMESTAMPTZ,
  motivo_fin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE accesos_externos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,  -- cliente, proveedor
  entidad_id UUID NOT NULL,
  permisos JSONB,
  activo BOOLEAN DEFAULT TRUE,
  fecha_invitacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_primer_acceso TIMESTAMPTZ,
  fecha_ultimo_acceso TIMESTAMPTZ,
  observaciones TEXT
);

CREATE TABLE configuracion_grupo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  descripcion TEXT,
  modificable_por_rol TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE configuracion_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  clave TEXT NOT NULL,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(empresa_id, clave)
);

CREATE TABLE umbrales_aprobacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),  -- NULL = aplica grupo
  tipo_operacion TEXT NOT NULL,  -- oc, ot, prestamo, contrato, finiquito
  rol_o_atributo TEXT NOT NULL,
  monto_max_mxn NUMERIC(14,2),
  requiere_justificacion_arriba_de NUMERIC(14,2),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plantillas_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  url_template TEXT,
  variables_requeridas JSONB,  -- Variables a llenar
  version INTEGER DEFAULT 1,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plantillas_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,  -- cotizacion, finiquito, reporte, etc.
  descripcion TEXT,
  url_template TEXT,
  empresa_id UUID REFERENCES empresas(id),  -- NULL = todas
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas relevantes
DO $$
DECLARE
  t TEXT;
  tablas TEXT[] := ARRAY[
    'empresas','clientes','proveedores','empleados','proyectos',
    'oportunidades','cotizaciones','contratos_cliente','ordenes_compra',
    'ordenes_trabajo_inter_co','cfdi','tickets_soporte'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    EXECUTE format('
      CREATE TRIGGER set_updated_at_%I
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', t, t);
  END LOOP;
END $$;

-- ============================================================================
-- HELPERS DE RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION usuario_tiene_rol_en_empresa(
  p_empresa_id UUID,
  p_roles TEXT[]
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid()
      AND empresa_id = p_empresa_id
      AND rol::TEXT = ANY(p_roles)
      AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION usuario_tiene_atributo(p_atributo TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid()
      AND p_atributo = ANY(atributos)
      AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION usuario_es_ceo()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios_empresas
    WHERE usuario_id = auth.uid()
      AND rol = 'ceo'
      AND activo = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION empresas_del_usuario()
RETURNS SETOF UUID AS $$
  SELECT empresa_id FROM usuarios_empresas
  WHERE usuario_id = auth.uid()
    AND activo = TRUE;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION empresa_actual()
RETURNS UUID AS $$
  SELECT current_setting('app.current_empresa_id', TRUE)::UUID;
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- RLS HABILITADO EN TODAS LAS TABLAS CON empresa_id O DATOS SENSIBLES
-- ============================================================================

-- Activar RLS en todas las tablas (las políticas se crean en migraciones específicas)
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_documentacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_evaluaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores_personal_repse ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_desempeno ENABLE ROW LEVEL SECURITY;
ALTER TABLE finiquitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bolsa_talento ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_capacitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE activos_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE viajes_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos ENABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacoras_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones_protocolos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mediciones_ejecuciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_soporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividades_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotizaciones_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_mano_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_viaticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_serie ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo_inter_co ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfdi ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfdi_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cfdi_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineas_credito_inter_co ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos_inter_co ENABLE ROW LEVEL SECURITY;
ALTER TABLE prestamos_intereses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bancos_movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_proyecto ENABLE ROW LEVEL SECURITY;
ALTER TABLE encuestas_satisfaccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_alcance ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_procesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_indicadores_mediciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sgc_riesgos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditorias_hallazgos ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_conformidades_acciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE revisiones_direccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedimientos_versiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pld_operaciones_inusuales ENABLE ROW LEVEL SECURITY;
ALTER TABLE ema_acreditaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ema_certificaciones_emitidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ema_dictamenes_uvie ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_invocaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_costos_acumulados ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_configuracion_autonomia ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_acciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE accesos_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE umbrales_aprobacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plantillas_documentos ENABLE ROW LEVEL SECURITY;

-- Las políticas RLS específicas se documentan en archivos separados de migración.
-- Aquí solo se habilita RLS. Antes de pasar a producción, verificar que TODAS las tablas
-- tienen al menos una política, y ejecutar los tests de RLS.

-- Política especial: auditoria_acciones es INMUTABLE (solo INSERT)
CREATE POLICY auditoria_solo_insert ON auditoria_acciones
FOR INSERT WITH CHECK (TRUE);

CREATE POLICY auditoria_solo_lectura ON auditoria_acciones
FOR SELECT USING (
  usuario_es_ceo()
  OR usuario_tiene_atributo('auditor_interno')
  OR usuario_tiene_atributo('coordinador_calidad')
  OR usuario_id = auth.uid()
);

-- No hay políticas de UPDATE ni DELETE = bitácora inmutable.

