import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { publicacionesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import type { ImagenComprimida, SeccionContenido } from '@/models';

/** Lo que llena el formulario de nueva publicacion. */
export interface BorradorPublicacion {
  seccion: SeccionContenido;
  categoriaContenidoId: string;
  titulo: string;
  descripcion: string;
  /** En el orden del carrusel: la primera es la portada. */
  imagenes: ImagenComprimida[];
}

/** En que paso va la publicacion, para que el boton diga que esta pasando. */
export type FasePublicacion = 'inactiva' | 'subiendo' | 'publicando';

/**
 * Publica desde el telefono: sube las fotos y crea la publicacion con ellas.
 *
 * Son dos peticiones y la segunda puede fallar con la primera ya hecha. Las
 * fotos subidas se recuerdan por su id: al reintentar no se vuelven a subir
 * (ni dejan copias huerfanas en el servidor), solo se repite el alta.
 *
 * `retry: false` por lo mismo que el envio de avisos: si se pierde la
 * respuesta, la publicacion puede haber salido, y repetirla la duplicaria.
 */
export function useCrearPublicacion() {
  const queryClient = useQueryClient();
  const [fase, setFase] = useState<FasePublicacion>('inactiva');
  const subidas = useRef(new Map<string, string>());

  const mutation = useMutation({
    mutationFn: async (borrador: BorradorPublicacion) => {
      const pendientes = borrador.imagenes.filter((imagen) => !subidas.current.has(imagen.id));

      if (pendientes.length > 0) {
        setFase('subiendo');
        const archivos = await publicacionesActions.subirImagenes(pendientes);
        pendientes.forEach((imagen, indice) => subidas.current.set(imagen.id, archivos[indice].url));
      }

      setFase('publicando');
      return publicacionesActions.crear({
        seccion: borrador.seccion,
        categoriaContenidoId: borrador.categoriaContenidoId,
        titulo: borrador.titulo.trim(),
        descripcion: borrador.descripcion.trim(),
        estado: 'PUBLICADA',
        media: borrador.imagenes.map((imagen) => ({
          tipo: 'IMAGEN' as const,
          url: subidas.current.get(imagen.id)!,
        })),
      });
    },
    retry: false,
    onSuccess: () => {
      subidas.current.clear();
      // Por la raiz: la publicacion aparece en el visor y en lo que lo cuente.
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contenido.all });
    },
    onSettled: () => setFase('inactiva'),
  });

  return {
    ...mutation,
    fase,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
