import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { panelContenidoActions, publicacionesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import type {
  EstadoIncidente,
  ImagenComprimida,
  VerificacionIncidente,
} from '@/models';

/** Lo que llena el formulario de reporte de desastre. */
export interface BorradorIncidente {
  /** Tipo de desastre: una tarjeta de Reportes. */
  categoriaContenidoId: string;
  nombre: string;
  descripcion: string;
  comunidad: string;
  /** Texto tal como se escribe; se convierte al enviar. */
  latitud: string;
  longitud: string;
  fechaReporte: Date;
  estado: EstadoIncidente;
  verificacion: VerificacionIncidente;
  instituciones: string;
  afectaciones: string;
  recomendaciones: string;
  /**
   * El visor muestra publicaciones, no incidentes: sin una publicacion el
   * reporte solo marcaria la tarjeta. Por eso, por defecto, se crea la
   * primera con las fotos y la descripcion.
   */
  publicar: boolean;
  paginaPrincipal: boolean;
  imagenes: ImagenComprimida[];
}

function opcional(texto: string): string | undefined {
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : undefined;
}

/** Coordenada escrita a mano ("14,83" o "14.83"). `undefined` si esta vacia. */
export function leerCoordenada(texto: string): number | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return undefined;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : Number.NaN;
}

export type FaseReporte = 'inactiva' | 'subiendo' | 'registrando' | 'publicando';

/**
 * Registra un desastre: el incidente y, si se pide, su primera publicacion
 * con las fotos, vinculada a el.
 *
 * Son hasta tres peticiones. Lo ya hecho se recuerda (fotos subidas e id del
 * incidente): si falla la publicacion, reintentar no vuelve a crear el
 * incidente ni a subir las fotos.
 */
export function useReportarIncidente() {
  const queryClient = useQueryClient();
  const [fase, setFase] = useState<FaseReporte>('inactiva');
  const subidas = useRef(new Map<string, string>());
  const incidenteId = useRef<string | null>(null);
  // En estado y no leido del ref: la pantalla lo pinta.
  const [registrado, setRegistrado] = useState(false);

  const mutation = useMutation({
    mutationFn: async (borrador: BorradorIncidente) => {
      const pendientes = borrador.publicar
        ? borrador.imagenes.filter((imagen) => !subidas.current.has(imagen.id))
        : [];
      if (pendientes.length > 0) {
        setFase('subiendo');
        const archivos = await publicacionesActions.subirImagenes(pendientes);
        pendientes.forEach((imagen, indice) => subidas.current.set(imagen.id, archivos[indice].url));
      }

      if (!incidenteId.current) {
        setFase('registrando');
        const creado = await panelContenidoActions.crearIncidente({
          categoriaContenidoId: borrador.categoriaContenidoId,
          nombre: borrador.nombre.trim(),
          descripcion: opcional(borrador.descripcion),
          comunidad: opcional(borrador.comunidad),
          latitud: leerCoordenada(borrador.latitud),
          longitud: leerCoordenada(borrador.longitud),
          estado: borrador.estado,
          verificacion: borrador.verificacion,
          fechaReporte: borrador.fechaReporte.toISOString(),
          instituciones: opcional(borrador.instituciones),
          afectaciones: opcional(borrador.afectaciones),
          recomendaciones: opcional(borrador.recomendaciones),
        });
        incidenteId.current = creado.id;
        setRegistrado(true);
      }

      if (borrador.publicar) {
        setFase('publicando');
        await publicacionesActions.crear({
          seccion: 'REPORTES',
          // La tarjeta la pone el API: la del incidente.
          incidenteId: incidenteId.current!,
          titulo: borrador.nombre.trim(),
          descripcion: borrador.descripcion.trim(),
          comunidad: opcional(borrador.comunidad),
          visibilidad: 'PUBLICA',
          estado: 'PUBLICADA',
          // Una alerta oficial va antes que el resto en su seccion.
          prioridad: borrador.verificacion === 'ALERTA_OFICIAL' ? 100 : 0,
          paginaPrincipal: borrador.paginaPrincipal,
          media: borrador.imagenes.map((imagen) => ({
            tipo: 'IMAGEN' as const,
            url: subidas.current.get(imagen.id)!,
          })),
        });
      }

      return { incidenteId: incidenteId.current, categoriaContenidoId: borrador.categoriaContenidoId };
    },
    retry: false,
    onSuccess: () => {
      subidas.current.clear();
      incidenteId.current = null;
      setRegistrado(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contenido.all });
    },
    onSettled: () => setFase('inactiva'),
  });

  return {
    ...mutation,
    fase,
    /** Si el incidente ya quedo registrado y lo que fallo fue la publicacion. */
    incidenteRegistrado: registrado,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    /** Olvida lo hecho a medias: el siguiente envio empieza de cero. */
    olvidar: () => {
      subidas.current.clear();
      incidenteId.current = null;
      setRegistrado(false);
      mutation.reset();
    },
  };
}
