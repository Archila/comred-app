/**
 * Bandeja de entrada del dispositivo.
 *
 * Es la FUENTE DE VERDAD de lo que se le ha enviado a este aparato, y no la
 * notificacion: con la app cerrada el sistema operativo pinta el aviso sin
 * ejecutar nada de JavaScript, en background el handler de Android no siempre
 * corre, y con las notificaciones denegadas no llega nada en absoluto. Por eso
 * la app sincroniza contra el servidor en cada `AppState -> active`.
 *
 * Se autentica con las cabeceras del dispositivo, no con el JWT: un vecino sin
 * cuenta tambien tiene bandeja, porque los avisos a la ciudadania van al
 * aparato.
 */

/** Espejo de `TipoMensaje` del API. Decide el canal de Android y el trato en iOS. */
export type TipoMensaje = 'EMERGENCIA' | 'ALERTA' | 'INFORMATIVO';

/** Espejo de `PrioridadMensaje` del API. */
export type PrioridadMensaje = 'ALTA' | 'NORMAL';

/** Una entrada de `GET /comred/dispositivos/mensajes`. */
export interface MensajeBandeja {
  mensajeId: string;
  titulo: string;
  cuerpo: string;
  tipo: TipoMensaje;
  prioridad: PrioridadMensaje;
  imagenUrl: string | null;
  /** Payload extra del emisor (deep-link, coordenadas...). Solo cadenas. */
  data: Record<string, string> | null;
  leido: boolean;
  /** ISO 8601. `null` mientras no se haya acusado recibo. */
  fechaLectura: string | null;
  /**
   * Cuando se registro la entrega a ESTE aparato, no cuando se redacto el
   * mensaje. Es el campo por el que ordena el API.
   */
  fechaRecepcion: string;
}

/** Query params de `GET /comred/dispositivos/mensajes`. */
export interface BandejaParams {
  page?: number;
  /** El API lo limita a 100. */
  limit?: number;
  soloNoLeidos?: boolean;
}

/**
 * Resultado normalizado de la bandeja.
 *
 * `noLeidos` viene en la misma respuesta para que el contador del icono no
 * obligue a una segunda llamada.
 */
export interface BandejaResult {
  items: MensajeBandeja[];
  total: number;
  page: number;
  limit: number;
  noLeidos: number;
  hasNextPage: boolean;
}

/** Respuesta de `POST /comred/dispositivos/mensajes/:id/leido`. */
export interface AcuseReciboResponse {
  mensajeId: string;
  leido: boolean;
  /** La del PRIMER acuse: repetirlo no la mueve. */
  fechaLectura: string | null;
}

/**
 * Claves que el servidor anade al `data` de toda notificacion. Son las que
 * permiten ir del push a la bandeja y acusar recibo desde el tap, sin abrir
 * antes la lista.
 */
export interface DatosPushComred {
  mensajeId: string;
  tipo: TipoMensaje;
}
