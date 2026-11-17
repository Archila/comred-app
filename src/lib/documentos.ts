import { getDocumentAsync } from 'expo-document-picker';
import { Platform } from 'react-native';

import type { DocumentoElegido } from '@/models';

/**
 * Documentos (PDF) para publicar desde el telefono: elegirlos, comprobarlos y
 * adjuntarlos a un multipart. A diferencia de las fotos no se comprimen: un
 * PDF re-guardado puede perder texto seleccionable o firmas.
 */

/**
 * Peso maximo del PDF. El API admite 20 MB en la galeria de una publicacion;
 * aqui se pide la mitad porque la gente lo descarga con datos moviles.
 */
export const MAX_MB_DOCUMENTO = 10;

let correlativo = 0;

/** Abre el selector de archivos del sistema, solo PDF. `null` si se cancela. */
export async function elegirPdf(): Promise<DocumentoElegido | null> {
  const resultado = await getDocumentAsync({
    type: 'application/pdf',
    multiple: false,
    // Copia en cache: el `content://` de Android puede dejar de ser legible
    // antes de que se publique.
    copyToCacheDirectory: true,
    // En web, un object URL y no el archivo entero en base64 en memoria.
    base64: false,
  });
  if (resultado.canceled) return null;

  const [asset] = resultado.assets;
  if (!asset) return null;

  correlativo += 1;
  return {
    id: `pdf-${Date.now()}-${correlativo}`,
    uri: asset.uri,
    nombre: asset.name,
    tamano: asset.size ?? null,
    archivoWeb: asset.file,
  };
}

/** Por que no se puede usar el archivo elegido, o `null` si sirve. */
export function motivoDeRechazoPdf(documento: DocumentoElegido): string | null {
  // Algunos gestores de archivos ignoran el filtro de tipo: se comprueba aqui
  // para no esperar al rechazo del API tras subirlo.
  if (!/\.pdf$/i.test(documento.nombre)) {
    return `${documento.nombre}: solo se admiten archivos PDF.`;
  }
  if (documento.tamano && documento.tamano > MAX_MB_DOCUMENTO * 1024 * 1024) {
    return `${documento.nombre}: pesa más de ${MAX_MB_DOCUMENTO} MB.`;
  }
  return null;
}

/** "850 KB", "2,4 MB". */
export function formatTamanoArchivo(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('es-GT', { maximumFractionDigits: 1 })} MB`;
}

/** Anade un PDF a un multipart, en el formato de cada plataforma. */
export async function adjuntarDocumento(
  formulario: FormData,
  campo: string,
  documento: DocumentoElegido,
): Promise<void> {
  // El API valida la extension: el nombre tiene que terminar en .pdf.
  const nombre = /\.pdf$/i.test(documento.nombre) ? documento.nombre : `${documento.nombre}.pdf`;

  if (Platform.OS === 'web') {
    const blob = documento.archivoWeb ?? (await (await fetch(documento.uri)).blob());
    formulario.append(campo, blob, nombre);
    return;
  }

  // Igual que las fotos: React Native lee el archivo del disco al enviar.
  formulario.append(campo, { uri: documento.uri, name: nombre, type: 'application/pdf' } as unknown as Blob);
}
