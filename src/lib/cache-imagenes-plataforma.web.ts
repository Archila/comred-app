/**
 * Web: una pagina no puede borrar la cache HTTP del navegador, y el API sirvio
 * las imagenes como `immutable`, asi que el navegador no las vuelve a pedir.
 * Lo que las renueva es la version en la URL (`?v=`). Se guarda para que
 * siga valiendo al recargar la pagina; es lo unico que se escribe.
 */
const CLAVE = 'comred.version-imagenes';

export async function borrarCacheDeImagenes(): Promise<void> {}

export function leerVersionGuardada(): string | null {
  try {
    return globalThis.localStorage?.getItem(CLAVE) ?? null;
  } catch {
    return null;
  }
}

export function guardarVersion(version: string): void {
  try {
    globalThis.localStorage?.setItem(CLAVE, version);
  } catch {
    // Navegacion privada o almacenamiento bloqueado: vale para esta sesion.
  }
}
