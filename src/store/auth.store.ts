import { create } from 'zustand';

import { authActions } from '@/actions';
import { setAuthToken } from '@/api';
import { STORAGE_KEYS } from '@/constants';
import { secureStorage } from '@/lib';
import type { AuthSession, Usuario } from '@/models';

/**
 * Estado global de la sesion.
 *
 * Zustand solo guarda estado de CLIENTE (quien esta logueado). Todo lo que se
 * lee del API vive en la cache de TanStack Query, no aqui.
 */

export type AuthStatus =
  /** Aun no se sabe: se esta restaurando el token del almacenamiento seguro. */
  | 'checking'
  | 'authenticated'
  | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: Usuario | null;
  token: string | null;

  /** Restaura la sesion al abrir la app. Lo llama `AuthProvider` una sola vez. */
  bootstrap: () => Promise<void>;
  /** Persiste la sesion despues de un login exitoso. */
  setSession: (session: AuthSession) => Promise<void>;
  /** Refresca el usuario en memoria (ej. tras editar el perfil). */
  setUser: (user: Usuario) => void;
  /** Cierra sesion y limpia el almacenamiento seguro. */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'checking',
  user: null,
  token: null,

  bootstrap: async () => {
    const token = await secureStorage.getItem(STORAGE_KEYS.token);

    if (!token) {
      set({ status: 'unauthenticated', user: null, token: null });
      return;
    }

    // Se pinta la UI de inmediato con el usuario cacheado y en paralelo se
    // valida el token contra el API.
    setAuthToken(token);
    const cachedUser = await secureStorage.getObject<Usuario>(STORAGE_KEYS.user);
    if (cachedUser) {
      set({ status: 'authenticated', user: cachedUser, token });
    }

    try {
      // El API devuelve un token renovado: hay que guardar el nuevo.
      const session = await authActions.verifyToken(token);
      setAuthToken(session.token);
      await secureStorage.setItem(STORAGE_KEYS.token, session.token);
      await secureStorage.setObject(STORAGE_KEYS.user, session.user);
      set({ status: 'authenticated', user: session.user, token: session.token });
    } catch {
      // Token vencido o revocado: se limpia todo y la app queda en modo publico.
      setAuthToken(null);
      await secureStorage.removeItem(STORAGE_KEYS.token);
      await secureStorage.removeItem(STORAGE_KEYS.user);
      set({ status: 'unauthenticated', user: null, token: null });
    }
  },

  setSession: async (session) => {
    setAuthToken(session.token);
    await secureStorage.setItem(STORAGE_KEYS.token, session.token);
    await secureStorage.setObject(STORAGE_KEYS.user, session.user);
    set({ status: 'authenticated', user: session.user, token: session.token });
  },

  setUser: (user) => {
    set({ user });
    void secureStorage.setObject(STORAGE_KEYS.user, user);
  },

  logout: async () => {
    setAuthToken(null);
    await secureStorage.removeItem(STORAGE_KEYS.token);
    await secureStorage.removeItem(STORAGE_KEYS.user);
    set({ status: 'unauthenticated', user: null, token: null });
  },
}));

/* -------------------------------------------------------------------------- */
/* Selectores                                                                  */
/* -------------------------------------------------------------------------- */
/* Usar selectores evita re-renders innecesarios: el componente solo se vuelve
   a pintar cuando cambia el trozo de estado que realmente consume.            */

export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthStatus = () => useAuthStore((state) => state.status);
export const useIsAuthenticated = () => useAuthStore((state) => state.status === 'authenticated');
export const useIsAdmin = () => useAuthStore((state) => state.user?.rol?.esAdmin ?? false);
