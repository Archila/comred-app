import { Info, Siren, TriangleAlert, type LucideIcon } from 'lucide-react-native';

import type { AlcanceMensaje, EstadoEnvio, EstadoMensaje, TipoMensaje } from '@/models';

/**
 * Como se presentan los avisos en pantalla: tipo, alcance y estados. Lo
 * comparten la bandeja, la pantalla de envio y el historial.
 *
 * Las clases van completas y literales: Tailwind solo genera las que encuentra
 * escritas tal cual en el codigo.
 */

/**
 * Tipo de aviso. Quien redacta lo ve con el mismo color e icono con que lo
 * vera quien lo recibe.
 */
export interface EstiloTipoMensaje {
  etiqueta: string;
  /** Que pasa en el telefono de quien lo recibe. Lo lee quien envia. */
  descripcion: string;
  icono: LucideIcon;
  /** Borde izquierdo de la tarjeta en la bandeja. */
  borde: string;
  texto: string;
  /** Tarjeta seleccionada en el formulario de envio. */
  seleccion: string;
}

export const TIPO_MENSAJE: Record<TipoMensaje, EstiloTipoMensaje> = {
  EMERGENCIA: {
    etiqueta: 'Emergencia',
    descripcion: 'Suena aunque el telefono este en No molestar.',
    icono: Siren,
    borde: 'border-l-danger-500',
    texto: 'text-danger-600 dark:text-danger-500',
    seleccion: 'border-danger-500 bg-danger-50 dark:bg-danger-500/10',
  },
  ALERTA: {
    etiqueta: 'Alerta',
    descripcion: 'Suena con prioridad alta.',
    icono: TriangleAlert,
    borde: 'border-l-warning-500',
    texto: 'text-warning-700 dark:text-warning-500',
    seleccion: 'border-warning-500 bg-warning-50 dark:bg-warning-500/10',
  },
  INFORMATIVO: {
    etiqueta: 'Informativo',
    descripcion: 'Llega sin sonido.',
    icono: Info,
    borde: 'border-l-primary-500',
    texto: 'text-primary-600 dark:text-primary-400',
    seleccion: 'border-primary-500 bg-primary-50 dark:bg-primary-950',
  },
};

/** Orden en que se ofrecen: de lo mas leve a lo mas grave. */
export const TIPOS_MENSAJE: TipoMensaje[] = ['INFORMATIVO', 'ALERTA', 'EMERGENCIA'];

/** A quien va dirigido, en palabras de quien envia. */
export const ALCANCE_MENSAJE: Record<AlcanceMensaje, { etiqueta: string; descripcion: string }> = {
  DISPOSITIVOS: {
    etiqueta: 'Toda la poblacion',
    descripcion: 'Todos los telefonos con la app, tengan cuenta o no.',
  },
  ORGANIZACION: {
    etiqueta: 'Usuarios registrados',
    descripcion: 'Solo quienes iniciaron sesion en la app.',
  },
  CATEGORIA: {
    etiqueta: 'Por categoria',
    descripcion: 'Todos los miembros de las categorias que elijas.',
  },
  SUBCATEGORIA: {
    etiqueta: 'Por grupo',
    descripcion: 'Solo los miembros de los grupos que elijas.',
  },
};

/** De lo mas amplio a lo mas acotado. */
export const ORDEN_ALCANCES: AlcanceMensaje[] = [
  'DISPOSITIVOS',
  'ORGANIZACION',
  'CATEGORIA',
  'SUBCATEGORIA',
];

/** Estado del reparto de un aviso, para la `Insignia`. */
export const ESTADO_MENSAJE: Record<
  EstadoMensaje,
  { etiqueta: string; fondo: string; texto: string }
> = {
  PENDIENTE: {
    etiqueta: 'En cola',
    fondo: 'bg-surface-sunken dark:bg-surface-dark-sunken',
    texto: 'text-content-muted dark:text-content-dark-muted',
  },
  ENVIANDO: {
    etiqueta: 'Enviando',
    fondo: 'bg-primary-100 dark:bg-primary-950',
    texto: 'text-primary-700 dark:text-primary-400',
  },
  ENVIADO: {
    etiqueta: 'Entregado',
    fondo: 'bg-success-100 dark:bg-success-500/20',
    texto: 'text-success-700 dark:text-success-500',
  },
  // Lo normal cuando hay telefonos con las notificaciones desactivadas: no
  // conviene pintarlo como un error.
  PARCIAL: {
    etiqueta: 'Entregado en parte',
    fondo: 'bg-warning-100 dark:bg-warning-500/20',
    texto: 'text-warning-700 dark:text-warning-500',
  },
  FALLIDO: {
    etiqueta: 'No se entrego',
    fondo: 'bg-danger-100 dark:bg-danger-500/20',
    texto: 'text-danger-700 dark:text-danger-500',
  },
};

/** Como acabo la entrega a UN telefono, para la lista de quien no lo leyo. */
export const ESTADO_ENVIO: Record<EstadoEnvio, string> = {
  ENVIADO: 'Le llego la notificacion',
  SIMULADO: 'Registrado sin notificar (push apagado en el servidor)',
  SIN_TOKEN: 'Notificaciones desactivadas: lo vera al abrir la app',
  FALLIDO: 'La notificacion no le llego',
};
