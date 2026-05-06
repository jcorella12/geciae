export type CategoriaNotificacion =
  | "finanzas"
  | "proyectos"
  | "personas"
  | "comercial"
  | "activos"
  | "sistema";

export type TipoNotificacionMetadata = {
  tipo: string;
  categoria: CategoriaNotificacion;
  nombre: string;
  descripcion: string;
  icono: string;
  severidadDefault: "info" | "warning" | "danger" | "success";
};

export const TIPOS_NOTIFICACION: TipoNotificacionMetadata[] = [
  // Finanzas
  {
    tipo: "oc_pendiente_aprobacion",
    categoria: "finanzas",
    nombre: "OC pendiente de aprobación",
    descripcion: "Una orden de compra espera tu aprobación",
    icono: "shopping-cart",
    severidadDefault: "warning",
  },
  {
    tipo: "oc_aprobada",
    categoria: "finanzas",
    nombre: "OC aprobada",
    descripcion: "Tu OC fue aprobada",
    icono: "check-circle",
    severidadDefault: "success",
  },
  {
    tipo: "ot_pendiente_confirmacion",
    categoria: "finanzas",
    nombre: "OT pendiente confirmar",
    descripcion: "Una orden de trabajo inter-co espera tu confirmación",
    icono: "clipboard-list",
    severidadDefault: "warning",
  },
  {
    tipo: "ot_aprobada",
    categoria: "finanzas",
    nombre: "OT aprobada",
    descripcion: "Una OT fue aprobada por ambas empresas",
    icono: "check-circle",
    severidadDefault: "success",
  },
  {
    tipo: "cfdi_recibido",
    categoria: "finanzas",
    nombre: "Nuevo CFDI",
    descripcion: "Se recibió un nuevo CFDI de proveedor",
    icono: "file-text",
    severidadDefault: "info",
  },
  {
    tipo: "obligacion_proxima_vencer",
    categoria: "finanzas",
    nombre: "Obligación SAT por vencer",
    descripcion: "Una obligación SAT vence en menos de 7 días",
    icono: "clock",
    severidadDefault: "warning",
  },
  {
    tipo: "lista_69b_vencida",
    categoria: "finanzas",
    nombre: "Lista 69-B desactualizada",
    descripcion: "Han pasado 6 meses sin actualizar la lista 69-B SAT",
    icono: "shield-alert",
    severidadDefault: "warning",
  },
  // Proyectos
  {
    tipo: "tarea_asignada",
    categoria: "proyectos",
    nombre: "Tarea asignada",
    descripcion: "Te asignaron una nueva tarea",
    icono: "list-todo",
    severidadDefault: "info",
  },
  {
    tipo: "proyecto_atrasado",
    categoria: "proyectos",
    nombre: "Proyecto atrasado",
    descripcion: "Un proyecto a tu cargo se está atrasando",
    icono: "alert-triangle",
    severidadDefault: "danger",
  },
  {
    tipo: "solicitud_proyecto",
    categoria: "proyectos",
    nombre: "Solicitud de proyecto",
    descripcion: "Hay una solicitud para tu proyecto que requiere acción",
    icono: "inbox",
    severidadDefault: "warning",
  },
  // Personas
  {
    tipo: "recibo_disponible",
    categoria: "personas",
    nombre: "Recibo de nómina disponible",
    descripcion: "Tu recibo de nómina del periodo está listo para descargar",
    icono: "file-down",
    severidadDefault: "info",
  },
  {
    tipo: "vacacion_aprobada",
    categoria: "personas",
    nombre: "Vacaciones aprobadas",
    descripcion: "Tu solicitud de vacaciones fue aprobada",
    icono: "calendar-check",
    severidadDefault: "success",
  },
  {
    tipo: "vacacion_solicitada",
    categoria: "personas",
    nombre: "Solicitud de vacaciones",
    descripcion: "Un colaborador solicitó vacaciones para tu aprobación",
    icono: "calendar",
    severidadDefault: "info",
  },
  // Comercial
  {
    tipo: "oportunidad_pendiente_seguimiento",
    categoria: "comercial",
    nombre: "Oportunidad sin seguimiento",
    descripcion: "Una oportunidad lleva 7+ días sin actividad",
    icono: "trending-up",
    severidadDefault: "warning",
  },
  {
    tipo: "cotizacion_aprobada",
    categoria: "comercial",
    nombre: "Cotización aprobada",
    descripcion: "Una cotización fue aprobada por el cliente",
    icono: "check-circle",
    severidadDefault: "success",
  },
  // Activos
  {
    tipo: "prestamo_activo_solicitado",
    categoria: "activos",
    nombre: "Préstamo de activo solicitado",
    descripcion: "Solicitaron prestar un activo de tu empresa",
    icono: "package",
    severidadDefault: "info",
  },
  {
    tipo: "prestamo_activo_aprobado",
    categoria: "activos",
    nombre: "Préstamo aprobado",
    descripcion: "Tu solicitud de préstamo fue aprobada",
    icono: "check-circle",
    severidadDefault: "success",
  },
  {
    tipo: "prestamo_activo_rechazado",
    categoria: "activos",
    nombre: "Préstamo rechazado",
    descripcion: "Tu solicitud de préstamo fue rechazada",
    icono: "x-circle",
    severidadDefault: "warning",
  },
  {
    tipo: "prestamo_activo_devuelto",
    categoria: "activos",
    nombre: "Activo devuelto",
    descripcion: "Un activo prestado fue devuelto",
    icono: "rotate-ccw",
    severidadDefault: "info",
  },
  // Sistema
  {
    tipo: "sugerencia_aplicada",
    categoria: "sistema",
    nombre: "Sugerencia aplicada",
    descripcion: "Tu sugerencia de mejora fue aplicada",
    icono: "lightbulb",
    severidadDefault: "success",
  },
];

export const ETIQUETAS_CATEGORIA: Record<CategoriaNotificacion, string> = {
  finanzas: "Finanzas",
  proyectos: "Proyectos",
  personas: "Personas",
  comercial: "Comercial",
  activos: "Activos",
  sistema: "Sistema",
};

export function tipoNotificacionMetadata(tipo: string): TipoNotificacionMetadata | undefined {
  return TIPOS_NOTIFICACION.find((t) => t.tipo === tipo);
}
