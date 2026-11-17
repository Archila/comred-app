/**
 * Utilidades de formato para mostrar fechas en hora de Guatemala (es-GT).
 *
 * El API siempre devuelve las fechas en UTC como texto ISO 8601 (sufijo
 * `Z`), sin importar en qué zona horaria corran el servidor o la base de
 * datos. `parseApiDate` las interpreta como el instante absoluto que son;
 * `formatDate`/`formatDateTime` las muestran fijas en hora de Guatemala,
 * sin importar la zona horaria configurada en el dispositivo del usuario.
 */

const LOCALE = 'es-GT';
const TIME_ZONE = 'America/Guatemala';

export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value?: string | Date | null): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value?: string | Date | null): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Solo la hora, sin cero a la izquierda: "8:00", "15:30". */
export function formatHora(value?: string | Date | null): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * Fecha sin hora que el API envia como texto 'AAAA-MM-DD' (inicio de un
 * proyecto). No pasa por `Date`: interpretarla como medianoche UTC la
 * mostraria el dia anterior en hora de Guatemala.
 */
export function formatDateOnly(value?: string | null): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '';
}

/** Cantidad con separador de miles de Guatemala. Ej: 1243 -> "1,243". */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/** Iniciales para el avatar por defecto. Ej: "Juan Perez" -> "JP". */
export function getInitials(fullName?: string): string {
  if (!fullName) return '';
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
