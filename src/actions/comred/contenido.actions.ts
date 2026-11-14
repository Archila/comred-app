import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type {
  CategoriaContenido,
  FeedPublicacionesParams,
  IncidentePublico,
  IncidentesParams,
  PaginatedResult,
  Publicacion,
  SeccionContenido,
} from '@/models';

/** Desenvuelve un listado paginado del API a la forma que usan las pantallas. */
function paginado<T>(
  items: T[],
  metadata: { total?: number; page?: number; limit?: number } | null | undefined,
  params: { page?: number; limit?: number },
): PaginatedResult<T> {
  const page = metadata?.page ?? params.page ?? 1;
  const limit = metadata?.limit ?? params.limit ?? items.length;
  const total = metadata?.total ?? items.length;

  return { items, total, page, limit, hasNextPage: limit > 0 && page * limit < total };
}

/**
 * Contenido publico. Todas estas rutas se autentican con las cabeceras del
 * dispositivo que el cliente HTTP ya inyecta: funcionan sin sesion.
 */
export const contenidoActions = {
  /** `GET /comred/contenido/publico/secciones/:seccion/categorias` */
  async categorias(seccion: SeccionContenido): Promise<CategoriaContenido[]> {
    const response = await api.get<CategoriaContenido[]>(ENDPOINTS.contenido.categorias(seccion));
    return response.data ?? [];
  },

  /**
   * `GET /comred/contenido/publico/publicaciones`
   *
   * Ordenadas por prioridad y fecha, como las decide el panel. Solo trae lo
   * publicado y visible para este aparato: el API filtra, no la app.
   */
  async publicaciones(params: FeedPublicacionesParams = {}): Promise<PaginatedResult<Publicacion>> {
    const response = await api.get<Publicacion[]>(ENDPOINTS.contenido.publicaciones, { params });
    return paginado(response.data ?? [], response.metadata, params);
  },

  /** `GET /comred/contenido/publico/publicaciones/:id` */
  async publicacion(id: string): Promise<Publicacion> {
    const response = await api.get<Publicacion>(ENDPOINTS.contenido.publicacionById(id));
    return response.data;
  },

  /** `GET /comred/contenido/publico/incidentes` */
  async incidentes(params: IncidentesParams = {}): Promise<PaginatedResult<IncidentePublico>> {
    const response = await api.get<IncidentePublico[]>(ENDPOINTS.contenido.incidentes, { params });
    return paginado(response.data ?? [], response.metadata, params);
  },
};
