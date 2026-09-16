import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { dispositivosActions } from '@/actions';
import { env } from '@/config';
import { useAuthStore } from '@/store';

/**
 * Cierra sesion: avisa al API, limpia el store, el almacenamiento seguro y la
 * cache. El guard de `app/_layout.tsx` se encarga de mandar al login.
 *
 * El aviso al API es lo que desvincula el aparato del usuario; sin el, el
 * telefono seguiria recibiendo los mensajes dirigidos a alguien que ya se fue.
 * Se hace ANTES de limpiar la sesion local, pero su fallo no la bloquea: dejar
 * al usuario atrapado dentro de la app porque no hay red seria peor, y el
 * vinculo se corrige solo en cuanto alguien vuelva a iniciar sesion.
 */
export function useLogout() {
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  return useCallback(async () => {
    try {
      await dispositivosActions.cerrarSesion();
    } catch (error) {
      if (env.isDevelopment) {
        console.warn('[logout] El API no pudo cerrar la sesion del dispositivo', error);
      }
    }

    await logout();
    queryClient.clear();
  }, [logout, queryClient]);
}
