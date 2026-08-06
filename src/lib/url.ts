import { env } from '@/config';

/**
 * Resuelve una ruta de archivo devuelta por el API a una URL absoluta.
 *
 * El backend guarda `logoUrl` / `fotoUrl` como varchar y puede traer tanto una
 * URL completa (CDN) como una ruta relativa servida por el modulo `storage`.
 * Devuelve `undefined` si no hay valor, para poder usarlo directo en
 * `source={{ uri }}` sin condicionales en la vista.
 */
export function resolveAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  const value = path.trim();
  if (!value) return undefined;

  if (/^(https?:|data:|file:)/i.test(value)) return value;

  return `${env.apiUrl}/${value.replace(/^\/+/, '')}`;
}
