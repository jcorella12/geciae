// Tipos compartidos para Reportes formales del proyecto.

export type TipoReporteProyecto =
  | "incidente"
  | "avance_semanal"
  | "avance_mensual"
  | "inspeccion"
  | "no_conformidad"
  | "hallazgo_seguridad"
  | "retraso"
  | "cambio_alcance"
  | "ejecutivo"
  | "cierre_etapa"
  | "siniestro"
  | "auditoria"
  | "otro";

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporteProyecto, string> = {
  incidente: "Incidente",
  avance_semanal: "Avance semanal",
  avance_mensual: "Avance mensual",
  inspeccion: "Inspección",
  no_conformidad: "No conformidad",
  hallazgo_seguridad: "Hallazgo seguridad",
  retraso: "Reporte de retraso",
  cambio_alcance: "Cambio de alcance",
  ejecutivo: "Reporte ejecutivo",
  cierre_etapa: "Cierre de etapa",
  siniestro: "Siniestro",
  auditoria: "Auditoría",
  otro: "Otro",
};

export const COLOR_TIPO_REPORTE: Record<TipoReporteProyecto, string> = {
  incidente: "bg-red-100 text-red-700",
  avance_semanal: "bg-sky-100 text-sky-700",
  avance_mensual: "bg-blue-100 text-blue-700",
  inspeccion: "bg-emerald-100 text-emerald-700",
  no_conformidad: "bg-orange-100 text-orange-700",
  hallazgo_seguridad: "bg-amber-100 text-amber-700",
  retraso: "bg-yellow-100 text-yellow-700",
  cambio_alcance: "bg-violet-100 text-violet-700",
  ejecutivo: "bg-indigo-100 text-indigo-700",
  cierre_etapa: "bg-emerald-100 text-emerald-800",
  siniestro: "bg-red-100 text-red-800",
  auditoria: "bg-cyan-100 text-cyan-700",
  otro: "bg-gray-100 text-gray-700",
};

export const ICONO_TIPO_REPORTE: Record<TipoReporteProyecto, string> = {
  incidente: "🚨",
  avance_semanal: "📊",
  avance_mensual: "📈",
  inspeccion: "🔍",
  no_conformidad: "⚠️",
  hallazgo_seguridad: "🦺",
  retraso: "⏱️",
  cambio_alcance: "🔄",
  ejecutivo: "📋",
  cierre_etapa: "🏁",
  siniestro: "💥",
  auditoria: "✅",
  otro: "📄",
};

export type SeveridadReporte = "info" | "baja" | "media" | "alta" | "critica";

export const ETIQUETA_SEVERIDAD: Record<SeveridadReporte, string> = {
  info: "Informativo",
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

export const COLOR_SEVERIDAD: Record<SeveridadReporte, string> = {
  info: "bg-zinc-100 text-zinc-600",
  baja: "bg-sky-100 text-sky-700",
  media: "bg-amber-100 text-amber-700",
  alta: "bg-orange-100 text-orange-700",
  critica: "bg-red-100 text-red-800",
};

export type EstadoReporte =
  | "borrador"
  | "emitido"
  | "en_seguimiento"
  | "resuelto"
  | "cerrado";

export const ETIQUETA_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  en_seguimiento: "En seguimiento",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const COLOR_ESTADO_REPORTE: Record<EstadoReporte, string> = {
  borrador: "bg-gray-100 text-gray-600",
  emitido: "bg-blue-100 text-blue-700",
  en_seguimiento: "bg-amber-100 text-amber-700",
  resuelto: "bg-emerald-100 text-emerald-700",
  cerrado: "bg-zinc-100 text-zinc-500",
};

// Plantillas predefinidas de contenido por tipo
export const PLANTILLA_CONTENIDO: Partial<Record<TipoReporteProyecto, string>> =
  {
    incidente: `## Descripción del incidente
[Qué pasó, cuándo, dónde, quiénes]

## Causa raíz identificada
[Análisis del por qué]

## Personas involucradas / afectadas
[Listado y rol]

## Acciones inmediatas tomadas
[Pasos ya ejecutados para mitigar]

## Acción correctiva propuesta
[Plan para evitar recurrencia]

## Lecciones aprendidas
[Qué hacer diferente a futuro]
`,
    avance_semanal: `## Resumen ejecutivo de la semana
[Highlights principales]

## Avance vs plan
- Tareas completadas:
- Tareas en curso:
- Tareas atrasadas / bloqueadas:

## Hitos alcanzados
[Lista]

## Riesgos identificados
[Riesgos nuevos o vigentes con plan de mitigación]

## Plan próxima semana
[Tareas y entregables]

## Apoyos requeridos
[Decisiones / recursos pendientes]
`,
    inspeccion: `## Tipo y alcance de la inspección
[Eléctrica / estructural / general]

## Inspector y fecha
[Nombre, empresa, hora]

## Hallazgos
1.
2.
3.

## Calificación general
[Apta / con observaciones / no apta]

## Observaciones que requieren acción
[Lista numerada con responsable y fecha]

## Evidencia adjunta
[Referencia a fotos / planos]
`,
    no_conformidad: `## Descripción de la no conformidad
[Qué se observó]

## Norma / requisito incumplido
[Estándar, contrato, especificación]

## Evidencia objetiva
[Mediciones, fotos, observaciones]

## Causa raíz
[Análisis 5 por qués o equivalente]

## Plan de acción correctiva
[Pasos, responsable, fecha compromiso]

## Verificación de eficacia
[Cómo se confirmará que se resolvió]
`,
    hallazgo_seguridad: `## Tipo de hallazgo
[Casi accidente / acto inseguro / condición insegura]

## Ubicación exacta
[Sitio, hora]

## Personas presentes
[Lista]

## Descripción
[Qué se observó]

## Riesgo potencial
[Consecuencia si no se corrige]

## Acción inmediata
[Qué se hizo en ese momento]

## Acción correctiva permanente
[Plan estructural para evitar recurrencia]
`,
    retraso: `## Hitos / tareas afectadas
[Listado con fechas plan vs actuales]

## Causa del retraso
[Análisis]

## Días de retraso estimados
[Días vs plan]

## Impacto en cronograma global
[Fechas finales recalculadas]

## Plan de recuperación
[Acciones para recuperar tiempo o ajustar entregable]

## Comunicación al cliente
[Estado: enviada / pendiente / no aplica]
`,
    siniestro: `## Tipo de siniestro
[Choque, robo, incendio, daño material, lesión, etc.]

## Fecha, hora y ubicación
[Detalle]

## Personas / equipos / vehículos involucrados
[Lista]

## Daños identificados
[Materiales, lesiones, otros]

## Reporte a aseguradora
[Folio, fecha, ajustador asignado]

## Reporte a autoridades
[Si aplica]

## Acciones inmediatas
[Atención médica, resguardo, etc.]

## Documentación recopilada
[Fotos, dictámenes, declaraciones]
`,
  };

export type ReporteFormState = {
  ok: boolean;
  error: string | null;
  reporteId: string | null;
};

export const initialReporteFormState: ReporteFormState = {
  ok: false,
  error: null,
  reporteId: null,
};

export type SimpleState = { ok: boolean; error: string | null };
export const initialSimpleState: SimpleState = { ok: false, error: null };
