/**
 * Utilidades de formato para Guatemala (es-GT).
 *
 * El API devuelve las fechas ya convertidas a hora de Guatemala en dos
 * formatos: `DD/MM/YYYY HH:mm:ss` (envoltorio) y `YYYY-MM-DDTHH:mm:ss`
 * (campos de las entidades). `parseApiDate` soporta ambos.
 */

const LOCALE = 'es-GT';

export function parseApiDate(value?: string | null): Date | null {
  if (!value) return null;

  // Formato del envoltorio: DD/MM/YYYY HH:mm:ss
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (match) {
    const [, dd, mm, yyyy, hh, mi, ss] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value?: string | Date | null): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value?: string | Date | null): string {
  const date = value instanceof Date ? value : parseApiDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
