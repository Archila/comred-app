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

import paleta from '@/config/paleta';
import type { EstadoElementoGeografico } from '@/models';

import type { EstiloInsignia } from './presentacion-contenido';

/**
 * Configuracion del mapa general del municipio.
 *
 * SE CAMBIA EN CODIGO, junto con `version` de `app.json`: cada municipalidad
 * tiene su propio build, y donde arranca su mapa no es algo que el panel deba
 * poder mover. Al compilar la app de otro municipio, ajustar `centro` y
 * `zoom` aqui.
 *
 * Si la organizacion tiene contorno guardado (`PUT /comred/mapa/limite`), el
 * boton "Recentrar" encuadra el contorno; el arranque usa siempre esto, para
 * que el mapa no salte al llegar los datos.
 */
export const MAPA_CONFIG = {
  /**
   * Quetzaltenango (MUNI-XELA, el build actual). Para San Carlos Sija:
   * { latitud: 14.985, longitud: -91.55 }, zoom 12.
   */
  centro: { latitud: 14.8175, longitud: -91.5235 },
  zoom: 12.5,
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
