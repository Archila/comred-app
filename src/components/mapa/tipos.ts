import type { Ref } from 'react';

import type { Coordenadas } from '@/hooks/use-mi-ubicacion';
import type { Bbox, CapasMapa } from '@/models';

/**
 * Contrato comun de `mapa-vista.tsx` (MapLibre nativo) y `mapa-vista.web.tsx`
 * (maplibre-gl). La pantalla solo conoce esto: que motor pinta depende de la
 * plataforma.
 */
export interface MapaVistaRef {
  /** Lleva la camara a un punto. */
  irA: (coordenadas: Coordenadas, zoom?: number) => void;
  /** Encuadra una caja (un elemento, el contorno del municipio). */
  encuadrar: (caja: Bbox) => void;
}

export interface MapaVistaProps {
  capas: CapasMapa;
  /** Ids de las capas encendidas en los filtros. */
  categoriasActivas: string[];
  seleccionadoId: string | null;
  /** null al tocar el mapa fuera de toda figura. */
  onSeleccionar: (id: string | null) => void;
  /** Posicion del usuario si pidio "Mi ubicacion"; si no, null. */
  miUbicacion: Coordenadas | null;
  ref?: Ref<MapaVistaRef>;
}

/**
 * Contrato comun de `mapa-selector.tsx` y `mapa-selector.web.tsx`: un mapa
 * para elegir UN punto (la ubicacion de una jornada), sin las capas del
 * municipio.
 */
export interface MapaSelectorRef {
  /** Lleva la camara a un punto. */
  irA: (coordenadas: Coordenadas, zoom?: number) => void;
}

export interface MapaSelectorProps {
  /** El punto marcado, o null si aun no hay. */
  punto: Coordenadas | null;
  /**
   * Con el, tocar el mapa marca el punto y el mapa se puede mover. Sin el es
   * una vista fija (la vista previa del formulario) que sigue al punto.
   */
  onElegir?: (coordenadas: Coordenadas) => void;
  /** Color del pin: el de la marca. */
  color: string;
  ref?: Ref<MapaSelectorRef>;
}

/** Zoom al que se ve un punto elegido: calles, no el municipio entero. */
export const ZOOM_PUNTO = 15;

export const CAPAS_VACIAS: CapasMapa = {
  version: null,
  limite: null,
  categorias: [],
  elementos: { type: 'FeatureCollection', features: [] },
};
