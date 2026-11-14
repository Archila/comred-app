import {
  Activity,
  Backpack,
  BadgeCheck,
  Building2,
  CloudRain,
  Construction,
  DoorOpen,
  Droplets,
  FileText,
  Flame,
  HeartPulse,
  Inbox,
  Mountain,
  ShieldCheck,
  Siren,
  Stethoscope,
  TreePine,
  TriangleAlert,
  Umbrella,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';

import type {
  CategoriaContenido,
  EstadoIncidente,
  SeccionContenido,
  VerificacionIncidente,
} from '@/models';

/**
 * Como se presentan las secciones de contenido: tarjetas, estados de un
 * incidente y su nivel de verificacion.
 *
 * Las clases van completas y literales: Tailwind solo genera las que encuentra
 * escritas tal cual en el codigo.
 */

/** Secciones con pantalla de tarjetas + visor. */
export type SeccionConVisor = Extract<SeccionContenido, 'REPORTES' | 'BOLETINES'>;

export interface PresentacionSeccion {
  seccion: SeccionConVisor;
  /** Slug del menu (`SECCIONES_MENU`). */
  slug: string;
  titulo: string;
  /** Texto bajo el titulo en la pantalla de tarjetas. */
  descripcion: string;
  /** Icono de una tarjeta sin icono propio ni coincidencia por nombre. */
  icono: LucideIcon;
  /** Circulo del icono en la tarjeta: rojo para emergencias, azul para prevencion. */
  fondoIcono: string;
  textoIcono: string;
}

export const PRESENTACION_SECCION: Record<SeccionConVisor, PresentacionSeccion> = {
  REPORTES: {
    seccion: 'REPORTES',
    slug: 'reportes',
    titulo: 'Reportes de desastres',
    descripcion: 'Elige un tipo de evento para ver sus reportes.',
    icono: TriangleAlert,
    fondoIcono: 'bg-primary-500',
    textoIcono: 'text-primary-foreground',
  },
  BOLETINES: {
    seccion: 'BOLETINES',
    slug: 'boletines',
    titulo: 'Boletines',
    descripcion: 'Información preventiva y educativa para tu familia.',
    icono: FileText,
    fondoIcono: 'bg-secondary-500',
    textoIcono: 'text-secondary-foreground',
  },
};

/* -------------------------------------------------------------------------- */
/* Icono de cada tarjeta                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Iconos que el panel puede guardar en `categoria_contenido.icono`. Son los
 * nombres de Lucide en kebab-case; uno desconocido cae a la busqueda por
 * nombre y, si tampoco hay suerte, al icono de la seccion.
 */
const ICONOS: Record<string, LucideIcon> = {
  activity: Activity,
  backpack: Backpack,
  'building-2': Building2,
  'cloud-rain': CloudRain,
  construction: Construction,
  'door-open': DoorOpen,
  droplets: Droplets,
  'file-text': FileText,
  flame: Flame,
  'heart-pulse': HeartPulse,
  mountain: Mountain,
  'shield-check': ShieldCheck,
  stethoscope: Stethoscope,
  'tree-pine': TreePine,
  'triangle-alert': TriangleAlert,
  umbrella: Umbrella,
  waves: Waves,
  wind: Wind,
};

/**
 * Para las tarjetas que se crearon sin icono: se elige por palabras del
 * nombre, en este orden. Cubre las categorias iniciales del Plan Maestro
 * (5.1 y 6). El orden importa: "forestal" va antes que "incendio" para que el
 * incendio forestal lleve el arbol, y "prevencion" va al final para que
 * "Prevencion de incendios" o "de inundaciones" lleven el icono del peligro.
 */
const PALABRAS: [RegExp, LucideIcon][] = [
  [/desliza|derrumbe/, Mountain],
  [/inunda/, Waves],
  [/sism|terremoto/, Activity],
  [/forestal/, TreePine],
  [/incendio|fuego/, Flame],
  [/lluvia|tormenta/, CloudRain],
  [/viento/, Wind],
  [/carretera|camino|vial/, Construction],
  [/infraestructura|edific/, Building2],
  [/mochila/, Backpack],
  [/rcp|reanimaci|auxilio/, HeartPulse],
  [/higiene|saneamiento/, Droplets],
  [/evacua/, DoorOpen],
  [/salud/, Stethoscope],
  [/preparaci|prevenci/, ShieldCheck],
];

/** Sin tildes y en minusculas, para comparar nombres escritos de cualquier forma. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function iconoDeCategoria(
  categoria: Pick<CategoriaContenido, 'icono' | 'nombre'>,
  porDefecto: LucideIcon,
): LucideIcon {
  const configurado = categoria.icono ? ICONOS[categoria.icono.trim().toLowerCase()] : undefined;
  if (configurado) return configurado;

  const nombre = normalizar(categoria.nombre);
  return PALABRAS.find(([patron]) => patron.test(nombre))?.[1] ?? porDefecto;
}

/** Icono del estado vacio de una tarjeta sin publicaciones. */
export const ICONO_SIN_PUBLICACIONES = Inbox;

/* -------------------------------------------------------------------------- */
/* Incidentes                                                                  */
/* -------------------------------------------------------------------------- */

interface EstiloInsignia {
  etiqueta: string;
  fondo: string;
  texto: string;
}

/** Plan Maestro 5.2: reportado, en evaluacion, en atencion, controlado o cerrado. */
export const ESTADO_INCIDENTE: Record<EstadoIncidente, EstiloInsignia> = {
  REPORTADO: {
    etiqueta: 'Reportado',
    fondo: 'bg-warning-100',
    texto: 'text-warning-700',
  },
  EN_EVALUACION: {
    etiqueta: 'En evaluación',
    fondo: 'bg-warning-100',
    texto: 'text-warning-700',
  },
  EN_ATENCION: {
    etiqueta: 'En atención',
    fondo: 'bg-danger-100',
    texto: 'text-danger-700',
  },
  CONTROLADO: {
    etiqueta: 'Controlado',
    fondo: 'bg-success-100',
    texto: 'text-success-700',
  },
  CERRADO: {
    etiqueta: 'Cerrado',
    fondo: 'bg-surface-sunken',
    texto: 'text-content-muted',
  },
};

export interface EstiloVerificacion extends EstiloInsignia {
  icono: LucideIcon;
  /** Para quien lee: que significa este nivel. */
  descripcion: string;
}

/**
 * Plan Maestro 5.3: "debe distinguirse claramente entre un reporte recibido,
 * informacion verificada y una alerta oficial". Cada nivel lleva su color, su
 * icono y su texto; no basta con el color, que no todos distinguen.
 */
export const VERIFICACION_INCIDENTE: Record<VerificacionIncidente, EstiloVerificacion> = {
  REPORTE: {
    etiqueta: 'Reporte recibido',
    descripcion: 'Información recibida que aún no ha sido verificada por COMRED.',
    icono: Inbox,
    fondo: 'bg-surface-sunken',
    texto: 'text-content-muted',
  },
  VERIFICADO: {
    etiqueta: 'Información verificada',
    descripcion: 'COMRED confirmó esta información en el lugar o con fuentes oficiales.',
    icono: BadgeCheck,
    fondo: 'bg-secondary-100',
    texto: 'text-secondary-600',
  },
  ALERTA_OFICIAL: {
    etiqueta: 'Alerta oficial',
    descripcion: 'Alerta emitida por personal autorizado. Siga las recomendaciones.',
    icono: Siren,
    fondo: 'bg-danger-500',
    texto: 'text-white',
  },
};
