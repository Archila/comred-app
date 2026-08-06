import axios, { type AxiosRequestConfig, type AxiosInstance } from 'axios';

import { env } from '@/config';
import { STORAGE_KEYS } from '@/constants';
import { secureStorage } from '@/lib';
import type { ApiResponse } from '@/models';

import { toApiException } from './api-error';

/**
 * Cliente HTTP unico de la aplicacion.
 *
 * Responsabilidades:
 *   1. Base URL y timeout desde `.env`.
 *   2. Inyectar el header `Authorization: Bearer <token>`.
 *   3. Normalizar cualquier error a `ApiException`.
 *   4. Avisar al store de sesion cuando el API responde 401.
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
      authToken = null;
      onUnauthorized?.();
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
