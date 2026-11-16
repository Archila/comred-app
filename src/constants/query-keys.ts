import type {
  BandejaParams,
  EntidadesParams,
  EnviosParams,
  HistorialParams,
  IncidentesParams,
  PaginationParams,
  SeccionContenido,
} from '@/models';

/**
 * Claves de cache de TanStack Query centralizadas.
 *
 * Tenerlas en un solo lugar evita invalidaciones que no coinciden por un typo
 * y permite invalidar por jerarquia:
 *   queryClient.invalidateQueries({ queryKey: QUERY_KEYS.usuarios.all })
 */
export const QUERY_KEYS = {
  auth: {
    all: ['auth'] as const,
    session: () => [...QUERY_KEYS.auth.all, 'session'] as const,
    me: () => [...QUERY_KEYS.auth.all, 'me'] as const,
  },

  usuarios: {
    all: ['usuarios'] as const,
    list: (params?: PaginationParams) => [...QUERY_KEYS.usuarios.all, 'list', params ?? {}] as const,
    detail: (id: number | string) => [...QUERY_KEYS.usuarios.all, 'detail', id] as const,
  },

  /**
   * Bandeja del dispositivo. La invalidacion va SIEMPRE por `all`: el contador
   * de no leidos viaja en la metadata de cualquier consulta, asi que invalidar
   * solo la pagina visible dejaria el icono desfasado.
   */
  bandeja: {
    all: ['bandeja'] as const,
    list: (params?: BandejaParams) => [...QUERY_KEYS.bandeja.all, 'list', params ?? {}] as const,
    infinita: (params?: Omit<BandejaParams, 'page'>) =>
      [...QUERY_KEYS.bandeja.all, 'infinita', params ?? {}] as const,
  },

  /**
   * Envio de avisos. No hace falta el id del usuario en la llave: login y
   * logout vacian la cache entera.
   */
  mensajes: {
    all: ['mensajes'] as const,
    capacidades: () => [...QUERY_KEYS.mensajes.all, 'capacidades'] as const,
    historial: (params?: Omit<HistorialParams, 'page'>) =>
      [...QUERY_KEYS.mensajes.all, 'historial', params ?? {}] as const,
    detalle: (id: string) => [...QUERY_KEYS.mensajes.all, 'detalle', id] as const,
    envios: (id: string, params?: Omit<EnviosParams, 'page'>) =>
      [...QUERY_KEYS.mensajes.all, 'envios', id, params ?? {}] as const,
  },

  /**
   * Contenido publico. Depende de la sesion abierta en el aparato (lo interno
   * de una brigada o COCODE), pero login y logout ya vacian la cache entera.
   */
  contenido: {
    all: ['contenido'] as const,
    categorias: (seccion: SeccionContenido) =>
      [...QUERY_KEYS.contenido.all, 'categorias', seccion] as const,
    /** El visor de una seccion, arrancando en una tarjeta. */
    visor: (seccion: SeccionContenido, categoriaInicialId: string, continua: boolean) =>
      [...QUERY_KEYS.contenido.all, 'visor', seccion, categoriaInicialId, continua] as const,
    paginaPrincipal: (limit: number) =>
      [...QUERY_KEYS.contenido.all, 'pagina-principal', limit] as const,
    incidentes: (params?: IncidentesParams) =>
      [...QUERY_KEYS.contenido.all, 'incidentes', params ?? {}] as const,
    jornadas: (params?: EntidadesParams) =>
      [...QUERY_KEYS.contenido.all, 'jornadas', params ?? {}] as const,
    proyectos: (params?: EntidadesParams) =>
      [...QUERY_KEYS.contenido.all, 'proyectos', params ?? {}] as const,
  },

  /** Mapa del municipio. No depende de la sesion: todo es publico. */
  mapa: {
    all: ['mapa'] as const,
    capas: () => [...QUERY_KEYS.mapa.all, 'capas'] as const,
    elemento: (id: string) => [...QUERY_KEYS.mapa.all, 'elemento', id] as const,
  },

  organizaciones: {
    all: ['organizaciones'] as const,
    list: (params?: PaginationParams) =>
      [...QUERY_KEYS.organizaciones.all, 'list', params ?? {}] as const,
    detail: (id: number | string) => [...QUERY_KEYS.organizaciones.all, 'detail', id] as const,
    /** Bootstrap publico (marca + categorias) de una organizacion. */
    publica: (id: string) => [...QUERY_KEYS.organizaciones.all, 'publica', id] as const,
    /** Version minima y ultima de la app de una organizacion. */
    version: (id: string) => [...QUERY_KEYS.organizaciones.all, 'version', id] as const,
  },

} as const;
