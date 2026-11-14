import {
  Activity,
  Apple,
  Backpack,
  BadgeCheck,
  Brain,
  Building2,
  CalendarDays,
  ClipboardList,
  CloudRain,
  Construction,
  DoorOpen,
  Droplets,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  HeartPulse,
  Inbox,
  Leaf,
  Megaphone,
  Mountain,
  PawPrint,
  School,
  ShieldCheck,
  Siren,
  Smile,
  Stethoscope,
  Syringe,
  TreePine,
  TriangleAlert,
  Umbrella,
  Users,
  Waves,
  Wind,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

import type {
  CategoriaContenido,
  EstadoIncidente,
  EstadoJornada,
  EstadoProyecto,
  SeccionContenido,
  VerificacionIncidente,
} from '@/models';

/**
 * Como se presentan las secciones de contenido: tarjetas, estados de un
 * incidente, una jornada o un proyecto, y nivel de verificacion.
 *
 * Las clases van completas y literales: Tailwind solo genera las que encuentra
 * escritas tal cual en el codigo.
 */

/** Secciones con pantalla de tarjetas + visor. */
export type SeccionConVisor = Extract<
  SeccionContenido,
  'REPORTES' | 'BOLETINES' | 'JORNADAS' | 'BRIGADAS' | 'PROYECTOS'
>;

export interface PresentacionSeccion {
  seccion: SeccionConVisor;
  /** Slug del menu (`SECCIONES_MENU`). */
  slug: string;
  titulo: string;
  /** Texto bajo el titulo en la pantalla de tarjetas. */
  descripcion: string;
  /** Icono de una tarjeta sin icono propio ni coincidencia por nombre. */
  icono: LucideIcon;
  /** Circulo del icono en la tarjeta: rojo para emergencias y respuesta, azul para lo demas. */
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
  JORNADAS: {
    seccion: 'JORNADAS',
    slug: 'jornadas',
    titulo: 'Jornadas',
    descripcion: 'Elige un tipo de jornada para ver fechas, lugares y requisitos.',
    icono: CalendarDays,
    fondoIcono: 'bg-secondary-500',
    textoIcono: 'text-secondary-foreground',
  },
  BRIGADAS: {
    seccion: 'BRIGADAS',
    slug: 'brigadas',
    titulo: 'Brigadas',
    descripcion: 'Actividades, capacitaciones y convocatorias de las brigadas.',
    icono: Users,
    fondoIcono: 'bg-primary-500',
    textoIcono: 'text-primary-foreground',
  },
  PROYECTOS: {
    seccion: 'PROYECTOS',
    slug: 'proyectos',
    titulo: 'Proyectos actuales',
    descripcion: 'Elige un tipo de proyecto para seguir su avance.',
    icono: HardHat,
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
  apple: Apple,
  backpack: Backpack,
  brain: Brain,
  'building-2': Building2,
  'calendar-days': CalendarDays,
  'clipboard-list': ClipboardList,
  'cloud-rain': CloudRain,
  construction: Construction,
  'door-open': DoorOpen,
  droplets: Droplets,
  'file-text': FileText,
  flame: Flame,
  'graduation-cap': GraduationCap,
  'hard-hat': HardHat,
  'heart-pulse': HeartPulse,
  leaf: Leaf,
  megaphone: Megaphone,
  mountain: Mountain,
  'paw-print': PawPrint,
  school: School,
  'shield-check': ShieldCheck,
  siren: Siren,
  smile: Smile,
  stethoscope: Stethoscope,
  syringe: Syringe,
  'tree-pine': TreePine,
  'triangle-alert': TriangleAlert,
  umbrella: Umbrella,
  users: Users,
  waves: Waves,
  wind: Wind,
  wrench: Wrench,
};

/**
 * Para las tarjetas que se crearon sin icono: se elige por palabras del
 * nombre, en este orden. Cubre las categorias iniciales del Plan Maestro
 * (5.1, 6, 7, 8 y 10). El orden importa: "forestal" va antes que "incendio"
 * para que el incendio forestal lleve el arbol, "mascota" antes que "vacuna"
 * para que la vacunacion de perros y gatos lleve la huella, y lo generico
 * ("prevencion", "brigada", "proyecto") va al final para que gane lo concreto.
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
  [/educativ|escuela|escolar/, School],
  [/infraestructura|edific|comunitario/, Building2],
  [/mochila/, Backpack],
  [/rcp|reanimaci|auxilio/, HeartPulse],
  [/higiene|saneamiento|agua/, Droplets],
  [/evacua/, DoorOpen],
  [/mascota|perro|gato|veterinari/, PawPrint],
  [/vacuna/, Syringe],
  [/psicol/, Brain],
  [/odontol|dental/, Smile],
  [/nutrici/, Apple],
  [/medic|salud/, Stethoscope],
  [/capacitaci/, GraduationCap],
  [/simulacro/, ClipboardList],
  [/equip/, Wrench],
  [/convocatoria/, Megaphone],
  [/ambiente|reforesta/, Leaf],
  [/mitigaci|preparaci|prevenci/, ShieldCheck],
  [/brigada/, Users],
  [/proyecto|\bobra/, HardHat],
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
/* Estados: incidentes, jornadas y proyectos                                   */
/* -------------------------------------------------------------------------- */

export interface EstiloInsignia {
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

/** Plan Maestro 7: proximas, en desarrollo, finalizadas o canceladas. */
export const ESTADO_JORNADA: Record<EstadoJornada, EstiloInsignia> = {
  PROXIMA: {
    etiqueta: 'Próxima',
    fondo: 'bg-secondary-100',
    texto: 'text-secondary-600',
  },
  EN_DESARROLLO: {
    etiqueta: 'En desarrollo',
    fondo: 'bg-success-100',
    texto: 'text-success-700',
  },
  FINALIZADA: {
    etiqueta: 'Finalizada',
    fondo: 'bg-surface-sunken',
    texto: 'text-content-muted',
  },
  CANCELADA: {
    etiqueta: 'Cancelada',
    fondo: 'bg-danger-100',
    texto: 'text-danger-700',
  },
};

/** Plan Maestro 10: estado del proyecto. */
export const ESTADO_PROYECTO: Record<EstadoProyecto, EstiloInsignia> = {
  PLANIFICADO: {
    etiqueta: 'Planificado',
    fondo: 'bg-secondary-100',
    texto: 'text-secondary-600',
  },
  EN_EJECUCION: {
    etiqueta: 'En ejecución',
    fondo: 'bg-success-100',
    texto: 'text-success-700',
  },
  SUSPENDIDO: {
    etiqueta: 'Suspendido',
    fondo: 'bg-warning-100',
    texto: 'text-warning-700',
  },
  FINALIZADO: {
    etiqueta: 'Finalizado',
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
