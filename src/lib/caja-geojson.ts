import type { FeatureCollection } from 'geojson';

import type { Bbox } from '@/models';

/** Caja que encierra todas las figuras de una coleccion, o `null` si no tiene coordenadas. */
export function cajaDe(coleccion: FeatureCollection | null): Bbox | null {
  if (!coleccion) return null;

  const caja = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  const recorrer = (valor: unknown) => {
    if (!Array.isArray(valor)) return;
    if (typeof valor[0] === 'number' && typeof valor[1] === 'number') {
      const [lng, lat] = valor as number[];
      caja.minLat = Math.min(caja.minLat, lat);
      caja.minLng = Math.min(caja.minLng, lng);
      caja.maxLat = Math.max(caja.maxLat, lat);
      caja.maxLng = Math.max(caja.maxLng, lng);
      return;
    }
    valor.forEach(recorrer);
  };
  for (const figura of coleccion.features) {
    if (figura.geometry && 'coordinates' in figura.geometry) recorrer(figura.geometry.coordinates);
  }

  return Number.isFinite(caja.minLat) ? caja : null;
}
