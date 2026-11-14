import axios, { isAxiosError, type AxiosRequestConfig, type AxiosInstance } from 'axios';

import { env } from '@/config';
import { ENDPOINTS, STORAGE_KEYS } from '@/constants';
import { getVersionCodigo, secureStorage } from '@/lib';
import type { ApiResponse } from '@/models';

import { toApiException } from './api-error';

/**
 * Cliente HTTP unico de la aplicacion.
 *
 * Responsabilidades:
 *   1. Base URL y timeout desde `.env`.
 *   2. Inyectar el header `Authorization: Bearer <token>`.
 *   3. Normalizar cualquier error a `ApiException`.
 *   4. Enviar la version del binario (`x-app-version`) en cada peticion.
 *   5. Avisar al store de sesion cuando el API responde 401, o al de
 *      dispositivo si el 401 viene de una ruta del aparato.
 *   6. Avisar cuando el API responde 426 (version obsoleta).
 *
 * Las pantallas NUNCA importan este archivo: solo lo usan los `actions`.
 */

/* -------------------------------------------------------------------------- */
/* Token en memoria                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Copia en memoria del JWT. Evita pegarle al almacenamiento seguro en cada
 * peticion y evita una dependencia circular con el store de Zustand.
 * El store la mantiene sincronizada llamando a `setAuthToken`.
 */
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

/* -------------------------------------------------------------------------- */
/* Credenciales del dispositivo                                                */
/* -------------------------------------------------------------------------- */

/**
 * El dispositivo anonimo no tiene JWT: se autentica ante el API con el par
 * `x-dispositivo-id` / `x-dispositivo-key` que recibio al registrarse.
 *
 * Es independiente de la sesion: sigue siendo valido con el usuario deslogueado,
 * que es justo lo que necesitan las rutas de bandeja y token push. Lo mantiene
 * sincronizado el store de dispositivo.
 */
interface DispositivoCredentials {
  dispositivoId: string;
  clave: string;
}

let dispositivoCredentials: DispositivoCredentials | null = null;

export function setDispositivoCredentials(credentials: DispositivoCredentials | null): void {
  dispositivoCredentials = credentials;
}

export function getDispositivoCredentials(): DispositivoCredentials | null {
  return dispositivoCredentials;
}

/* -------------------------------------------------------------------------- */
/* Callback de sesion expirada                                                 */
/* -------------------------------------------------------------------------- */

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Registra que hacer cuando el API responde 401 (token invalido o expirado).
 * Lo conecta `AuthProvider` con la accion `logout` del store.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

let onDispositivoRechazado: UnauthorizedHandler | null = null;

/**
 * Registra que hacer cuando el API rechaza las credenciales del DISPOSITIVO.
 *
 * Es otro 401 y no se trata igual: las rutas del aparato no miran el JWT, asi
 * que cerrar sesion no arreglaria nada —el usuario saldria en cada arranque— y
 * el telefono seguiria sin recibir avisos. Lo que hay que hacer es volver a
 * registrar el aparato. Lo conecta `DispositivoProvider`.
 */
export function setDispositivoRechazadoHandler(handler: UnauthorizedHandler | null): void {
  onDispositivoRechazado = handler;
}

/* -------------------------------------------------------------------------- */
/* Version de la app                                                           */
/* -------------------------------------------------------------------------- */

/**
 * `versionCode` del binario, constante mientras la app esta abierta. Viaja en
 * TODAS las peticiones: el API rechaza con 426 cualquier accion de un binario
 * por debajo de la minima, no solo el login. El nombre tiene que coincidir con
 * `HEADER_APP_VERSION` del API. En web es `null` y no se envia: ahi no aplica.
 */
const VERSION_APP = getVersionCodigo();

let onVersionObsoleta: UnauthorizedHandler | null = null;

/**
 * Registra que hacer cuando el API responde 426. Lo conecta `QueryProvider`:
 * refresca la version de la organizacion para que el navegador raiz levante
 * el muro de actualizacion.
 */
export function setVersionObsoletaHandler(handler: UnauthorizedHandler | null): void {
  onVersionObsoleta = handler;
}

function esRutaDeDispositivo(error: unknown): boolean {
  const url = isAxiosError(error) ? error.config?.url : undefined;
  return url?.startsWith(`${ENDPOINTS.dispositivos.base}/`) ?? false;
}

/* -------------------------------------------------------------------------- */
/* Instancia de axios                                                          */
/* -------------------------------------------------------------------------- */

export const httpClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use(async (config) => {
  // Si aun no hay token en memoria (arranque en frio), se recupera del
  // almacenamiento seguro una sola vez.
  if (!authToken) {
    authToken = await secureStorage.getItem(STORAGE_KEYS.token);
  }

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (dispositivoCredentials) {
    config.headers['x-dispositivo-id'] = dispositivoCredentials.dispositivoId;
    config.headers['x-dispositivo-key'] = dispositivoCredentials.clave;
  }

  if (VERSION_APP !== null) {
    config.headers['x-app-version'] = String(VERSION_APP);
  }

  if (env.isDevelopment) {
    console.log(`[http] ${config.method?.toUpperCase()} ${config.baseURL ?? ''}${config.url ?? ''}`);
  }

  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const exception = toApiException(error);

    if (exception.isUnauthorized) {
      if (esRutaDeDispositivo(error)) {
        onDispositivoRechazado?.();
      } else {
        authToken = null;
        onUnauthorized?.();
      }
    }

    if (exception.isVersionObsoleta) {
      onVersionObsoleta?.();
    }

    if (env.isDevelopment) {
      console.warn(`[http] ${exception.statusCode} ${exception.path ?? ''} - ${exception.message}`);
    }

    return Promise.reject(exception);
  },
);

/* -------------------------------------------------------------------------- */
/* Helpers tipados                                                             */
/* -------------------------------------------------------------------------- */

/**
 * `T` es el tipo de `data` DENTRO del envoltorio: cada helper resuelve a
 * `ApiResponse<T>` para que los actions puedan leer tambien `message` y
 * `metadata` (paginacion).
 */
export const api = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return httpClient.get<ApiResponse<T>>(url, config).then((res) => res.data);
  },

  post<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.post<ApiResponse<T>>(url, body, config).then((res) => res.data);
  },

  put<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.put<ApiResponse<T>>(url, body, config).then((res) => res.data);
  },

  patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig) {
    return httpClient.patch<ApiResponse<T>>(url, body, config).then((res) => res.data);
  },

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return httpClient.delete<ApiResponse<T>>(url, config).then((res) => res.data);
  },

  /**
   * Subida de archivos al modulo `storage` del API.
   * No se fija `Content-Type`: axios debe generar el boundary del multipart.
   */
  upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig) {
    return httpClient
      .post<ApiResponse<T>>(url, formData, {
        ...config,
        headers: { ...config?.headers, 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
};
