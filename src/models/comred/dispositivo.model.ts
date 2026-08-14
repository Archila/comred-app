/**
 * Registro anonimo del dispositivo.
 *
 * El dispositivo es el destinatario real de las notificaciones —FCM entrega a
 * un token, no a una persona— y existe desde el primer arranque, antes de que
 * haya usuario. Todo este modelo es previo al login.
 */

/** Valores que acepta `dispositivo.plataforma` en el API. */
export type PlataformaDispositivo = 'ANDROID' | 'IOS' | 'WEB';

/** Cuerpo de `POST /comred/dispositivos/registro`. */
export interface RegistrarDispositivoRequest {
  organizacionId: string;
  /** UUID generado por la app y persistido en el almacenamiento seguro. */
  instalacionId: string;
  plataforma: PlataformaDispositivo;
  modelo?: string;
  osVersion?: string;
  appVersion?: string;
  idioma?: string;
  /** Token FCM. Aun no se envia: llega con la fase de push. */
  pushToken?: string;
  notificacionesActivas?: boolean;
}

/** Respuesta de `POST /comred/dispositivos/registro`. */
export interface RegistroDispositivoResponse {
  dispositivoId: string;
  organizacionId: string;
  instalacionId: string;
  /**
   * Secreto en claro. El API lo devuelve UNA sola vez: hay que guardarlo en
   * el acto o se pierde para siempre (la unica salida seria re-registrar).
   */
  clave: string;
  notificacionesActivas: boolean;
  tienePushToken: boolean;
  /** `false` = la instalacion ya existia en el API y solo se roto la clave. */
  creado: boolean;
}

/**
 * Lo que la app persiste del registro, sin el secreto.
 *
 * `organizacionId` se guarda a proposito: si un build cambia de municipalidad,
 * el registro guardado deja de valer y hay que rehacerlo contra la nueva.
 */
export interface DispositivoRegistrado {
  dispositivoId: string;
  organizacionId: string;
  instalacionId: string;
  /** ISO 8601 del momento en que se guardo. Util para diagnostico. */
  registradoEn: string;
}
