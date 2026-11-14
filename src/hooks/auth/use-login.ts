import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authActions } from '@/actions';
import { ApiException, getErrorMessage } from '@/api';
import { env } from '@/config';
import { QUERY_KEYS } from '@/constants';
import { useAuthStore } from '@/store';
import type { LoginPayload, LoginResponse } from '@/models';

/**
 * Login del usuario.
 *
 * No navega: al guardar la sesion cambia `status` en el store y el guard de
 * `app/_layout.tsx` saca el login del stack, lo que devuelve a la app. Asi la
 * navegacion tiene una sola fuente.
 */
export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();

  const mutation = useMutation<LoginResponse, unknown, LoginPayload>({
    mutationFn: (payload) => authActions.login(payload),
    onSuccess: async ({ dispositivoVinculado, ...session }) => {
      // La sesion vale igual: el API no bloquea el login por el vinculo. Pero
      // sin el, el aparato solo recibe avisos generales, y conviene verlo.
      if (!dispositivoVinculado && env.isDevelopment) {
        console.warn('[login] El dispositivo no quedo vinculado al usuario en el API.');
      }

      await setSession(session);
      // Sesion nueva: se descarta la cache del usuario anterior.
      queryClient.clear();
    },
    onError: (error) => {
      // 426: el API rechazo este binario por obsoleto. La version en cache
      // estaba desfasada (el minimo subio hace menos de 15 min); al refrescarla
      // el navegador raiz levanta el muro de actualizacion.
      if (error instanceof ApiException && error.statusCode === 426) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizaciones.all });
      }
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
