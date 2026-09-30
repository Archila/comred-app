import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type {
  AcuseReciboResponse,
  BandejaParams,
  BandejaResult,
  MensajeBandeja,
} from '@/models';

export const bandejaActions = {
  /**
   * `GET /comred/dispositivos/mensajes`
   *
   * Historial de lo que se le ha enviado a este aparato, del mas reciente al
   * mas antiguo. Se autentica con las cabeceras del dispositivo que el cliente
   * HTTP ya inyecta: no hace falta sesion.
   *
   * Incluye los mensajes cuya notificacion NO sono —sin token de push, entrega
   * fallida— porque son justo los que solo se descubren abriendo la app.
   */
  async list(params: BandejaParams = {}): Promise<BandejaResult> {
    const response = await api.get<MensajeBandeja[]>(
      ENDPOINTS.dispositivos.mensajes,
      { params },
    );

    const items = response.data ?? [];
    const page = response.metadata?.page ?? params.page ?? 1;
    const limit = response.metadata?.limit ?? params.limit ?? items.length;
    const total = response.metadata?.total ?? items.length;
    const noLeidos = Number(response.metadata?.noLeidos ?? 0);

    return {
      items,
      total,
      page,
      limit,
      noLeidos,
      hasNextPage: limit > 0 && page * limit < total,
    };
  },

  /**
   * `POST /comred/dispositivos/mensajes/:id/leido`
   *
   * Acuse de recibo. `mensajeId` es el que viaja en el `data` de la
   * notificacion, asi que se puede llamar desde el tap sin haber abierto la
   * bandeja.
   *
   * Es idempotente en el API y la PRIMERA lectura es la que queda: repetirlo
   * no mueve la fecha. Por eso reintentarlo al recuperar la red es seguro.
   */
  async marcarLeido(mensajeId: string): Promise<AcuseReciboResponse> {
    const response = await api.post<AcuseReciboResponse>(
      ENDPOINTS.dispositivos.marcarLeido(mensajeId),
    );
    return response.data;
  },
};
