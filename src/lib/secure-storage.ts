import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacenamiento persistente para datos sensibles (JWT).
 *
 * - Nativo: expo-secure-store -> Keychain (iOS) / EncryptedSharedPreferences (Android).
 * - Web: `localStorage`, porque SecureStore no existe en el navegador.
 *   En web NO hay cifrado real; es una limitacion de la plataforma, no del codigo.
 *
 * Toda la API es asincrona para que el consumidor no dependa de la plataforma.
 */

const isWeb = Platform.OS === 'web';

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (isWeb) {
        return globalThis.localStorage?.getItem(key) ?? null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`[secureStorage] No se pudo leer "${key}"`, error);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (isWeb) {
        globalThis.localStorage?.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[secureStorage] No se pudo guardar "${key}"`, error);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (isWeb) {
        globalThis.localStorage?.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[secureStorage] No se pudo borrar "${key}"`, error);
    }
  },

  /** Helpers tipados para guardar objetos (perfil de usuario, preferencias). */
  async getObject<T>(key: string): Promise<T | null> {
    const raw = await secureStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      await secureStorage.removeItem(key);
      return null;
    }
  },

  async setObject(key: string, value: unknown): Promise<void> {
    await secureStorage.setItem(key, JSON.stringify(value));
  },
};
