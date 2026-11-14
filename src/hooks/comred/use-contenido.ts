import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { contenidoActions } from '@/actions';
import { QUERY_KEYS } from '@/constants';
import type {
  CategoriaContenido,
  EntidadesParams,
  IncidentePublico,
  IncidentesParams,
  JornadaPublica,
  ProyectoPublico,
  Publicacion,
  SeccionContenido,
} from '@/models';

/**
 * Publicaciones por pagina del visor. Cada una ocupa la pantalla entera, asi
 * que diez dan para un buen rato de deslizar sin pedir mas.
 */
const POR_PAGINA = 10;

/**
 * Tope de tarjetas vacias que se saltan en una sola peticion al pasar a la
 * siguiente. Evita una cadena larga de llamadas si casi todas estan vacias.
 */
const MAX_SALTOS = 5;

/** Tarjetas de la pantalla de categorias de una seccion. */
export function useCategoriasContenido(seccion: SeccionContenido) {
  return useQuery({
    queryKey: QUERY_KEYS.contenido.categorias(seccion),
    queryFn: () => contenidoActions.categorias(seccion),
  });
}

/**
 * Incidentes de la organizacion. La pantalla de Reportes los usa para marcar
 * las tarjetas con una emergencia activa (Plan Maestro, 5.3).
 */
export function useIncidentesPublicos(params: IncidentesParams = {}, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.contenido.incidentes(params),
    queryFn: () => contenidoActions.incidentes(params),
    enabled,
  });
}

/**
 * Jornadas de la organizacion. La pantalla de Jornadas las usa para marcar
 * las tarjetas con actividades proximas o en desarrollo (Plan Maestro, 7).
 */
export function useJornadasPublicas(params: EntidadesParams = {}, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.contenido.jornadas(params),
    queryFn: () => contenidoActions.jornadas(params),
    enabled,
  });
}

/** Proyectos de la organizacion, para marcar las tarjetas con obras en marcha. */
export function useProyectosPublicos(params: EntidadesParams = {}, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.contenido.proyectos(params),
    queryFn: () => contenidoActions.proyectos(params),
    enabled,
  });
}

/** Una publicacion del visor, con la tarjeta bajo la que se esta mostrando. */
export interface PublicacionVisor {
  publicacion: Publicacion;
  /** La tarjeta de la que salio esta pagina. Con navegacion continua cambia. */
  tarjeta: CategoriaContenido;
}

interface PaginaVisor {
  items: Publicacion[];
  /** Posicion en `orden` de la tarjeta de esta pagina. */
  indice: number;
  page: number;
  hasNextPage: boolean;
}

interface CursorVisor {
  indice: number;
  page: number;
}

/**
 * Visor vertical de una seccion, arrancando en la tarjeta elegida.
 *
 * NAVEGACION CONTINUA (Plan Maestro, 3.4): al terminar las publicaciones de
 * una tarjeta sigue con la siguiente de la lista, en el orden de la pantalla
 * de categorias. Se modela con un cursor `{ indice, page }`: mientras la
 * tarjeta tenga paginas avanza `page`; cuando se acaba, pasa a `indice + 1`.
 * No da la vuelta: al llegar a la ultima tarjeta, el visor termina.
 *
 * Las tarjetas vacias que aparecen DESPUES de la inicial se saltan sin que el
 * usuario lo note. La inicial no: si alguien eligio "Sismos" y no hay nada,
 * tiene que ver que no hay nada, no las publicaciones de otra tarjeta.
 */
