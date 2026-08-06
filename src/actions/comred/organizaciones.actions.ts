import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type { OrganizacionPublica } from '@/models';

export const organizacionesActions = {
  /**
   * `GET /comred/organizaciones/:id/publica`
   *
   * Bootstrap de la app: marca y arbol de categorias de la organizacion.
   * Es publico (no manda token) y el API lo limita a 5 llamadas por minuto,
   * asi que se cachea agresivamente en el cliente.
   */
  async getPublica(id: string): Promise<OrganizacionPublica> {
    const response = await api.get<OrganizacionPublica>(ENDPOINTS.organizaciones.publica(id));
    return response.data;
  },
};
