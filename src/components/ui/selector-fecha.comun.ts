/**
 * Lo que comparten `selector-fecha.tsx` (telefono) y `selector-fecha.web.tsx`.
 * Va aparte porque en web `./selector-fecha` resuelve al propio `.web.tsx`.
 */
export interface SelectorFechaProps {
  valor: Date | null;
  onCambiar: (fecha: Date) => void;
  /** No deja elegir antes de esto. */
  minimo?: Date;
  placeholder: string;
  error?: string | null;
  deshabilitado?: boolean;
}

/** Sin valor, el selector arranca en la proxima hora en punto. */
export function proximaHora(desde: Date = new Date()): Date {
  const fecha = new Date(desde);
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return fecha;
}
