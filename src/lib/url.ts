import { env } from '@/config';

import { useVersionImagenes, versionCacheImagenes } from './cache-imagenes';

/**
 * Resuelve una ruta de archivo devuelta por el API a una URL absoluta.
 *
 * El backend guarda `logoUrl` / `fotoUrl` como varchar y puede traer tanto una
 * URL completa (CDN) como una ruta relativa servida por el modulo `storage`.
 * Devuelve `undefined` si no hay valor, para poder usarlo directo en
 * `source={{ uri }}` sin condicionales en la vista.
 *
 * Tras "Recargar imagenes" las rutas del API llevan `?v=<version>` para
 * saltarse la cache (ver `cache-imagenes.ts`).
 */
export function resolveAssetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  const value = path.trim();
  if (!value) return undefined;

  if (/^(https?:|data:|file:)/i.test(value)) return value;

  const url = `${env.apiUrl}/${value.replace(/^\/+/, '')}`;
  const version = versionCacheImagenes();
  return version ? `${url}${url.includes('?') ? '&' : '?'}v=${version}` : url;
}

/**
 * `resolveAssetUrl` para imagenes en pantalla: el componente se vuelve a
 * pintar con la URL nueva cuando se recargan las imagenes desde el menu.
 */
export function useAssetUrl(path?: string | null): string | undefined {
  useVersionImagenes();
  return resolveAssetUrl(path);
}
