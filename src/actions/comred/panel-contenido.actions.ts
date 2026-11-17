import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import { adjuntarImagen } from '@/lib';
import type {
  ArchivoSubido,
  CategoriaContenido,
  CrearIncidentePayload,
  ImagenComprimida,
  IncidenteCreado,
} from '@/models';

/**
 * Gestion de contenido desde la app, con el JWT de la sesion. La app solo lo
 * ofrece a administradores; el API exige ademas el permiso de cada ruta.
 */
export const panelContenidoActions = {
  /** `POST /comred/contenido/incidentes` (exige `INC_CREAR`). */
  async crearIncidente(payload: CrearIncidentePayload): Promise<IncidenteCreado> {
    const response = await api.post<IncidenteCreado>(ENDPOINTS.contenidoPanel.incidentes, payload);
    return response.data;
  },

  /**
   * `POST /storage/upload/categoria`: la foto de una tarjeta. Esa categoria
   * del storage exige rol administrador.
   */
  async subirPortada(imagen: ImagenComprimida): Promise<ArchivoSubido> {
    const formulario = new FormData();
    await adjuntarImagen(formulario, 'file', imagen, 'portada.jpg');
    const response = await api.upload<ArchivoSubido>(
      `${ENDPOINTS.storage.upload}/categoria`,
      formulario,
      { timeout: 60_000 },
    );
    return response.data;
  },

  /** `PUT /comred/contenido/categorias/:id` con la portada nueva (exige `CONT_CAT_EDITAR`). */
  async cambiarPortada(categoriaId: string, portadaUrl: string): Promise<CategoriaContenido> {
    const response = await api.put<CategoriaContenido>(
      ENDPOINTS.contenidoPanel.categoriaById(categoriaId),
      { portadaUrl },
    );
    return response.data;
  },
};
