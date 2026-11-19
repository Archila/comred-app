import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { panelContenidoActions, publicacionesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { fechaSinHora } from '@/lib';
import type { EstadoProyecto, ImagenComprimida, VisibilidadPublicacion } from '@/models';

import type { Coordenadas } from '../use-mi-ubicacion';
import type { GrupoDestino } from './use-crear-publicacion';

/** Lo que llena el formulario de nuevo proyecto. */
export interface BorradorProyecto {
  /** El tipo de proyecto: una tarjeta de Proyectos. */
  categoriaContenidoId: string;
  /** Nombre del proyecto y titulo de su publicacion: es el mismo texto. */
  titulo: string;
  /** La descripcion corta: la que se lee en el visor, bajo la foto. */
  descripcion: string;
  /** Alcance de la obra, para "Sobre el proyecto". Vacio = la descripcion corta. */
  detalle: string;
  /** Comunidad beneficiada. */
  comunidad: string;
  /** Dependencia responsable. */
  dependencia: string;
  /** Solo cuenta el dia: el selector la deja a mediodia local. */
  fechaInicio: Date | null;
  /** `null` = sin fecha prevista. */
  fechaFinPrevista: Date | null;
  estado: EstadoProyecto;
  /** Texto del campo, 0-100. Vacio = sin dato comprobado, que no es 0. */
  avance: string;
  ubicacion: Coordenadas | null;
  imagenes: ImagenComprimida[];
  /** Desde cuando se ve. `null` = al publicar; futura = programada. */
  fechaPublicacion: Date | null;
  /** Se guarda sin publicar, para terminarla en el panel. */
  borrador: boolean;
  paginaPrincipal: boolean;
  /** `null` = no vence. */
  fechaExpiracion: Date | null;
  prioridad: number;
  visibilidad: VisibilidadPublicacion;
  grupo: GrupoDestino | null;
}

function opcional(texto: string): string | undefined {
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : undefined;
}

/** El avance escrito como numero, o `undefined` si se dejo vacio. */
export function avanceDe(borrador: Pick<BorradorProyecto, 'avance'>): number | undefined {
  const texto = borrador.avance.trim();
  return texto === '' ? undefined : Number(texto);
}

export type FaseProyecto = 'inactiva' | 'subiendo' | 'registrando' | 'publicando';

/**
 * Registra un proyecto y su primera publicacion, vinculada a el: el proyecto
 * guarda los datos (fechas, estado, avance, dependencia...) y la publicacion
 * es lo que se ve en el visor, con las fotos. Las siguientes publicaciones son
 * el seguimiento de la obra ("Nueva publicacion").
 *
 * Igual que `useCrearJornada`, lo ya hecho se recuerda (fotos subidas e id
 * del proyecto): si falla la publicacion, reintentar no crea otro proyecto ni
 * vuelve a subir las fotos. `retry: false` porque una respuesta perdida puede
 * ser un proyecto ya creado.
 */
export function useCrearProyecto() {
  const queryClient = useQueryClient();
  const [fase, setFase] = useState<FaseProyecto>('inactiva');
  const subidas = useRef(new Map<string, string>());
  const proyectoId = useRef<string | null>(null);
  // En estado y no leido del ref: la pantalla lo pinta.
  const [registrado, setRegistrado] = useState(false);

  const mutation = useMutation({
    mutationFn: async (borrador: BorradorProyecto) => {
      const pendientes = borrador.imagenes.filter((imagen) => !subidas.current.has(imagen.id));
      if (pendientes.length > 0) {
        setFase('subiendo');
        const archivos = await publicacionesActions.subirImagenes(pendientes);
        pendientes.forEach((imagen, indice) => subidas.current.set(imagen.id, archivos[indice].url));
      }

      if (!proyectoId.current) {
        setFase('registrando');
        const creado = await panelContenidoActions.crearProyecto({
          categoriaContenidoId: borrador.categoriaContenidoId,
          nombre: borrador.titulo.trim(),
          descripcion: opcional(borrador.detalle) ?? opcional(borrador.descripcion),
          comunidad: opcional(borrador.comunidad),
          dependencia: opcional(borrador.dependencia),
          fechaInicio: borrador.fechaInicio ? fechaSinHora(borrador.fechaInicio) : undefined,
          fechaFinPrevista: borrador.fechaFinPrevista ? fechaSinHora(borrador.fechaFinPrevista) : undefined,
          estado: borrador.estado,
          avance: avanceDe(borrador),
          // Seis decimales: unos 10 cm, lo mismo que guarda el API.
          latitud: borrador.ubicacion ? Number(borrador.ubicacion.latitud.toFixed(6)) : undefined,
          longitud: borrador.ubicacion ? Number(borrador.ubicacion.longitud.toFixed(6)) : undefined,
        });
        proyectoId.current = creado.id;
        setRegistrado(true);
      }

      setFase('publicando');
      const grupo = borrador.visibilidad === 'GRUPO' ? borrador.grupo : null;
      await publicacionesActions.crear({
        seccion: 'PROYECTOS',
        // La tarjeta la pone el API: la del proyecto.
        proyectoId: proyectoId.current!,
        titulo: borrador.titulo.trim(),
        descripcion: borrador.descripcion.trim(),
        // La dependencia tambien va en la publicacion: es la que firma el seguimiento.
        dependencia: opcional(borrador.dependencia),
        comunidad: opcional(borrador.comunidad),
        visibilidad: borrador.visibilidad,
        grupoCategoriaId: grupo?.tipo === 'categoria' ? grupo.id : undefined,
        grupoSubcategoriaId: grupo?.tipo === 'subcategoria' ? grupo.id : undefined,
        estado: borrador.borrador ? 'BORRADOR' : 'PUBLICADA',
        prioridad: borrador.prioridad,
        paginaPrincipal: borrador.paginaPrincipal,
        fechaPublicacion: borrador.fechaPublicacion?.toISOString(),
        fechaExpiracion: borrador.fechaExpiracion?.toISOString(),
        media: borrador.imagenes.map((imagen) => ({
          tipo: 'IMAGEN' as const,
          url: subidas.current.get(imagen.id)!,
        })),
      });

      return { proyectoId: proyectoId.current, categoriaContenidoId: borrador.categoriaContenidoId };
    },
    retry: false,
    onSuccess: () => {
      subidas.current.clear();
      proyectoId.current = null;
      setRegistrado(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contenido.all });
    },
    onSettled: () => setFase('inactiva'),
  });

  return {
    ...mutation,
    fase,
    /** Si el proyecto ya quedo registrado y lo que fallo fue la publicacion. */
    proyectoRegistrado: registrado,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    /** Olvida lo hecho a medias: el siguiente envio empieza de cero. */
    olvidar: () => {
      subidas.current.clear();
      proyectoId.current = null;
      setRegistrado(false);
      mutation.reset();
    },
  };
}
