import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type { RegistrarDispositivoRequest, RegistroDispositivoResponse } from '@/models';

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
};
