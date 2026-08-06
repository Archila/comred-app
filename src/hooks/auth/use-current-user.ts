import { useQuery } from '@tanstack/react-query';

import { authActions } from '@/actions';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore, useIsAuthenticated } from '@/store';
import type { Usuario } from '@/models';

/**
 * Usuario autenticado, siempre fresco desde `GET /auth/me`.
 *
 * Mientras responde el API se usa como `placeholderData` el usuario que ya
 * esta en el store, para que la pantalla no parpadee.
 */
export function useCurrentUser() {
  const isAuthenticated = useIsAuthenticated();
  const cachedUser = useAuthStore((state) => state.user);

  return useQuery<Usuario>({
    queryKey: QUERY_KEYS.auth.me(),
    queryFn: () => authActions.getCurrentUser(),
    enabled: isAuthenticated,
    placeholderData: cachedUser ?? undefined,
    staleTime: 5 * 60_000,
  });
}
