import { useMutation, useQueryClient } from '@tanstack/react-query';

import { panelContenidoActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { comprimirImagen, elegirImagenes } from '@/lib';

/**
 * Cambia la foto de una tarjeta (un tipo de desastre, una jornada...): elegir
 * en la galeria, comprimir, subir y guardarla en la tarjeta.
 *
 * Devuelve `false` si la persona cancelo la galeria, para no mostrar nada.
 */
export function useCambiarPortada() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (categoriaId: string): Promise<boolean> => {
      const [elegida] = await elegirImagenes(1);
      if (!elegida) return false;

      const imagen = await comprimirImagen(elegida.uri);
      const archivo = await panelContenidoActions.subirPortada(imagen);
      await panelContenidoActions.cambiarPortada(categoriaId, archivo.url);
      return true;
    },
    retry: false,
    onSuccess: (cambiada) => {
      if (cambiada) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contenido.all });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
