import axios from 'axios';

import type { ApiErrorResponse } from '@/models';

/**
 * Error normalizado de la aplicacion.
 *
 * Toda falla (HTTP, red, timeout o cancelacion) llega a la UI como una
 * `ApiException`, de modo que las pantallas nunca tengan que inspeccionar
 * objetos de axios ni distinguir formatos de error.
 */
export class ApiException extends Error {
  readonly statusCode: number;
  readonly path?: string;
  /** Mensajes crudos del ValidationPipe cuando el 400 viene de class-validator. */
  readonly details?: string[];
  readonly isNetworkError: boolean;

  constructor(params: {
    message: string;
    statusCode: number;
    path?: string;
    details?: string[];
    isNetworkError?: boolean;
  }) {
    super(params.message);
    this.name = 'ApiException';
    this.statusCode = params.statusCode;
    this.path = params.path;
    this.details = params.details;
    this.isNetworkError = params.isNetworkError ?? false;
  }

  /** El token es invalido o expiro: hay que cerrar sesion. */
  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /** El usuario esta autenticado pero no tiene permiso sobre el recurso. */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /** 426: el binario esta por debajo de la version minima de la organizacion. */
  get isVersionObsoleta(): boolean {
    return this.statusCode === 426;
  }

  /** Error de validacion o de negocio: el mensaje es apto para mostrarse. */
  get isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422;
  }
}

const NETWORK_MESSAGE =
  'No se pudo conectar con el servidor. Revisa tu conexion e intenta de nuevo.';
const TIMEOUT_MESSAGE = 'El servidor tardo demasiado en responder. Intenta de nuevo.';
const UNKNOWN_MESSAGE = 'Ocurrio un error inesperado. Intenta de nuevo.';

/** Convierte cualquier error capturado en una `ApiException`. */
export function toApiException(error: unknown): ApiException {
  if (error instanceof ApiException) return error;

  if (axios.isAxiosError(error)) {
    // Sin respuesta del servidor: red caida, DNS, CORS o timeout.
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
      return new ApiException({
        message: isTimeout ? TIMEOUT_MESSAGE : NETWORK_MESSAGE,
        statusCode: 0,
        isNetworkError: true,
      });
    }

    const body = error.response.data as Partial<ApiErrorResponse> | undefined;
    const rawMessage = body?.message;

    // El ValidationPipe de Nest responde con un arreglo de mensajes.
    const details = Array.isArray(rawMessage) ? rawMessage : undefined;
    const message = Array.isArray(rawMessage)
      ? rawMessage[0]
      : (rawMessage ?? error.message ?? UNKNOWN_MESSAGE);

    return new ApiException({
      message,
      statusCode: error.response.status,
      path: body?.path,
      details,
    });
  }

  if (error instanceof Error) {
    return new ApiException({ message: error.message || UNKNOWN_MESSAGE, statusCode: 0 });
  }

  return new ApiException({ message: UNKNOWN_MESSAGE, statusCode: 0 });
}

/** Mensaje listo para pintar en pantalla, venga de donde venga el error. */
export function getErrorMessage(error: unknown): string {
  return toApiException(error).message;
}