export function useVisorPublicaciones({
  seccion,
  categorias,
  categoriaInicialId,
  continua = true,
}: {
  seccion: SeccionContenido;
  categorias: CategoriaContenido[] | undefined;
  categoriaInicialId: string;
  continua?: boolean;
}) {
  // Desde la tarjeta elegida hasta el final de la lista.
  const orden = useMemo(() => {
    if (!categorias) return [];
    const inicio = categorias.findIndex((categoria) => categoria.id === categoriaInicialId);
    if (inicio < 0) return [];
    return continua ? categorias.slice(inicio) : [categorias[inicio]];
  }, [categorias, categoriaInicialId, continua]);

  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.contenido.visor(seccion, categoriaInicialId, continua),
    enabled: orden.length > 0,
    initialPageParam: { indice: 0, page: 1 } as CursorVisor,
    queryFn: async ({ pageParam }): Promise<PaginaVisor> => {
      let { indice, page } = pageParam;

      for (let saltos = 0; ; saltos += 1) {
        const resultado = await contenidoActions.publicaciones({
          seccion,
          categoriaContenidoId: orden[indice].id,
          page,
          limit: POR_PAGINA,
        });

        const esInicial = indice === 0;
        const quedanTarjetas = indice + 1 < orden.length;
        const vacia = page === 1 && resultado.items.length === 0;

        if (!vacia || esInicial || !quedanTarjetas || saltos >= MAX_SALTOS) {
          return { items: resultado.items, indice, page, hasNextPage: resultado.hasNextPage };
        }

        indice += 1;
        page = 1;
      }
    },
    getNextPageParam: (ultima): CursorVisor | undefined => {
      if (ultima.hasNextPage) return { indice: ultima.indice, page: ultima.page + 1 };
      if (ultima.indice + 1 < orden.length) return { indice: ultima.indice + 1, page: 1 };
      return undefined;
    },
  });

  // Aplanado y sin repetidos: si alguien publica mientras se desliza, la
  // paginacion por offset puede devolver una publicacion dos veces.
  const items = useMemo<PublicacionVisor[]>(() => {
    const vistos = new Set<string>();
    const lista: PublicacionVisor[] = [];

    for (const pagina of query.data?.pages ?? []) {
      const tarjeta = orden[pagina.indice];
      if (!tarjeta) continue;
      for (const publicacion of pagina.items) {
        if (vistos.has(publicacion.id)) continue;
        vistos.add(publicacion.id);
        lista.push({ publicacion, tarjeta });
      }
    }
    return lista;
  }, [query.data, orden]);

  return {
    ...query,
    items,
    /** La tarjeta elegida, o `undefined` si el id no existe en la seccion. */
    tarjetaInicial: orden[0] as CategoriaContenido | undefined,
  };
}

/** Resume el estado de los incidentes de cada tarjeta, para marcarlas. */
export interface ResumenIncidentes {
  /** Incidentes que no estan cerrados. */
  activos: number;
  /** Hay al menos una alerta oficial sin cerrar. */
  alertaOficial: boolean;
}

export function resumirIncidentes(
  incidentes: IncidentePublico[] | undefined,
): Record<string, ResumenIncidentes> {
  const resumen: Record<string, ResumenIncidentes> = {};

  for (const incidente of incidentes ?? []) {
    if (incidente.estado === 'CERRADO') continue;
    const actual = (resumen[incidente.categoriaContenidoId] ??= { activos: 0, alertaOficial: false });
    actual.activos += 1;
    if (incidente.verificacion === 'ALERTA_OFICIAL') actual.alertaOficial = true;
  }
  return resumen;
}

/** Resume las jornadas vigentes de cada tarjeta, para marcarlas. */
export interface ResumenJornadas {
  proximas: number;
  enDesarrollo: number;
}

export function resumirJornadas(
  jornadas: JornadaPublica[] | undefined,
): Record<string, ResumenJornadas> {
  const resumen: Record<string, ResumenJornadas> = {};

  for (const jornada of jornadas ?? []) {
    if (jornada.estado !== 'PROXIMA' && jornada.estado !== 'EN_DESARROLLO') continue;
    const actual = (resumen[jornada.categoriaContenidoId] ??= { proximas: 0, enDesarrollo: 0 });
    if (jornada.estado === 'PROXIMA') actual.proximas += 1;
    else actual.enDesarrollo += 1;
  }
  return resumen;
}

/** Cuantos proyectos en ejecucion tiene cada tarjeta. */
export function resumirProyectos(proyectos: ProyectoPublico[] | undefined): Record<string, number> {
  const resumen: Record<string, number> = {};

  for (const proyecto of proyectos ?? []) {
    if (proyecto.estado !== 'EN_EJECUCION') continue;
    resumen[proyecto.categoriaContenidoId] = (resumen[proyecto.categoriaContenidoId] ?? 0) + 1;
  }
  return resumen;
}
