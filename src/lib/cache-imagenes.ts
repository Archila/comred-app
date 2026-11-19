import { useSyncExternalStore } from 'react';

import { borrarCacheDeImagenes, guardarVersion, leerVersionGuardada } from './cache-imagenes-plataforma';

/**
 * "Recargar imagenes" del menu lateral.
 *
 * Si una imagen se reemplaza en el servidor conservando el nombre, la app
 * sigue mostrando la anterior: la tiene guardada por su URL. Recargar hace
 * dos cosas:
 *
 *   1. En Android/iOS vacia la cache de `expo-image` (solo imagenes).
 *   2. Cambia la version que `resolveAssetUrl` anade a las rutas del API
 *      (`?v=`). Para la cache es otra URL, y las imagenes que ya estan en
 *      pantalla se piden de nuevo sin tener que salir y volver a entrar.
 *
 * Las pantallas se enteran con `useAssetUrl` / `useVersionImagenes`.
 */

let version = leerVersionGuardada();
const oyentes = new Set<() => void>();

export function versionCacheImagenes(): string | null {
  return version;
}

export async function recargarImagenes(): Promise<void> {
  await borrarCacheDeImagenes();
  version = Date.now().toString(36);
  guardarVersion(version);
  oyentes.forEach((avisar) => avisar());
}

function suscribir(avisar: () => void) {
  oyentes.add(avisar);
  return () => {
    oyentes.delete(avisar);
  };
}

/** Vuelve a pintar el componente cuando se recargan las imagenes. */
export function useVersionImagenes(): string | null {
  return useSyncExternalStore(suscribir, versionCacheImagenes, versionCacheImagenes);
}
