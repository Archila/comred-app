import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type {
  AlcancePayload,
  CapacidadesEnvio,
  CrearMensajePayload,
  EnvioMensaje,
  EnviosParams,
  HistorialParams,
  MensajeCreado,
  MensajeDetalle,
  MensajeHistorial,
  PaginatedResult,
  PreviewMensaje,
} from '@/models';

/** `metadata` del API -> `PaginatedResult`, como en `usuariosActions.list`. */
function paginado<T>(
  items: T[],
  metadata: { page?: number; limit?: number; total?: number } | null,
  params: { page?: number; limit?: number },
): PaginatedResult<T> {
  const page = metadata?.page ?? params.page ?? 1;
  const limit = metadata?.limit ?? params.limit ?? items.length;
  const total = metadata?.total ?? items.length;
  return { items, total, page, limit, hasNextPage: limit > 0 && page * limit < total };
}

export const mensajesActions = {
  /**
   * `GET /comred/mensajes`
   *
   * Avisos enviados por la organizacion, del mas reciente al mas antiguo.
   * Exige `MSG_LEER`.
   */
  async historial(params: HistorialParams = {}): Promise<PaginatedResult<MensajeHistorial>> {
    const response = await api.get<MensajeHistorial[]>(ENDPOINTS.mensajes.base, { params });
    return paginado(response.data ?? [], response.metadata, params);
  },

  /** `GET /comred/mensajes/:id` — con el resumen de entrega y lecturas. */
  async detalle(id: string): Promise<MensajeDetalle> {
    const response = await api.get<MensajeDetalle>(ENDPOINTS.mensajes.byId(id));
    return response.data;
  },

  /**
   * `GET /comred/mensajes/:id/envios`
   *
   * Entrega telefono por telefono. Exige `MSG_AUDITORIA`. No incluye el token
   * de push: el API nunca lo devuelve.
   */
  async envios(id: string, params: EnviosParams = {}): Promise<PaginatedResult<EnvioMensaje>> {
    const response = await api.get<EnvioMensaje[]>(ENDPOINTS.mensajes.envios(id), { params });
    return paginado(response.data ?? [], response.metadata, params);
  },

  /**
   * `POST /comred/mensajes/:id/reintentar`
   *
   * Reanuda un envio a medias. Es seguro repetirlo: no vuelve a notificar a
   * quien ya lo recibio. Rechazado si el aviso ya se entrego entero.
   */
  async reintentar(id: string): Promise<void> {
    await api.post(ENDPOINTS.mensajes.reintentar(id));
  },

  /**
   * `GET /comred/mensajes/capacidades`
   *
   * Que puede enviar el usuario y a quien. Responde a cualquier sesion: quien
   * no puede enviar recibe `puedeEnviar: false`, no un 403.
   */
  async capacidades(): Promise<CapacidadesEnvio> {
    const response = await api.get<CapacidadesEnvio>(ENDPOINTS.mensajes.capacidades);
    return response.data;
  },

  /**
   * `POST /comred/mensajes/preview`
   *
   * Cuantos telefonos alcanzaria el aviso, sin enviar nada. El API lo limita a
   * 30 por minuto: se llama al pulsar "Revisar", no a cada cambio del
   * formulario.
   */
  async preview(payload: AlcancePayload): Promise<PreviewMensaje> {
    const response = await api.post<PreviewMensaje>(ENDPOINTS.mensajes.preview, payload);
    return response.data;
  },

  /**
   * `POST /comred/mensajes`
   *
   * Registra el aviso y lo encola. NO es idempotente: cada llamada es un aviso
   * nuevo que suena en todos los telefonos. El API lo limita a 10 por minuto.
   */
  async crear(payload: CrearMensajePayload): Promise<MensajeCreado> {
    const response = await api.post<MensajeCreado>(ENDPOINTS.mensajes.base, payload);
    return response.data;
  },
};
