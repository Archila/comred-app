import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { bandejaActions } from '@/actions';
import { QUERY_KEYS } from '@/constants';
import type { BandejaParams, BandejaResult } from '@/models';

/**
 * Bandeja del dispositivo.
 *
 * `staleTime` a cero y `refetchOnWindowFocus` a proposito: el servidor es la
 * fuente de verdad y la app tiene que resincronizar al volver del segundo
 * plano, que es justo cuando puede haberse perdido una notificacion. Una
 * bandeja cacheada que no se refresca reproduce el problema que esta pantalla
 * existe para resolver.
 *
 * El API limita esta ruta a 30 llamadas por minuto: de sobra para abrir,
 * refrescar y volver del segundo plano, pero no para un `refetchInterval`
 * corto. Si en el futuro hiciera falta sondeo, que sea de minutos.
 */
export function useBandeja(params: BandejaParams = {}) {
  return useQuery<BandejaResult>({
    queryKey: QUERY_KEYS.bandeja.list(params),
    queryFn: () => bandejaActions.list(params),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

/** Contador para el icono, sin traerse el historial entero. */
export function useNoLeidos() {
  const query = useBandeja({ limit: 1, soloNoLeidos: true });
  return { ...query, noLeidos: query.data?.noLeidos ?? 0 };
}

/**
 * Acuse de recibo.
 *
 * Se invalida por la llave raiz del dominio y no solo por la lista actual: el
 * contador de no leidos vive en la metadata de CUALQUIER consulta de bandeja,
 * asi que invalidar solo la pagina visible dejaria el icono desfasado.
 *
 * No lleva actualizacion optimista: el acuse es un dato de auditoria —cuando se
 * entero esta persona— y conviene que lo que se pinta sea lo que el servidor
 * confirmo, no lo que la app supuso.
 */
export function useMarcarLeido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mensajeId: string) => bandejaActions.marcarLeido(mensajeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bandeja.all });
    },
  });
}
