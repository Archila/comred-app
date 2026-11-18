import type { Feature, FeatureCollection, Polygon, Position } from 'geojson';

import type { CapasMapa } from '@/models';

/**
 * Fuente de las etiquetas de las areas, separada de la que se pinta.
 *
 * Una zona de amenaza llega como un solo MultiPolygon de cientos o miles de
 * fragmentos (lo que deja un raster vectorizado), y MapLibre rotula cada
 * fragmento por separado: al acercarse, "Amenaza de inundacion media" sale
 * en cada charco. Aqui cada fragmento pasa a ser su propia figura con su
 * superficie (`areaKm2`), para que la capa de etiquetas rotule solo los que
 * se ven grandes a ese zoom y prefiera los mas grandes
 * (`capasDeElementos`, en `estilos-capas.ts`).
 *
 * Solo lleva el anillo exterior (basta para colocar el rotulo) y descarta lo
 * que no se rotularia ni al zoom maximo, asi que pesa mucho menos que la
 * fuente de las areas.
 */

export interface PropiedadesEtiqueta {
  categoriaId: string;
  nombre: string;
  /** Superficie del fragmento, en km². */
  areaKm2: number;
}

const KM_POR_GRADO_LAT = 110.574;
const KM_POR_GRADO_LNG_ECUADOR = 111.32;

export function etiquetasDeAreas(
  capas: CapasMapa,
  areaMinimaKm2: number,
): FeatureCollection<Polygon, PropiedadesEtiqueta> {
  const features: Feature<Polygon, PropiedadesEtiqueta>[] = [];

  for (const figura of capas.elementos.features) {
    const { geometry, properties } = figura;
    if (properties.tipoGeometria !== 'AREA') continue;

    const poligonos =
      geometry.type === 'Polygon'
        ? [geometry.coordinates]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates
          : [];

    for (const [exterior] of poligonos) {
      if (!exterior) continue;
      const areaKm2 = superficieKm2(exterior);
      if (areaKm2 < areaMinimaKm2) continue;
      features.push({
        type: 'Feature',
        properties: { categoriaId: properties.categoriaId, nombre: properties.nombre, areaKm2 },
        geometry: { type: 'Polygon', coordinates: [exterior] },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Superficie de un anillo en km², proyectando a un plano en su latitud. En un
 * municipio el error es despreciable para lo que se usa (comparar tamaños).
 */
function superficieKm2(anillo: Position[]): number {
  const latitud = anillo[0]?.[1] ?? 0;
  const kmPorGradoLng = KM_POR_GRADO_LNG_ECUADOR * Math.cos((latitud * Math.PI) / 180);

  let doble = 0;
  for (let i = 0; i < anillo.length - 1; i++) {
    const [lng1, lat1] = anillo[i];
    const [lng2, lat2] = anillo[i + 1];
    doble += lng1 * lat2 - lng2 * lat1;
  }
  return (Math.abs(doble) / 2) * kmPorGradoLng * KM_POR_GRADO_LAT;
}
