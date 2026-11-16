import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync, type ImagePickerAsset } from 'expo-image-picker';
import { Platform } from 'react-native';

import type { ImagenComprimida } from '@/models';

/**
 * Fotos para publicar desde el telefono: elegirlas, comprimirlas y
 * adjuntarlas a un multipart.
 *
 * Se comprime en el aparato y no en el API porque lo caro es SUBIR: una foto
 * de camara pesa 3-8 MB y en una emergencia se publica con datos moviles y
 * mala senal. Reducida a 1920 px y JPEG al 80 % queda en unos cientos de KB,
 * sin diferencia visible en la pantalla de un telefono.
 */

/** Calidad JPEG (0-1). 0.8 es el punto donde el ahorro deja de verse. */
export const CALIDAD_IMAGEN = 0.8;

/** Lado mayor tras comprimir. Una pantalla Full HD no muestra mas. */
export const LADO_MAXIMO_IMAGEN = 1920;

/** Fotos por publicacion. El API admite 20 archivos; el lote de subida, 10. */
export const MAX_IMAGENES_PUBLICACION = 10;

/** Peso maximo de la foto ORIGINAL. Mas que eso suele ser un RAW o un panorama. */
export const MAX_MB_IMAGEN = 10;

/**
 * Formatos de origen. Todos salen como JPEG, incluido el HEIC del iPhone, que
 * el API no aceptaria tal cual. GIF no: se perderia la animacion.
 */
const TIPOS_ADMITIDOS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/** Abre la galeria del telefono. Devuelve `[]` si la persona cancela. */
export async function elegirImagenes(limite: number): Promise<ImagePickerAsset[]> {
  // La galeria del sistema (Photo Picker en Android, PHPicker en iOS) no
  // pide permiso: la persona elige y la app solo ve lo elegido.
  const resultado = await launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limite,
    orderedSelection: true,
    // Sin compresion aqui: la hace `comprimirImagen`. Comprimir dos veces
    // degrada la foto sin ahorrar casi nada.
    quality: 1,
  });

  return resultado.canceled ? [] : resultado.assets.slice(0, limite);
}

/** Por que no se puede usar una foto elegida, o `null` si sirve. */
export function motivoDeRechazo(asset: ImagePickerAsset): string | null {
  const nombre = asset.fileName ?? 'Una imagen';

  if (asset.mimeType && !TIPOS_ADMITIDOS.includes(asset.mimeType.toLowerCase())) {
    return `${nombre}: formato no admitido (usa JPG o PNG).`;
  }
  if (asset.fileSize && asset.fileSize > MAX_MB_IMAGEN * 1024 * 1024) {
    return `${nombre}: pesa mas de ${MAX_MB_IMAGEN} MB.`;
  }
  return null;
}

let correlativo = 0;

/**
 * Reduce la foto a `LADO_MAXIMO_IMAGEN` (si es mayor) y la guarda como JPEG
 * con `CALIDAD_IMAGEN`. Nunca la agranda.
 *
 * Las medidas se leen de la imagen ya decodificada y no de las que informa la
 * galeria: en Android estas pueden venir sin aplicar la rotacion EXIF, y se
 * reduciria el lado equivocado.
 */
export async function comprimirImagen(uri: string): Promise<ImagenComprimida> {
  const contexto = ImageManipulator.manipulate(uri);

  try {
    let imagen = await contexto.renderAsync();
    const { width, height } = imagen;

    if (Math.max(width, height) > LADO_MAXIMO_IMAGEN) {
      imagen.release();
      contexto.resize(width >= height ? { width: LADO_MAXIMO_IMAGEN } : { height: LADO_MAXIMO_IMAGEN });
      imagen = await contexto.renderAsync();
    }

    try {
      const resultado = await imagen.saveAsync({ compress: CALIDAD_IMAGEN, format: SaveFormat.JPEG });
      correlativo += 1;
      return {
        id: `${Date.now()}-${correlativo}`,
        uri: resultado.uri,
        ancho: resultado.width,
        alto: resultado.height,
      };
    } finally {
      // Son objetos nativos: sin liberarlos, cada foto deja su mapa de bits
      // en memoria hasta que pase el recolector.
      imagen.release();
    }
  } finally {
    contexto.release();
  }
}

/** Anade una imagen comprimida a un multipart, en el formato de cada plataforma. */
export async function adjuntarImagen(
  formulario: FormData,
  campo: string,
  imagen: ImagenComprimida,
  nombre: string,
): Promise<void> {
  if (Platform.OS === 'web') {
    // En web el manipulador devuelve un blob/data URL: hay que pasar el Blob.
    const blob = await (await fetch(imagen.uri)).blob();
    formulario.append(campo, blob, nombre);
    return;
  }

  // React Native lee el archivo del disco al enviar a partir de este objeto;
  // los tipos de TypeScript son los del navegador y no lo contemplan.
  formulario.append(campo, { uri: imagen.uri, name: nombre, type: 'image/jpeg' } as unknown as Blob);
}
