import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import { adjuntarDocumento, adjuntarImagen } from '@/lib';
import type {
  ArchivoSubido,
  CrearPublicacionPayload,
  DocumentoElegido,
  ImagenComprimida,
  PublicacionCreada,
} from '@/models';

/**
 * Las fotos ya van comprimidas, pero diez de ellas con datos moviles pueden
 * tardar mas que el timeout general, pensado para lecturas.
 */
const TIMEOUT_SUBIDA = 120_000;

/**
 * Alta de publicaciones desde la app. A diferencia de `contenidoActions`, va
 * con el JWT de la sesion: el API exige `PUB_CREAR` y la app solo lo ofrece a
 * administradores.
 */
export const publicacionesActions = {
  /**
   * `POST /storage/upload-multiple/publicacion`
   *
   * Una sola peticion para toda la galeria: el API limita las subidas a 3 por
   * minuto. Devuelve los archivos en el mismo orden en que se enviaron.
   */
  async subirImagenes(imagenes: ImagenComprimida[]): Promise<ArchivoSubido[]> {
    return publicacionesActions.subirArchivos(imagenes, []);
  },

  /**
   * `POST /storage/upload-multiple/publicacion` con fotos y PDF juntos (un
   * boletin): sigue siendo UNA peticion frente al throttle. Devuelve primero
   * las imagenes y despues los documentos, cada grupo en su orden.
   */
  async subirArchivos(
    imagenes: ImagenComprimida[],
    documentos: DocumentoElegido[],
  ): Promise<ArchivoSubido[]> {
    const formulario = new FormData();
    for (const [indice, imagen] of imagenes.entries()) {
      await adjuntarImagen(formulario, 'files', imagen, `publicacion-${indice + 1}.jpg`);
    }
    for (const documento of documentos) {
      await adjuntarDocumento(formulario, 'files', documento);
    }

    const response = await api.upload<ArchivoSubido[]>(
      ENDPOINTS.storage.uploadMultiple('publicacion'),
      formulario,
      { timeout: TIMEOUT_SUBIDA },
    );
    return response.data;
  },

  /** `POST /comred/contenido/publicaciones` */
  async crear(payload: CrearPublicacionPayload): Promise<PublicacionCreada> {
    const response = await api.post<PublicacionCreada>(
      ENDPOINTS.contenidoPanel.publicaciones,
      payload,
    );
    return response.data;
  },
};
