/**
 * Contenido publico de la organizacion: tarjetas de cada seccion y las
 * publicaciones del visor vertical. Espejo de lo que devuelve
 * `ContenidoPublicoService` del API (`/comred/contenido/publico`).
 *
 * Se autentica con las cabeceras del DISPOSITIVO, no con el JWT: un vecino sin
 * cuenta tambien ve los boletines y los reportes. Con sesion abierta en el
 * aparato el API anade, ademas, lo interno de su brigada o COCODE.
 */

/** Espejo de `SeccionContenido` del API. El mapa no esta: no tiene contenido propio. */
export type SeccionContenido =
  | 'GENERAL'
  | 'REPORTES'
  | 'BOLETINES'
  | 'JORNADAS'
  | 'BRIGADAS'
  | 'PROYECTOS'
  | 'COCODES';

export type TipoMedia = 'IMAGEN' | 'VIDEO' | 'DOCUMENTO';

/** Ciclo de vida del hecho. */
export type EstadoIncidente =
  | 'REPORTADO'
  | 'EN_EVALUACION'
  | 'EN_ATENCION'
  | 'CONTROLADO'
  | 'CERRADO';

/**
 * Cuanto respalda la organizacion lo que dice el reporte. Es otro eje que el
 * estado: un derrumbe puede estar "en atencion" y seguir sin verificar. El
 * Plan Maestro (5.3) exige distinguir las tres cosas a simple vista.
 */
export type VerificacionIncidente = 'REPORTE' | 'VERIFICADO' | 'ALERTA_OFICIAL';

/** Plan Maestro 7: proxima, en desarrollo, finalizada o cancelada. */
export type EstadoJornada = 'PROXIMA' | 'EN_DESARROLLO' | 'FINALIZADA' | 'CANCELADA';

export type EstadoProyecto = 'PLANIFICADO' | 'EN_EJECUCION' | 'SUSPENDIDO' | 'FINALIZADO';

/** Una tarjeta de la pantalla de categorias de una seccion. */
export interface CategoriaContenido {
  id: string;
  seccion: SeccionContenido;
  nombre: string;
  descripcion: string | null;
  /** Nombre de icono configurado en el panel. Puede venir vacio. */
  icono: string | null;
  /** URL absoluta o ruta del modulo storage. */
  portadaUrl: string | null;
  orden: number;
}

/** Un archivo de la galeria horizontal (o un documento adjunto). */
export interface MediaPublicacion {
  id: string;
  tipo: TipoMedia;
  url: string;
  /** Texto alternativo, o el nombre del documento. */
  titulo: string | null;
  orden: number;
}

/** Un desastre concreto. Sus publicaciones lo van contando. */
export interface IncidentePublico {
  id: string;
  categoriaContenidoId: string;
  nombre: string;
  descripcion: string | null;
  comunidad: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoIncidente;
  verificacion: VerificacionIncidente;
  /** ISO 8601. */
  fechaReporte: string;
  instituciones: string | null;
  recomendaciones: string | null;
  /** Solo afectaciones ya verificadas. */
  afectaciones: string | null;
}

/** Una actividad con fecha y lugar. Sus publicaciones la anuncian y la cuentan. */
export interface JornadaPublica {
  id: string;
  categoriaContenidoId: string;
  nombre: string;
  descripcion: string | null;
  /** Institucion organizadora. */
  institucion: string | null;
  /** ISO 8601. */
  fechaInicio: string;
  fechaFin: string | null;
  /** Texto para la gente ("8:00 a 15:00"); las fechas son para ordenar. */
  horario: string | null;
  lugar: string | null;
  /** Comunidad beneficiada. */
  comunidad: string | null;
  servicios: string | null;
  requisitos: string | null;
  contacto: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoJornada;
}

/** Una obra municipal. Sus publicaciones son el seguimiento del avance. */
export interface ProyectoPublico {
  id: string;
  categoriaContenidoId: string;
  nombre: string;
  descripcion: string | null;
  comunidad: string | null;
  /** Dependencia responsable. */
  dependencia: string | null;
  /** 'AAAA-MM-DD', sin hora: no pasa por la zona horaria. */
  fechaInicio: string | null;
  fechaFinPrevista: string | null;
  estado: EstadoProyecto;
  /** Porcentaje 0-100. `null` = sin dato comprobado, que no es lo mismo que 0. */
  avance: number | null;
  latitud: number | null;
  longitud: number | null;
}

/** Una publicacion del visor. Es la misma forma para todas las secciones. */
export interface Publicacion {
  id: string;
  seccion: SeccionContenido;
  titulo: string;
  descripcion: string | null;
  dependencia: string | null;
  comunidad: string | null;
  prioridad: number;
  /** ISO 8601. Para un boletin, su fecha de emision. */
  fechaPublicacion: string;
  /** ISO 8601. Ultima edicion desde el panel; los API anteriores no la envian. */
  fechaActualizacion?: string | null;
  /** Visibilidad GRUPO: contenido interno de una brigada o COCODE. */
  interna: boolean;
  categoria: { id: string; nombre: string } | null;
  /** Como mucho una de las tres: lo propio de su seccion. */
  incidente: IncidentePublico | null;
  jornada: JornadaPublica | null;
  proyecto: ProyectoPublico | null;
  media: MediaPublicacion[];
}

/** Query params de `GET /comred/contenido/publico/publicaciones`. */
export interface FeedPublicacionesParams {
  page?: number;
  /** El API lo limita a 50. */
  limit?: number;
  seccion?: SeccionContenido;
  categoriaContenidoId?: string;
  incidenteId?: string;
  jornadaId?: string;
  proyectoId?: string;
}

/**
 * Query params de los listados de entidades: `incidentes`, `jornadas` y
 * `proyectos` de `/comred/contenido/publico`.
 */
export interface EntidadesParams {
  page?: number;
  limit?: number;
  categoriaContenidoId?: string;
}

/** Los incidentes no filtran por nada mas. */
export type IncidentesParams = EntidadesParams;
