import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { publicacionesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import type {
  CrearPublicacionPayload,
  ImagenComprimida,
  SeccionContenido,
  VisibilidadPublicacion,
} from '@/models';

/** Cuando sale: ya, en una fecha, o se guarda para terminarla en el panel. */
export type MomentoPublicacion = 'ahora' | 'programada' | 'borrador';

/** Con visibilidad GRUPO: una categoria entera o una subcategoria concreta. */
export interface GrupoDestino {
  tipo: 'categoria' | 'subcategoria';
  id: string;
}

/** Lo que llena el formulario de nueva publicacion. */
export interface BorradorPublicacion {
  seccion: SeccionContenido;
  /** Tarjeta. Vacio en la pagina principal, que no tiene. */
  categoriaContenidoId: string;
  /** Incidente, jornada o proyecto, segun la seccion. Vacio = ninguno. */
  entidadId: string;
  titulo: string;
  descripcion: string;
  dependencia: string;
  comunidad: string;
  visibilidad: VisibilidadPublicacion;
  grupo: GrupoDestino | null;
  momento: MomentoPublicacion;
  /** Solo con `momento: 'programada'`. */
  fechaPublicacion: Date | null;
  /** `null` = no vence. */
  fechaExpiracion: Date | null;
  prioridad: number;
  paginaPrincipal: boolean;
  /** En el orden del carrusel: la primera es la portada. */
  imagenes: ImagenComprimida[];
}

/** Que entidad admite cada seccion. Las demas no se vinculan a ninguna. */
const CAMPO_ENTIDAD: Partial<Record<SeccionContenido, 'incidenteId' | 'jornadaId' | 'proyectoId'>> = {
  REPORTES: 'incidenteId',
  JORNADAS: 'jornadaId',
  PROYECTOS: 'proyectoId',
};

/** Texto opcional: vacio no se envia, para no guardar cadenas vacias. */
function opcional(texto: string): string | undefined {
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : undefined;
}

function aPayload(borrador: BorradorPublicacion, urls: Map<string, string>): CrearPublicacionPayload {
  const campoEntidad = CAMPO_ENTIDAD[borrador.seccion];
  const grupo = borrador.visibilidad === 'GRUPO' ? borrador.grupo : null;

  return {
    seccion: borrador.seccion,
    categoriaContenidoId: opcional(borrador.categoriaContenidoId),
    ...(campoEntidad && borrador.entidadId ? { [campoEntidad]: borrador.entidadId } : {}),
    titulo: borrador.titulo.trim(),
    descripcion: borrador.descripcion.trim(),
    dependencia: opcional(borrador.dependencia),
    comunidad: opcional(borrador.comunidad),
    visibilidad: borrador.visibilidad,
    grupoCategoriaId: grupo?.tipo === 'categoria' ? grupo.id : undefined,
    grupoSubcategoriaId: grupo?.tipo === 'subcategoria' ? grupo.id : undefined,
    estado: borrador.momento === 'borrador' ? 'BORRADOR' : 'PUBLICADA',
    prioridad: borrador.prioridad,
    paginaPrincipal: borrador.paginaPrincipal,
    // Publicar "ahora" sin fecha: la pone el API con su reloj, no el del telefono.
    fechaPublicacion:
      borrador.momento === 'programada' ? borrador.fechaPublicacion?.toISOString() : undefined,
    fechaExpiracion: borrador.fechaExpiracion?.toISOString(),
    media: borrador.imagenes.map((imagen) => ({ tipo: 'IMAGEN' as const, url: urls.get(imagen.id)! })),
  };
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
      return publicacionesActions.crear(aPayload(borrador, subidas.current));
    },
    retry: false,
    onSuccess: () => {
      subidas.current.clear();
      // Por la raiz: la publicacion aparece en el visor, en el inicio y en lo
      // que la cuente.
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
