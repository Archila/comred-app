/**
 * Llaves de almacenamiento persistente.
 *
 * Importante: expo-secure-store solo admite [A-Za-z0-9._-] en las llaves,
 * por eso no se usan los dos puntos tipicos de web.
 */
export const STORAGE_KEYS = {
  /** JWT emitido por el API (cifrado en Keychain / Keystore). */
  token: 'comred.auth.token',
  /** Snapshot del usuario autenticado para pintar la UI sin esperar al API. */
  user: 'comred.auth.user',
  /** Preferencia de tema elegida por el usuario. */
  colorScheme: 'comred.ui.color-scheme',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
