import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type {
  ActualizarTokenRequest,
  ActualizarTokenResponse,
  CerrarSesionResponse,
  RegistrarDispositivoRequest,
  RegistroDispositivoResponse,
} from '@/models';

export const dispositivosActions = {
  /**
   * `POST /comred/dispositivos/registro`
   *
   * Da de alta el dispositivo en la organizacion del build. Es publico —se
   * llama antes de que exista sesion— y en el API es idempotente por
   * `(organizacionId, instalacionId)`: repetirlo no crea filas nuevas.
   *
   * El throttle del API es estricto (3/min, 20/hora por IP) porque un cliente
   * legitimo solo llega aqui una vez por instalacion. Reintentar en bucle
   * acaba en 429.
   */
  async registrar(
    payload: RegistrarDispositivoRequest,
  ): Promise<RegistroDispositivoResponse> {
    const response = await api.post<RegistroDispositivoResponse>(
      ENDPOINTS.dispositivos.registro,
      payload,
    );
    return response.data;
  },

  /**
   * `PUT /comred/dispositivos/token`
   *
   * FCM rota el token por su cuenta (reinstalar, restaurar una copia, limpiar
   * datos), asi que hay que avisar al API cada vez que cambia. Si no, el
   * servidor seguiria enviando a un token muerto y el aparato se quedaria sin
   * avisos sin que nadie lo note.
   *
   * No necesita sesion: viaja con las cabeceras del dispositivo que el cliente
   * HTTP ya inyecta.
   */
  async actualizarToken(
    payload: ActualizarTokenRequest,
  ): Promise<ActualizarTokenResponse> {
    const response = await api.put<ActualizarTokenResponse>(
      ENDPOINTS.dispositivos.token,
      payload,
    );
    return response.data;
  },

  /**
   * `POST /comred/dispositivos/logout`
   *
   * Cierra en el servidor la sesion abierta en este aparato. A partir de ahi
   * deja de recibir lo dirigido al usuario y sigue recibiendo los avisos
   * generales a la ciudadania.
   */
  async cerrarSesion(): Promise<CerrarSesionResponse> {
    const response = await api.post<CerrarSesionResponse>(
      ENDPOINTS.dispositivos.logout,
    );
    return response.data;
  },
};
