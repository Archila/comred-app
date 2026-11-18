import type {
  FilterSpecification,
  LayerSpecification,
} from '@maplibre/maplibre-react-native';

import { MAPA_CONFIG } from '@/constants';
import type { TipoGeometria } from '@/models';

/**
 * Capas de estilo del mapa, compartidas por la vista nativa y la web. Son
 * capas de la especificacion de estilo de MapLibre, que los dos motores
 * entienden igual: definirlas una vez evita que el mapa se vea distinto en el
 * telefono y en el navegador. (El import es solo de tipos: la vista web no
 * carga el paquete nativo.)
 *
 * El color y la opacidad salen de los atributos de cada figura (`color`,
 * `opacidad`), que pone el API: el color es el de su capa, y la opacidad de un
 * area sale de su categoria de amenaza (1-6, mas intensa cuanto mas alta) o,
 * si no la tiene, de la capa. Filtrar o resaltar no exige volver
 * a cargar la fuente: solo cambia el `filter` de la capa.
 *
 * Se filtra por `tipoGeometria` (atributo del API) y no por la expresion
 * `geometry-type`: esta devuelve "Polygon" o "MultiPolygon" segun la version
 * del motor, y una regla que dependa de eso se rompe al actualizar.
 */

export const FUENTE_ELEMENTOS = 'mapa-elementos';
export const FUENTE_LIMITE = 'mapa-limite';

export const CAPA = {
  areaRelleno: 'mapa-area-relleno',
  areaBorde: 'mapa-area-borde',
  linea: 'mapa-linea',
  punto: 'mapa-punto',
  etiqueta: 'mapa-etiqueta',
  seleccion: 'mapa-seleccion',
  limite: 'mapa-limite-linea',
} as const;

/** Capas que responden al toque. */
export const CAPAS_TOCABLES: string[] = [CAPA.areaRelleno, CAPA.linea, CAPA.punto];

/** Zoom desde el que se rotulan las areas: antes se pisan entre si. */
const ZOOM_ETIQUETAS = 13;

/** Margen al encuadrar, para que la figura no quede bajo la ficha. */
export const MARGEN_ENCUADRE = { top: 64, right: 48, bottom: 200, left: 48 };

/** Figuras de un tipo que pertenecen a una capa encendida. */
function filtroDe(tipo: TipoGeometria, activas: string[]): FilterSpecification {
  return [
    'all',
    ['==', ['get', 'tipoGeometria'], tipo],
    ['in', ['get', 'categoriaId'], ['literal', activas]],
  ];
}

/** El contorno resaltado de la linea o el area seleccionada. */
function filtroSeleccion(id: string | null): FilterSpecification {
  return ['all', ['!=', ['get', 'tipoGeometria'], 'PUNTO'], ['==', ['get', 'id'], id ?? '']];
}

/**
 * Capas de los elementos, de abajo arriba.
 *
 * Los puntos se dibujan como marcadores con el icono de su capa (`Marker` en
 * el telefono, un elemento del DOM en web), que van fuera de la fuente. Aqui
 * solo llevan una zona de toque invisible: si el toque no lo recoge el
 * marcador, lo recoge la capa, y la ficha se abre igual.
 */
export function capasDeElementos(
  activas: string[],
  seleccionadoId: string | null,
): LayerSpecification[] {
  const capas: LayerSpecification[] = [
    {
      id: CAPA.areaRelleno,
      type: 'fill',
      source: FUENTE_ELEMENTOS,
      filter: filtroDe('AREA', activas),
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['get', 'opacidad'] },
    },
    {
      id: CAPA.areaBorde,
      type: 'line',
      source: FUENTE_ELEMENTOS,
      filter: filtroDe('AREA', activas),
      paint: { 'line-color': ['get', 'color'], 'line-width': 1.5 },
    },
    {
      id: CAPA.linea,
      type: 'line',
      source: FUENTE_ELEMENTOS,
      filter: filtroDe('LINEA', activas),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ['get', 'color'], 'line-width': 4 },
    },
    {
      id: CAPA.seleccion,
      type: 'line',
      source: FUENTE_ELEMENTOS,
      filter: filtroSeleccion(seleccionadoId),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#111827', 'line-width': 4 },
    },
    {
      id: CAPA.etiqueta,
      type: 'symbol',
      source: FUENTE_ELEMENTOS,
      minzoom: ZOOM_ETIQUETAS,
      filter: filtroDe('AREA', activas),
      layout: {
        'text-field': ['get', 'nombre'],
        'text-font': [MAPA_CONFIG.fuenteEtiquetas],
        'text-size': 12,
        'text-max-width': 8,
      },
      paint: {
        'text-color': '#1F2937',
        'text-halo-color': '#FFFFFF',
        'text-halo-width': 1.5,
      },
    },
  ];

  // Zona de toque de los puntos: del tamano del marcador, transparente. El
  // marcador se ancla abajo, asi que el circulo se sube a su altura.
  capas.push({
    id: CAPA.punto,
    type: 'circle',
    source: FUENTE_ELEMENTOS,
    filter: filtroDe('PUNTO', activas),
    paint: {
      'circle-radius': 20,
      'circle-translate': [0, -20],
      'circle-color': '#000000',
      'circle-opacity': 0,
    },
  });

  return capas;
}

/** Contorno del municipio: discontinuo, en el azul institucional, encima de todo. */
export const CAPA_LIMITE: LayerSpecification = {
  id: CAPA.limite,
  type: 'line',
  source: FUENTE_LIMITE,
  paint: {
    'line-color': MAPA_CONFIG.colorLimite,
    'line-width': 2.5,
    'line-dasharray': [3, 2],
  },
};
