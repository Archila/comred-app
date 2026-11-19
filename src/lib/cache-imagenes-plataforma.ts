import { Image } from 'expo-image';

/**
 * Android e iOS: `expo-image` guarda cada imagen en disco por su URL y no la
 * vuelve a pedir aunque el archivo cambie en el servidor.
 *
 * Solo borra la cache de `expo-image`: la sesion, las preferencias y los
 * datos guardados de la app no se tocan.
 */
export async function borrarCacheDeImagenes(): Promise<void> {
  await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
}

/**
 * En nativo la version no se guarda: la cache ya se vacio, asi que al abrir
 * la app de nuevo las URL sin version tambien se piden al servidor.
 */
export function leerVersionGuardada(): string | null {
  return null;
}

export function guardarVersion(_version: string): void {}
