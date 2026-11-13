import type { PrioridadMensaje, TipoMensaje } from './bandeja.model';

/**
 * Envio de avisos desde la app (`/comred/mensajes`).
 *
 * Lo usa quien tiene `MSG_ENVIAR` y algun permiso de alcance. Todo lo que la
 * app ofrece sale de `GET /comred/mensajes/capacidades`, pero el API vuelve a
 * validarlo en cada envio: ocultar una opcion aqui es comodidad, no seguridad.
 */

/** Espejo de `AlcanceMensaje` del API: a quien va dirigido el aviso. */
export type AlcanceMensaje = 'ORGANIZACION' | 'DISPOSITIVOS' | 'CATEGORIA' | 'SUBCATEGORIA';

/** Respuesta de `GET /comred/mensajes/capacidades`. */
export interface CapacidadesEnvio {
  /** `false` si le falta `MSG_ENVIAR` o no tiene ningun alcance. */
  puedeEnviar: boolean;
  alcances: AlcanceMensaje[];
  /** Con `MSG_ENVIAR_TODAS` puede apuntar a cualquier grupo de su municipalidad. */
  puedeTodas: boolean;
  /** `MSG_LEER`: avisos enviados por la organizacion, con su estado. */
  puedeVerHistorial: boolean;
  /** `MSG_AUDITORIA` (y `MSG_LEER`): quien leyo cada aviso, telefono por telefono. */
  puedeVerAuditoria: boolean;
  /**
   * Destinos que el API le aceptaria con CATEGORIA o SUBCATEGORIA. Sin
   * `puedeTodas`, solo los suyos.
   */
  categorias: CategoriaDestino[];
}

export interface CategoriaDestino {
  id: string;
  nombre: string;
  subcategorias: { id: string; nombre: string }[];
}

/**
 * A quien llega el aviso. Lo comparten la vista previa y el envio, igual que
 * en el API: el numero que se confirma tiene que ser el del envio.
 */
export interface AlcancePayload {
  alcance: AlcanceMensaje;
  /** Solo con CATEGORIA o SUBCATEGORIA. El API admite como maximo 50. */
  destinos?: string[];
}

/** Cuerpo de `POST /comred/mensajes`. */
export interface CrearMensajePayload extends AlcancePayload {
  /** Entre 3 y 120 caracteres. */
  titulo: string;
  /** Entre 3 y 1000 caracteres. */
  cuerpo: string;
  tipo: TipoMensaje;
  prioridad?: PrioridadMensaje;
}

/** Respuesta de `POST /comred/mensajes/preview`. */
export interface PreviewMensaje {
  /** Telefonos a los que llega, suene o no. */
  total: number;
  /** A cuantos les sonara: tienen token de push. */
  conPush: number;
  /** Solo lo veran al abrir la app (notificaciones denegadas o sin token). */
  sinPush: number;
}

/**
 * Espejo de `EstadoMensaje` del API. PARCIAL es lo normal cuando hay telefonos
 * con las notificaciones desactivadas: a esos no les sono, aunque lo tengan en
 * la bandeja.
 */
export type EstadoMensaje = 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'PARCIAL' | 'FALLIDO';

/** Espejo de `EstadoEnvio` del API: como acabo la entrega a UN telefono. */
export type EstadoEnvio = 'ENVIADO' | 'FALLIDO' | 'SIN_TOKEN' | 'SIMULADO';

/**
 * Respuesta de `POST /comred/mensajes` (202). El aviso queda aceptado; las
 * entregas ocurren despues, en segundo plano.
 */
export interface MensajeCreado {
  id: string;
  estado: EstadoMensaje;
  alcance: AlcanceMensaje;
  tipo: TipoMensaje;
}

/** Quien envio el aviso. Solo lo necesario para mostrarlo. */
export interface EmisorMensaje {
  id: string;
  userName: string;
  nombreCompleto: string;
}

/** Una fila de `GET /comred/mensajes`. */
export interface MensajeHistorial {
  id: string;
  titulo: string;
  tipo: TipoMensaje;
  prioridad: PrioridadMensaje;
  alcance: AlcanceMensaje;
  estado: EstadoMensaje;
  /** Los fija el despacho al cerrar; valen 0 mientras esta en curso. */
  totalDestinatarios: number;
  totalEnviados: number;
  totalFallidos: number;
  /** Acuses de recibo. Sigue creciendo despues de cerrado el envio. */
  totalLeidos: number;
  /** ISO 8601. `null` hasta que cierra el despacho. */
  fechaEnvio: string | null;
  created_at: string;
  enviadoPor: EmisorMensaje | null;
}

export interface HistorialParams {
  page?: number;
  limit?: number;
  estado?: EstadoMensaje;
  tipo?: TipoMensaje;
}

/**
 * Como acabo la entrega, contado en el servidor sobre el log de cada
 * telefono. Distingue lo que el historial junta en `totalFallidos`: un
 * telefono sin notificaciones (`sinToken`) no es un fallo de envio.
 */
export interface ResumenEntrega {
  total: number;
  enviados: number;
  /** Con el push apagado en el servidor (desarrollo): registrado, no enviado. */
  simulados: number;
  sinToken: number;
  fallidos: number;
  leidos: number;
}

/** Respuesta de `GET /comred/mensajes/:id`. */
export interface MensajeDetalle extends Omit<MensajeHistorial, 'totalLeidos'> {
  cuerpo: string;
  imagenUrl: string | null;
  /** A que se dirigio, con el nombre congelado en el momento del envio. */
  destinos: { id: string; tipoDestino: AlcanceMensaje; destinoNombre: string | null }[];
  resumen: ResumenEntrega;
}

/** Una fila de `GET /comred/mensajes/:id/envios`. Un telefono. */
export interface EnvioMensaje {
  id: string;
  estado: EstadoEnvio;
  errorCodigo: string | null;
  leido: boolean;
  fechaLectura: string | null;
  /** Cuando se registro la entrega a este telefono. */
  fecha: string;
  dispositivoId: string;
  plataforma: string | null;
  modelo: string | null;
  /** `null` si el telefono no tenia sesion: un vecino sin cuenta. */
  usuarioId: string | null;
  usuario: string | null;
  nombreUsuario: string | null;
  teniaToken: boolean;
}

export interface EnviosParams {
  page?: number;
  /** El API lo limita a 100. */
  limit?: number;
  /** `true`: quienes leyeron; `false`: quienes aun no. */
  leido?: boolean;
}
