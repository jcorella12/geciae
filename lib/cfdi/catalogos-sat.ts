/**
 * Catálogos del SAT — subset de los códigos más usados.
 * Lista completa: https://www.sat.gob.mx/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1579303197999&ssbinary=true
 *
 * Para MVP cargamos los códigos que aparecen en el 95% de los CFDI emitidos
 * en México por empresas industriales/comerciales. Cuando se necesite el
 * catálogo completo, lo migraremos a una tabla `sat_codigos` poblada vía
 * importación oficial del SAT.
 */

export type RegimenFiscal = {
  codigo: string;
  nombre: string;
  /** true = aplica solo a personas físicas, false = solo morales */
  fisica: boolean;
  /** true = aplica solo a personas morales */
  moral: boolean;
};

export const REGIMENES_FISCALES: RegimenFiscal[] = [
  { codigo: "601", nombre: "General de Ley Personas Morales", fisica: false, moral: true },
  { codigo: "603", nombre: "Personas Morales con Fines no Lucrativos", fisica: false, moral: true },
  { codigo: "605", nombre: "Sueldos y Salarios e Ingresos Asimilados a Salarios", fisica: true, moral: false },
  { codigo: "606", nombre: "Arrendamiento", fisica: true, moral: false },
  { codigo: "608", nombre: "Demás ingresos", fisica: true, moral: false },
  { codigo: "612", nombre: "Personas Físicas con Actividades Empresariales y Profesionales", fisica: true, moral: false },
  { codigo: "614", nombre: "Ingresos por intereses", fisica: true, moral: false },
  { codigo: "616", nombre: "Sin obligaciones fiscales", fisica: true, moral: false },
  { codigo: "621", nombre: "Incorporación Fiscal", fisica: true, moral: false },
  { codigo: "622", nombre: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", fisica: false, moral: true },
  { codigo: "623", nombre: "Opcional para Grupos de Sociedades", fisica: false, moral: true },
  { codigo: "624", nombre: "Coordinados", fisica: false, moral: true },
  { codigo: "625", nombre: "Régimen de las Actividades Empresariales con Ingresos a través de Plataformas Tecnológicas", fisica: true, moral: false },
  { codigo: "626", nombre: "Régimen Simplificado de Confianza (RESICO)", fisica: true, moral: true },
];

export type UsoCFDI = {
  codigo: string;
  nombre: string;
};

export const USOS_CFDI: UsoCFDI[] = [
  { codigo: "G01", nombre: "Adquisición de mercancías" },
  { codigo: "G02", nombre: "Devoluciones, descuentos o bonificaciones" },
  { codigo: "G03", nombre: "Gastos en general" },
  { codigo: "I01", nombre: "Construcciones" },
  { codigo: "I02", nombre: "Mobiliario y equipo de oficina por inversiones" },
  { codigo: "I03", nombre: "Equipo de transporte" },
  { codigo: "I04", nombre: "Equipo de cómputo y accesorios" },
  { codigo: "I05", nombre: "Dados, troqueles, moldes, matrices y herramental" },
  { codigo: "I06", nombre: "Comunicaciones telefónicas" },
  { codigo: "I07", nombre: "Comunicaciones satelitales" },
  { codigo: "I08", nombre: "Otra maquinaria y equipo" },
  { codigo: "P01", nombre: "Por definir" },
  { codigo: "S01", nombre: "Sin efectos fiscales" },
  { codigo: "CP01", nombre: "Pagos" },
];

export const ESTADOS_MX = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

export type EstadoMX = (typeof ESTADOS_MX)[number];

/**
 * Normaliza el nombre de un estado mexicano. Tolera mayúsculas, acentos y
 * variantes. Si no encuentra match, regresa null.
 */
export function normalizeEstadoMx(
  input: string | null | undefined,
): EstadoMX | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Match exacto
  const direct = ESTADOS_MX.find((e) => e === trimmed);
  if (direct) return direct;
  // Case-insensitive
  const lower = trimmed.toLowerCase();
  const ci = ESTADOS_MX.find((e) => e.toLowerCase() === lower);
  if (ci) return ci;
  // Sin acentos
  const stripAccents = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const target = stripAccents(trimmed);
  return ESTADOS_MX.find((e) => stripAccents(e) === target) ?? null;
}

/**
 * Valida formato de RFC.
 * Persona moral: 12 chars (3 letras + 6 dígitos YYMMDD + 3 alfanuméricos).
 * Persona física: 13 chars (4 letras + 6 dígitos YYMMDD + 3 alfanuméricos).
 *
 * NO valida que YYMMDD sea fecha real ni que el homoclave sea correcto;
 * solo formato. Validación contra SAT real es Sprint 3 (vía IA).
 */
export const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

/** Persona moral si el RFC tiene 12 chars, física si 13. */
export function tipoPersona(rfc: string): "moral" | "fisica" | null {
  const r = rfc.toUpperCase().trim();
  if (!RFC_REGEX.test(r)) return null;
  return r.length === 12 ? "moral" : "fisica";
}

/**
 * Valida formato de CURP. 18 caracteres con estructura específica.
 * Solo aplica a personas físicas.
 */
export const CURP_REGEX =
  /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
