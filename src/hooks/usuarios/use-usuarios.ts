import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usuariosActions } from '@/actions';
import { QUERY_KEYS } from '@/constants';
import type { PaginatedResult, PaginationParams, Usuario } from '@/models';

/**
 * PLANTILLA de hooks de un dominio. Copiar para organizaciones, catalogo, etc.
 *
 * Regla: un `useQuery` por lectura, un `useMutation` por escritura, y la
 * invalidacion de cache siempre por la llave raiz del dominio.
 */

export function useUsuarios(params: PaginationParams = {}) {
  return useQuery<PaginatedResult<Usuario>>({
    queryKey: QUERY_KEYS.usuarios.list(params),
    queryFn: () => usuariosActions.list(params),
  });
}

export function useUsuario(id: string | undefined) {
  return useQuery<Usuario>({
    queryKey: QUERY_KEYS.usuarios.detail(id ?? ''),
    queryFn: () => usuariosActions.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCreateUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usuariosActions.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usuarios.all });
    },
  });
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Usuario> }) =>
      usuariosActions.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usuarios.all });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usuarios.detail(variables.id) });
    },
  });
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usuariosActions.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usuarios.all });
    },
  });
}
