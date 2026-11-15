import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type { CapasMapa, ElementoGeograficoDetalle } from '@/models';

/**
 * Mapa del municipio. Se autentica con las cabeceras del dispositivo que el
 * cliente HTTP ya inyecta: funciona sin sesion.
 */
export const mapaActions = {
  /** `GET /comred/mapa/publico/capas` */
  async capas(): Promise<CapasMapa> {
    const response = await api.get<CapasMapa>(ENDPOINTS.mapa.capas);
    return response.data;
  },

  /** `GET /comred/mapa/publico/elementos/:id` */
  async elemento(id: string): Promise<ElementoGeograficoDetalle> {
    const response = await api.get<ElementoGeograficoDetalle>(ENDPOINTS.mapa.elementoById(id));
    return response.data;
  },
};
