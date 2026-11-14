import { Linking, Platform, Share } from 'react-native';

import { resolveAssetUrl } from '@/lib';
import type { IncidentePublico, Publicacion } from '@/models';

/**
 * Acciones de una publicacion: compartir, ver la ubicacion y abrir un
 * documento. Todas delegan en el sistema operativo.
 */

/** Ubicacion de la publicacion, si su incidente la tiene. */
export function ubicacionDe(
  publicacion: Publicacion,
): { latitud: number; longitud: number; etiqueta: string } | null {
  const incidente: IncidentePublico | null = publicacion.incidente;
  if (incidente?.latitud == null || incidente.longitud == null) return null;

  return {
    latitud: incidente.latitud,
    longitud: incidente.longitud,
    etiqueta: incidente.nombre,
  };
}

export async function compartirPublicacion(publicacion: Publicacion): Promise<void> {
  const lugar = publicacion.comunidad ?? publicacion.incidente?.comunidad;
  const ubicacion = ubicacionDe(publicacion);

  const partes = [
    publicacion.titulo,
    lugar ? `Lugar: ${lugar}` : null,
    publicacion.descripcion,
    ubicacion
      ? `Ubicación: https://www.google.com/maps/search/?api=1&query=${ubicacion.latitud},${ubicacion.longitud}`
      : null,
    'Compartido desde la app COMRED.',
  ];

  try {
    await Share.share({
      title: publicacion.titulo,
      message: partes.filter(Boolean).join('\n\n'),
    });
  } catch {
    // Cerrar la hoja de compartir sin elegir nada no es un error.
  }
}

/**
 * Abre la ubicacion en la app de mapas del telefono. El mapa propio del
 * municipio (Plan Maestro, 9) aun no existe; cuando exista, este es el punto
 * donde cambiar el destino.
 */
export async function abrirUbicacion(latitud: number, longitud: number, etiqueta: string) {
  const nombre = encodeURIComponent(etiqueta);
  const web = `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`;
  const nativa = Platform.select({
    ios: `maps:0,0?q=${nombre}&ll=${latitud},${longitud}`,
    android: `geo:${latitud},${longitud}?q=${latitud},${longitud}(${nombre})`,
    default: web,
  });

  try {
    await Linking.openURL(nativa);
  } catch {
    // Sin app de mapas instalada: el navegador siempre puede.
    await Linking.openURL(web).catch(() => undefined);
  }
}

/** Abre un documento adjunto (PDF) con el visor del sistema. */
export async function abrirDocumento(url: string): Promise<void> {
  const destino = resolveAssetUrl(url);
  if (destino) await Linking.openURL(destino).catch(() => undefined);
}
