/**
 * Tipos de dominio del ERP PSE.
 * Se llenan durante Fase 1 conforme se construyen los espacios.
 */

export type EmpresaCodigo = "psenergia" | "ciae" | "ied" | "limson";

export type RolBase =
  | "ceo"
  | "director"
  | "operativo"
  | "empleado"
  | "cliente";

export type Semaforo = "verde" | "amarillo" | "rojo" | "negro";
