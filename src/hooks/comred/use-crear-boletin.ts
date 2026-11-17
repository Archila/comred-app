import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { publicacionesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import type {
  CrearPublicacionPayload,
  DocumentoElegido,
  ImagenComprimida,
  VisibilidadPublicacion,
} from '@/models';

import type { FasePublicacion, GrupoDestino } from './use-crear-publicacion';

/** Lo que llena el formulario de nuevo boletin. */
export interface BorradorBoletin {
  /** El tipo de boletin: una tarjeta de Boletines. */
  categoriaContenidoId: string;
  titulo: string;
  /** El resumen que se lee en el visor. */
  descripcion: string;
  /** Una sola foto: un boletin no es una galeria. */
  imagen: ImagenComprimida | null;
  /** El PDF que se descarga desde el visor. */
  documento: DocumentoElegido | null;
  /** Fecha de emision. `null` = el momento de publicar, con el reloj del API. */
  fechaEmision: Date | null;
  /** Quien lo emite: la fuente oficial. */
  dependencia: string;
  comunidad: string;
  visibilidad: VisibilidadPublicacion;
  grupo: GrupoDestino | null;
  /** Se guarda sin publicar, para terminarlo en el panel. */
  borrador: boolean;
  /** `null` = no vence. */
  fechaExpiracion: Date | null;
  prioridad: number;
  paginaPrincipal: boolean;
}

/** Texto opcional: vacio no se envia, para no guardar cadenas vacias. */
function opcional(texto: string): string | undefined {
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : undefined;
}

function aPayload(borrador: BorradorBoletin, urls: Map<string, string>): CrearPublicacionPayload {
  const grupo = borrador.visibilidad === 'GRUPO' ? borrador.grupo : null;
  const media: CrearPublicacionPayload['media'] = [];

  if (borrador.imagen) media.push({ tipo: 'IMAGEN', url: urls.get(borrador.imagen.id)! });
  if (borrador.documento) {
    media.push({
      tipo: 'DOCUMENTO',
      url: urls.get(borrador.documento.id)!,
      // El API admite 150: es el nombre que se ve en la lista de documentos.
      titulo: borrador.documento.nombre.slice(0, 150),
    });
  }

  return {
    seccion: 'BOLETINES',
    categoriaContenidoId: borrador.categoriaContenidoId,
    titulo: borrador.titulo.trim(),
    descripcion: borrador.descripcion.trim(),
    dependencia: opcional(borrador.dependencia),
    comunidad: opcional(borrador.comunidad),
    visibilidad: borrador.visibilidad,
    grupoCategoriaId: grupo?.tipo === 'categoria' ? grupo.id : undefined,
    grupoSubcategoriaId: grupo?.tipo === 'subcategoria' ? grupo.id : undefined,
    estado: borrador.borrador ? 'BORRADOR' : 'PUBLICADA',
    prioridad: borrador.prioridad,
    paginaPrincipal: borrador.paginaPrincipal,
    // En un boletin la fecha de publicacion ES la de emision: la app la
    // muestra como "Emitido".
    fechaPublicacion: borrador.fechaEmision?.toISOString(),
    fechaExpiracion: borrador.fechaExpiracion?.toISOString(),
    media,
  };
}

/**
 * Publica un boletin: sube la foto y el PDF en una sola peticion y crea la
 * publicacion con los dos.
 *
 * Igual que `useCrearPublicacion`: lo ya subido se recuerda por su id, y al
 * reintentar tras un fallo del alta no se vuelve a subir. `retry: false`
 * porque una respuesta perdida puede ser un boletin ya publicado.
 */
export function useCrearBoletin() {
  const queryClient = useQueryClient();
  const [fase, setFase] = useState<FasePublicacion>('inactiva');
  const subidas = useRef(new Map<string, string>());

  const mutation = useMutation({
    mutationFn: async (borrador: BorradorBoletin) => {
      const imagenes = borrador.imagen && !subidas.current.has(borrador.imagen.id) ? [borrador.imagen] : [];
      const documentos =
        borrador.documento && !subidas.current.has(borrador.documento.id) ? [borrador.documento] : [];

      if (imagenes.length + documentos.length > 0) {
        setFase('subiendo');
        const archivos = await publicacionesActions.subirArchivos(imagenes, documentos);
        // El API devuelve en el orden enviado: primero imagenes, luego documentos.
        [...imagenes, ...documentos].forEach((archivo, indice) =>
          subidas.current.set(archivo.id, archivos[indice].url),
        );
      }

      setFase('publicando');
      return publicacionesActions.crear(aPayload(borrador, subidas.current));
    },
    retry: false,
    onSuccess: () => {
      subidas.current.clear();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contenido.all });
    },
    onSettled: () => setFase('inactiva'),
  });

  return {
    ...mutation,
    fase,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
