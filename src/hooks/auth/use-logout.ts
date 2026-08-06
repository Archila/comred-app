import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuthStore } from '@/store';

/**
 * Cierra sesion: limpia el store, el almacenamiento seguro y la cache del API.
 * El guard de `app/_layout.tsx` se encarga de mandar al login.
 */
export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await logout();
    queryClient.clear();
  }, [logout, queryClient]);
}
