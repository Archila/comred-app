import type { DatosPushComred, TipoMensaje } from '@/models';

/**
 * Version web de `notificaciones.ts`. RNFirebase messaging no tiene
 * implementacion web, y importarlo rompe el bundle de `expo start --web`.
 *
 * En web no hay push: el aparato se registra igual y su bandeja funciona,
 * pero el permiso se reporta denegado para que el API no espere entregas.
 */

export const CANAL_POR_TIPO: Record<TipoMensaje, string> = {
  EMERGENCIA: 'emergencia',
  ALERTA: 'alerta',
  INFORMATIVO: 'informativo',
};

export interface MensajeRecibido {
  datos: DatosPushComred;
  titulo: string;
  cuerpo: string;
}

const sinSuscripcion = () => () => {};

export const configurarCanales = async (): Promise<void> => {};
export const configurarPresentacion = (): void => {};
export const leerPermiso = async (): Promise<boolean> => false;
export const pedirPermiso = async (): Promise<boolean> => false;
export const obtenerTokenFcm = async (): Promise<string | null> => null;
export const escucharTokenFcm: (listener: (token: string) => void) => () => void = sinSuscripcion;
export const extraerDatosPush = (): DatosPushComred | null => null;
export const escucharMensajes: (listener: (mensaje: MensajeRecibido) => void) => () => void =
  sinSuscripcion;
export const mostrarAvisoLocal = async (): Promise<void> => {};
export const leerAperturaInicial = async (): Promise<DatosPushComred | null> => null;
export const escucharAperturas: (listener: (datos: DatosPushComred) => void) => () => void =
  sinSuscripcion;
