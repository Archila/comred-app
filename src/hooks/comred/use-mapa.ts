import { useQuery } from '@tanstack/react-query';

import { mapaActions } from '@/actions';
import { QUERY_KEYS } from '@/constants';

/**
 * Capas, figuras y contorno del mapa. Cambian poco (las edita el panel), y la
 * respuesta puede pesar cientos de KB: se guarda una hora antes de volver a
 * pedirla.
 */
export function useCapasMapa() {
  return useQuery({
    queryKey: QUERY_KEYS.mapa.capas(),
    queryFn: () => mapaActions.capas(),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/** Ficha de un elemento. Solo se pide al tocarlo. */
export function useElementoGeografico(id: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.mapa.elemento(id ?? ''),
    queryFn: () => mapaActions.elemento(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}
