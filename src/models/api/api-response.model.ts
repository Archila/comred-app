/**
 * Envoltorio estandar de TODAS las respuestas del API COMRED.
 * Lo produce `BaseService.customSuccessResponse` en NestJS.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  /** El API lo serializa como string ("200"), pero el filtro de errores usa number. */
  statusCode: string | number;
  path: string;
  /** Formato `DD/MM/YYYY HH:mm:ss` en zona America/Guatemala. */
  timestamp: string;
  message: string;
  data: T;
  metadata: ApiMetadata | null;
}

/** Metadatos que acompanan a las respuestas paginadas. */
export interface ApiMetadata {
  total: number;
  page: number;
  limit: number;
  [key: string]: unknown;
}

/** Cuerpo que devuelve `HttpCustomExceptionFilter` cuando algo falla. */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  path: string;
  timestamp: string;
  /** Puede ser un string o el arreglo de mensajes del ValidationPipe. */
  message: string | string[];
}

export type SingleItemResponse<T> = ApiResponse<T>;
export type ListResponse<T> = ApiResponse<T[]>;
