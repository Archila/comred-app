import { QueryClient } from '@tanstack/react-query';

import { ApiException } from './api-error';

/**
 * Configuracion global de TanStack Query.
 *
 * Criterios pensados para uso movil con conexion intermitente:
 *   - `staleTime` de 1 minuto: evita refetch en cada navegacion entre tabs.
 *   - No reintentar errores 4xx (el request esta mal, reintentarlo no ayuda).
 *   - Si reintentar errores de red y 5xx, con backoff exponencial.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof ApiException) {
            const isClientError = error.statusCode >= 400 && error.statusCode < 500;
            if (isClientError) return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        // `QueryProvider` traduce `AppState -> active` a foco. Apagado por
        // defecto para no recargar todo al volver del background; la query
        // que lo necesite (la bandeja) lo enciende por su cuenta.
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Una mutacion fallida nunca se reintenta sola: la repite el usuario.
        retry: false,
      },
    },
  });
}
