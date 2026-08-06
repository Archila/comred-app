import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { useAuthStore } from '@/store';
import type { AuthSession, LoginPayload } from '@/models';

/**
 * Login del usuario.
 *
 * No navega: al guardar la sesion cambia `status` en el store y el guard de
 * `app/_layout.tsx` redirige solo. Asi la navegacion tiene una sola fuente.
 */
export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  const mutation = useMutation<AuthSession, unknown, LoginPayload>({
    mutationFn: (payload) => authActions.login(payload),
    onSuccess: async (session) => {
      await setSession(session);
      // Sesion nueva: se descarta la cache del usuario anterior.
      queryClient.clear();
    },
  });

  return {
    login: mutation.mutate,
    loginAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    /** Mensaje ya normalizado, listo para pintar bajo el formulario. */
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    reset: mutation.reset,
  };
}
