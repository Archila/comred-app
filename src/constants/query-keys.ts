import type { PaginationParams } from '@/models';

/**
 * Claves de cache de TanStack Query centralizadas.
 *
 * Tenerlas en un solo lugar evita invalidaciones que no coinciden por un typo
 * y permite invalidar por jerarquia:
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usuarios.all })
 */
export const QUERY_KEYS = {
  auth: {
    all: ['auth'] as const,
    session: () => [...QUERY_KEYS.auth.all, 'session'] as const,
    me: () => [...QUERY_KEYS.auth.all, 'me'] as const,
  },

  usuarios: {
    all: ['usuarios'] as const,
    list: (params?: PaginationParams) => [...QUERY_KEYS.usuarios.all, 'list', params ?? {}] as const,
    detail: (id: number | string) => [...QUERY_KEYS.usuarios.all, 'detail', id] as const,
  },

  organizaciones: {
    all: ['organizaciones'] as const,
    list: (params?: PaginationParams) =>
      [...QUERY_KEYS.organizaciones.all, 'list', params ?? {}] as const,
    detail: (id: number | string) => [...QUERY_KEYS.organizaciones.all, 'detail', id] as const,
    /** Bootstrap publico (marca + categorias) de una organizacion. */
    publica: (id: string) => [...QUERY_KEYS.organizaciones.all, 'publica', id] as const,
  },

} as const;
