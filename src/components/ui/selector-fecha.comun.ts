/**
 * Lo que comparten `selector-fecha.tsx` (telefono) y `selector-fecha.web.tsx`.
 * Va aparte porque en web `./selector-fecha` resuelve al propio `.web.tsx`.
 */
export interface SelectorFechaProps {
  valor: Date | null;
  onCambiar: (fecha: Date) => void;
  /** No deja elegir antes de esto. */
  minimo?: Date;
  /** No deja elegir despues de esto (una fecha que ya ocurrio, como la de emision). */
  maximo?: Date;
  placeholder: string;
  error?: string | null;
  deshabilitado?: boolean;
  /**
   * Solo el dia, sin hora (columnas DATE, como las de un proyecto). El valor
   * llega a mediodia local: ningun cambio de zona horaria lo mueve de dia.
   */
  soloFecha?: boolean;
}

/** El mismo dia a las 12:00 locales. */
export function aMediodia(fecha: Date): Date {
  const copia = new Date(fecha);
  copia.setHours(12, 0, 0, 0);
  return copia;
}

/** Sin valor, el selector arranca en la proxima hora en punto. */
export function proximaHora(desde: Date = new Date()): Date {
  const fecha = new Date(desde);
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return fecha;
}

/**
 * Donde arranca el selector: el valor, o la proxima hora en punto sin pasar
 * del maximo (el selector nativo no admite arrancar fuera de su rango).
 */
export function fechaInicial(valor: Date | null, minimo?: Date, maximo?: Date): Date {
  if (valor) return valor;
  const sugerida = proximaHora(minimo);
  return maximo && sugerida > maximo ? maximo : sugerida;
}
