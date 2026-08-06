import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type { PaginatedResult, PaginationParams, Usuario } from '@/models';

/**
 * PLANTILLA de CRUD paginado. Copiar este archivo para cada nuevo dominio
 * (organizaciones, catalogo, bodega...) cambiando modelo y endpoints.
 *
 * Notese como `list` normaliza `metadata` -> `PaginatedResult`, para que las
 * pantallas de listado no tengan que conocer el envoltorio del API.
 */
export const usuariosActions = {
  async list(params: PaginationParams = {}): Promise<PaginatedResult<Usuario>> {
    const response = await api.get<Usuario[]>(ENDPOINTS.usuarios.base, { params });

    const items = response.data ?? [];
    const page = response.metadata?.page ?? params.page ?? 1;
    const limit = response.metadata?.limit ?? params.limit ?? items.length;
    const total = response.metadata?.total ?? items.length;

    return {
      items,
      total,
      page,
      limit,
      hasNextPage: limit > 0 && page * limit < total,
    };
  },

  async getById(id: string): Promise<Usuario> {
    const response = await api.get<Usuario>(ENDPOINTS.usuarios.byId(id));
    return response.data;
  },

  async create(payload: Partial<Usuario> & { clave: string }): Promise<Usuario> {
    const response = await api.post<Usuario>(ENDPOINTS.usuarios.base, payload);
    return response.data;
  },

  async update(id: string, payload: Partial<Usuario>): Promise<Usuario> {
    const response = await api.put<Usuario>(ENDPOINTS.usuarios.byId(id), payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(ENDPOINTS.usuarios.byId(id));
  },
};
