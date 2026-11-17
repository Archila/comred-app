import { Linking, Platform, Share } from 'react-native';

import { formatDate, resolveAssetUrl } from '@/lib';
import type { IncidentePublico, JornadaPublica, ProyectoPublico, Publicacion } from '@/models';

/**
 * Lo que una publicacion toma de su entidad (incidente, jornada o proyecto) y
 * sus acciones: compartir, ver la ubicacion y abrir un documento. Las
 * acciones delegan en el sistema operativo.
 */

/**
 * El incidente, la jornada o el proyecto que la publicacion va contando. Como
 * mucho hay uno; las de Boletines o Brigadas no tienen ninguno.
 */
export function entidadDe(
  publicacion: Publicacion,
): IncidentePublico | JornadaPublica | ProyectoPublico | null {
  return publicacion.incidente ?? publicacion.jornada ?? publicacion.proyecto ?? null;
}

/** Comunidad de la publicacion o, si no la indica, la de su entidad. */
export function comunidadDe(publicacion: Publicacion): string | null {
  return publicacion.comunidad ?? entidadDe(publicacion)?.comunidad ?? null;
}

/** Dia de la jornada, o "05/11/2026 al 07/11/2026" si dura varios. */
export function diasDe(jornada: JornadaPublica): string {
  const inicio = formatDate(jornada.fechaInicio);
  const fin = formatDate(jornada.fechaFin);
  return fin && fin !== inicio ? `${inicio} al ${fin}` : inicio;
}

/** "05/11/2026 · 8:00 a 15:00": cuando es la jornada, para la gente. */
export function cuandoEs(jornada: JornadaPublica): string {
  return [diasDe(jornada), jornada.horario].filter(Boolean).join(' · ');
}

/** Ubicacion de la publicacion, si su entidad la tiene. */
export function ubicacionDe(
  publicacion: Publicacion,
): { latitud: number; longitud: number; etiqueta: string } | null {
  const entidad = entidadDe(publicacion);
  if (entidad?.latitud == null || entidad.longitud == null) return null;

  return {
    latitud: entidad.latitud,
    longitud: entidad.longitud,
    etiqueta: publicacion.jornada?.lugar ?? entidad.nombre,
  };
}

export async function compartirPublicacion(publicacion: Publicacion): Promise<void> {
  const jornada = publicacion.jornada;
  const lugar = jornada?.lugar ?? comunidadDe(publicacion);
  const ubicacion = ubicacionDe(publicacion);

  const partes = [
    publicacion.titulo,
    jornada ? `Fecha: ${cuandoEs(jornada)}` : null,
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
 * Abre la ubicacion en la app de mapas del telefono, que sabe trazar la ruta.
 * La usan las publicaciones y "Como llegar" del mapa del municipio
 * (`components/mapa`), que muestra donde estan las cosas pero no navega.
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

/**
 * Descarga un documento adjunto: el navegador del telefono lo guarda en
 * Descargas y avisa al terminar, sin abrirlo.
 *
 * Lo pide el API con `?descargar=1` (`Content-Disposition: attachment`). Solo
 * se anade a los archivos del modulo storage: a una URL ajena no se le puede
 * pedir eso, y se abre tal cual.
 */
export async function descargarDocumento(url: string): Promise<void> {
  const destino = resolveAssetUrl(url);
  if (!destino) return;

  const propio = !/^https?:/i.test(url.trim());
  const final = propio ? `${destino}${destino.includes('?') ? '&' : '?'}descargar=1` : destino;
  await Linking.openURL(final).catch(() => undefined);
}
