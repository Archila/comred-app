import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { panelContenidoActions, publicacionesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { formatHora } from '@/lib';
import type { EstadoJornada, ImagenComprimida, VisibilidadPublicacion } from '@/models';

import type { Coordenadas } from '../use-mi-ubicacion';
import type { GrupoDestino } from './use-crear-publicacion';

/** Lo que llena el formulario de nueva jornada. */
export interface BorradorJornada {
  /** El tipo de jornada: una tarjeta de Jornadas. */
  categoriaContenidoId: string;
  /** Nombre de la jornada y titulo de su publicacion: es el mismo texto. */
  titulo: string;
  fechaInicio: Date | null;
  /** `null` = un solo dia. */
  fechaFin: Date | null;
  /** Vacio = se toma de las horas de inicio y fin (`horarioDe`). */
  horario: string;
  lugar: string;
  /** Institucion organizadora. */
  institucion: string;
  contacto: string;
  /** Comunidad beneficiada. */
  comunidad: string;
  /** La descripcion corta: la de la jornada y la que se lee en el visor. */
  descripcion: string;
  servicios: string;
  requisitos: string;
  ubicacion: Coordenadas | null;
  /** `null` = el que corresponda a las fechas; lo calcula el API. */
  estado: EstadoJornada | null;
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

/**
 * Horario para la gente. El escrito manda; sin el, el de las horas de inicio
 * y fin ("8:00 a 15:00"), que en una jornada de varios dias es el de cada dia.
 * Sin fin no hay horario que deducir: el detalle muestra la hora de inicio.
 */
export function horarioDe(borrador: Pick<BorradorJornada, 'horario' | 'fechaInicio' | 'fechaFin'>) {
  const escrito = opcional(borrador.horario);
  if (escrito) return escrito;
  if (!borrador.fechaInicio || !borrador.fechaFin) return undefined;
  return `${formatHora(borrador.fechaInicio)} a ${formatHora(borrador.fechaFin)}`;
}

export type FaseJornada = 'inactiva' | 'subiendo' | 'registrando' | 'publicando';

/**
 * Registra una jornada y su publicacion, vinculada a ella: la jornada guarda
 * los datos (fecha, lugar, requisitos...) y la publicacion es lo que se ve en
 * el visor, con las fotos.
 *
 * Igual que `useReportarIncidente`, lo ya hecho se recuerda (fotos subidas e
 * id de la jornada): si falla la publicacion, reintentar no crea otra jornada
 * ni vuelve a subir las fotos. `retry: false` porque una respuesta perdida
 * puede ser una jornada ya creada.
 */
export function useCrearJornada() {
  const queryClient = useQueryClient();
  const [fase, setFase] = useState<FaseJornada>('inactiva');
  const subidas = useRef(new Map<string, string>());
  const jornadaId = useRef<string | null>(null);
  // En estado y no leido del ref: la pantalla lo pinta.
  const [registrada, setRegistrada] = useState(false);

  const mutation = useMutation({
    mutationFn: async (borrador: BorradorJornada) => {
      const pendientes = borrador.imagenes.filter((imagen) => !subidas.current.has(imagen.id));
      if (pendientes.length > 0) {
        setFase('subiendo');
        const archivos = await publicacionesActions.subirImagenes(pendientes);
        pendientes.forEach((imagen, indice) => subidas.current.set(imagen.id, archivos[indice].url));
      }

      if (!jornadaId.current) {
        setFase('registrando');
        const creada = await panelContenidoActions.crearJornada({
          categoriaContenidoId: borrador.categoriaContenidoId,
          nombre: borrador.titulo.trim(),
          descripcion: opcional(borrador.descripcion),
          institucion: opcional(borrador.institucion),
          // El formulario no deja llegar aqui sin fecha de inicio.
          fechaInicio: borrador.fechaInicio!.toISOString(),
          fechaFin: borrador.fechaFin?.toISOString(),
          horario: horarioDe(borrador),
          lugar: opcional(borrador.lugar),
          comunidad: opcional(borrador.comunidad),
          servicios: opcional(borrador.servicios),
          requisitos: opcional(borrador.requisitos),
          contacto: opcional(borrador.contacto),
          // Seis decimales: unos 10 cm, lo mismo que guarda el API.
          latitud: borrador.ubicacion ? Number(borrador.ubicacion.latitud.toFixed(6)) : undefined,
          longitud: borrador.ubicacion ? Number(borrador.ubicacion.longitud.toFixed(6)) : undefined,
          estado: borrador.estado ?? undefined,
        });
        jornadaId.current = creada.id;
        setRegistrada(true);
      }

      setFase('publicando');
      const grupo = borrador.visibilidad === 'GRUPO' ? borrador.grupo : null;
      await publicacionesActions.crear({
        seccion: 'JORNADAS',
        // La tarjeta la pone el API: la de la jornada.
        jornadaId: jornadaId.current!,
        titulo: borrador.titulo.trim(),
        descripcion: borrador.descripcion.trim(),
        // Sin dependencia: quien organiza ya sale de la jornada ("Organiza").
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

      return { jornadaId: jornadaId.current, categoriaContenidoId: borrador.categoriaContenidoId };
    },
    retry: false,
    onSuccess: () => {
      subidas.current.clear();
      jornadaId.current = null;
      setRegistrada(false);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contenido.all });
    },
    onSettled: () => setFase('inactiva'),
  });

  return {
    ...mutation,
    fase,
    /** Si la jornada ya quedo registrada y lo que fallo fue la publicacion. */
    jornadaRegistrada: registrada,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
    /** Olvida lo hecho a medias: el siguiente envio empieza de cero. */
    olvidar: () => {
      subidas.current.clear();
      jornadaId.current = null;
      setRegistrada(false);
      mutation.reset();
    },
  };
}
