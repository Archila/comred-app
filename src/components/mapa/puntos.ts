import type { Point } from 'geojson';
import type { LucideIcon } from 'lucide-react-native';

import { iconoDeCapa } from '@/constants';
import type { CapasMapa, FiguraMapa } from '@/models';

export interface PuntoVisible {
  id: string;
  /** [longitud, latitud]. */
  coordenadas: [number, number];
  color: string;
  icono: LucideIcon;
}

/**
 * Los puntos que se pintan como marcador: los de las capas encendidas. Lo
 * comparten la vista nativa y la web.
 */
export function puntosVisibles(capas: CapasMapa, categoriasActivas: string[]): PuntoVisible[] {
  const activas = new Set(categoriasActivas);
  const iconos = new Map(capas.categorias.map((c) => [c.id, iconoDeCapa(c)]));

  return capas.elementos.features
    .filter(
      (figura): figura is FiguraMapa & { geometry: Point } =>
        figura.properties.tipoGeometria === 'PUNTO' &&
        figura.geometry.type === 'Point' &&
        activas.has(figura.properties.categoriaId),
    )
    .map((figura) => {
      const [longitud, latitud] = figura.geometry.coordinates;
      return {
        id: figura.properties.id,
        coordenadas: [longitud, latitud],
        color: figura.properties.color,
        icono:
          iconos.get(figura.properties.categoriaId) ?? iconoDeCapa({ icono: null, nombre: '' }),
      };
    });
}

/**
 * Tras tocar un marcador, el mismo toque puede llegar tambien al mapa, que lo
 * toma por un toque "en vacio" y cierra la ficha recien abierta. Durante este
 * margen se ignora.
 */
export const MARGEN_TOQUE_MARCADOR_MS = 400;
