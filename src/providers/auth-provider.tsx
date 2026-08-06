import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type PropsWithChildren } from 'react';

import { setUnauthorizedHandler } from '@/api';
import { useAuthStore } from '@/store';

/**
 * Arranque de la sesion.
 *
 * 1. Restaura el token guardado y lo valida contra el API (`bootstrap`).
 * 2. Conecta el interceptor 401 con el `logout` del store: si el API rechaza
 *    el token en cualquier peticion, la app cierra sesion sola.
 *
 * Debe ir DENTRO de `QueryProvider` porque limpia la cache al desloguear.
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void logout();
      queryClient.clear();
    });

    return () => setUnauthorizedHandler(null);
  }, [logout, queryClient]);

  return <>{children}</>;
}
