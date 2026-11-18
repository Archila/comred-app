import {
  Building2,
  Construction,
  Droplets,
  Flame,
  HeartPulse,
  Hospital,
  House,
  Landmark,
  MapPin,
  Mountain,
  Package,
  Route,
  School,
  ShieldAlert,
  Siren,
  Tent,
  TriangleAlert,
  Users,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';
import type { FeatureCollection } from 'geojson';

import paleta from '@/config/paleta';
import { cajaDe } from '@/lib/caja-geojson';
import type { Bbox, CategoriaRiesgo, EstadoElementoGeografico } from '@/models';

import limiteMunicipal from '../../geo/limite_municipal.geojson';

import type { EstiloInsignia } from './presentacion-contenido';

/**
 * Contorno del municipio del build, leido de `geo/limite_municipal.geojson`.
 *
 * Para otro municipio basta reemplazar ese archivo por otro con el mismo
 * nombre (un FeatureCollection en WGS84 / CRS84, lon-lat): el contorno que se
 * dibuja, el encuadre inicial y el boton "Recentrar" salen de el. Tras
 * cambiarlo, reiniciar Metro con `npx expo start -c` para que no quede en
 * cache.
 */
export const LIMITE_MUNICIPAL: FeatureCollection = limiteMunicipal;

/** Caja del contorno: es lo que encuadra el mapa al abrirse y al recentrar. */
export const CAJA_MUNICIPIO: Bbox | null = cajaDe(LIMITE_MUNICIPAL);

/** San Carlos Sija, por si el archivo del contorno viniera vacio. */
const CENTRO_RESPALDO = { latitud: 15.078, longitud: -91.565 };

/**
 * Configuracion del mapa general del municipio.
 *
 * SE CAMBIA EN CODIGO, junto con `version` de `app.json`: cada municipalidad
 * tiene su propio build, y donde arranca su mapa no es algo que el panel deba
 * poder mover. Al compilar la app de otro municipio, cambiar
 * `geo/limite_municipal.geojson`: `centro` sale de su caja.
 *
 * El arranque encuadra `CAJA_MUNICIPIO` (sin esperar al API, para que el mapa
 * no salte al llegar los datos); `centro` y `zoom` solo se usan si el archivo
 * no tuviera coordenadas.
 */
export const MAPA_CONFIG = {
  centro: CAJA_MUNICIPIO
    ? {
        latitud: (CAJA_MUNICIPIO.minLat + CAJA_MUNICIPIO.maxLat) / 2,
        longitud: (CAJA_MUNICIPIO.minLng + CAJA_MUNICIPIO.maxLng) / 2,
      }
    : CENTRO_RESPALDO,
  zoom: 10.5,
  zoomMin: 9,
  zoomMax: 18,
  /**
   * Estilo base: OpenFreeMap (datos de OpenStreetMap, sin API key). No usar
   * tile.openstreetmap.org: su politica de uso prohibe el trafico de apps.
   * Para cambiar de proveedor (MapTiler, servidor propio) basta esta URL.
   */
  estiloUrl: 'https://tiles.openfreemap.org/styles/liberty',
  /** Fuente de las etiquetas: debe existir en los glifos del estilo. */
  fuenteEtiquetas: 'Noto Sans Regular',
  /** Color del contorno del municipio: el azul institucional (`paleta.marca.secundario`). */
  colorLimite: paleta.marca.secundario,
} as const;

/**
 * Iconos de las capas por nombre (`categoria_geografica.icono`). Lo que no
 * este aqui cae en la deteccion por nombre de `iconoDeCapa`.
 */
const ICONOS: Record<string, LucideIcon> = {
  house: House,
  albergue: House,
  hospital: Hospital,
  'heart-pulse': HeartPulse,
  flame: Flame,
  bomberos: Flame,
  siren: Siren,
  tent: Tent,
  droplets: Droplets,
  waves: Waves,
  mountain: Mountain,
  construction: Construction,
  route: Route,
  users: Users,
  school: School,
  'building-2': Building2,
  landmark: Landmark,
  package: Package,
  'shield-alert': ShieldAlert,
  'triangle-alert': TriangleAlert,
  'map-pin': MapPin,
};

const PALABRAS: [RegExp, LucideIcon][] = [
  [/albergue|refugio/, House],
  [/hospital|salud|clinica/, Hospital],
  [/bombero|incendio/, Flame],
  [/inundacion|rio/, Waves],
  [/derrumbe|deslizamiento|desliz/, Mountain],
  [/proyecto|obra|vial|carretera/, Construction],
  [/evacuacion|ruta/, Route],
  [/reunion|punto de encuentro/, Users],
  [/acopio/, Package],
  [/escuela|instituto/, School],
  [/municipal|edificio/, Landmark],
  [/riesgo|amenaza|susceptible/, ShieldAlert],
];

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function iconoDeCapa(capa: { icono: string | null; nombre: string }): LucideIcon {
  const configurado = capa.icono ? ICONOS[capa.icono.trim().toLowerCase()] : undefined;
  if (configurado) return configurado;

  const nombre = normalizar(capa.nombre);
  return PALABRAS.find(([patron]) => patron.test(nombre))?.[1] ?? MapPin;
}

/**
 * Categoria de amenaza de una zona, de 1 a 6 (6 la peor). Mismos nombres que
 * `CATEGORIAS_RIESGO` del API. La intensidad del relleno en el mapa la manda
 * el API en `opacidad`; aqui solo se rotula la ficha.
 */
export const CATEGORIA_RIESGO: Record<CategoriaRiesgo, EstiloInsignia> = {
  1: { etiqueta: 'Categoría: Baja', fondo: 'bg-success-100', texto: 'text-success-700' },
  2: { etiqueta: 'Categoría: Media baja', fondo: 'bg-success-100', texto: 'text-success-700' },
  3: { etiqueta: 'Categoría: Media', fondo: 'bg-warning-100', texto: 'text-warning-700' },
  4: { etiqueta: 'Categoría: Media alta', fondo: 'bg-warning-100', texto: 'text-warning-700' },
  5: { etiqueta: 'Categoría: Alta', fondo: 'bg-danger-100', texto: 'text-danger-700' },
  6: { etiqueta: 'Categoría: Muy alta', fondo: 'bg-danger-100', texto: 'text-danger-700' },
};

/** Plan Maestro 9.3: un albergue dice si esta habilitado, cerrado o pendiente. */
export const ESTADO_ELEMENTO: Record<EstadoElementoGeografico, EstiloInsignia> = {
  HABILITADO: { etiqueta: 'Habilitado', fondo: 'bg-success-100', texto: 'text-success-700' },
  CERRADO: { etiqueta: 'Cerrado', fondo: 'bg-danger-100', texto: 'text-danger-700' },
  PENDIENTE: {
    etiqueta: 'Pendiente de confirmación',
    fondo: 'bg-warning-100',
    texto: 'text-warning-700',
  },
  ACTIVO: { etiqueta: 'Activo', fondo: 'bg-danger-100', texto: 'text-danger-700' },
  CONTROLADO: { etiqueta: 'Controlado', fondo: 'bg-success-100', texto: 'text-success-700' },
};
