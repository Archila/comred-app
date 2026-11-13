import { Platform } from 'react-native';

import { api, getDispositivoCredentials } from '@/api';
import { env } from '@/config';
import { ENDPOINTS } from '@/constants';
import { getVersionCodigo } from '@/lib';
import type {
  AuthSession,
  LoginPayload,
  LoginRequest,
  LoginResponse,
  Usuario,
  VerifyTokenPayload,
} from '@/models';

/**
 * Actions de autenticacion.
 *
 * Un "action" es una funcion pura que habla con el API: recibe datos tipados,
 * devuelve datos tipados y desenvuelve el `ApiResponse`. No sabe nada de React
 * (ni hooks, ni estado, ni navegacion). Eso lo hace la capa `hooks/`.
 */
export const authActions = {
  /**
   * `POST /auth/login` - devuelve el usuario y el JWT.
   *
   * Completa lo que la pantalla no debe decidir:
   *   - `organizacionId`: la del build. El API la exige porque `userName` solo
   *     es unico dentro de una organizacion.
   *   - `cliente`: MOVIL en nativo (token de 30 dias, guardado cifrado). En web
   *     el token vive en `localStorage`, sin cifrar, asi que se pide la
   *     vigencia corta.
   *   - Credenciales del dispositivo, si ya esta registrado: el API lo vincula
   *     al usuario para que reciba los mensajes dirigidos a el.
   */
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const dispositivo = getDispositivoCredentials();
    const appVersion = getVersionCodigo();

    const body: LoginRequest = {
      ...payload,
      organizacionId: env.organizacionId,
      cliente: Platform.OS === 'web' ? 'WEB' : 'MOVIL',
      // El API rechaza un binario por debajo de la minima de la organizacion.
      ...(appVersion !== null && { appVersion }),
      ...(dispositivo && {
        dispositivoId: dispositivo.dispositivoId,
        dispositivoKey: dispositivo.clave,
      }),
    };

    const response = await api.post<LoginResponse>(ENDPOINTS.auth.login, body);
    return response.data;
  },

  /**
   * `POST /auth/verify-token` - valida el token guardado al abrir la app.
   * El API responde con un token renovado, hay que persistir el nuevo.
   *
   * Se envia la organizacion del build: un token emitido para otra
   * municipalidad no debe revivir la sesion en este build.
   */
  async verifyToken(token: string): Promise<AuthSession> {
    const body: VerifyTokenPayload = { token, organizacionId: env.organizacionId };
    const response = await api.post<AuthSession>(ENDPOINTS.auth.verifyToken, body);
    return response.data;
  },

  /** `GET /auth/me` - usuario autenticado a partir del header Authorization. */
  async getCurrentUser(): Promise<Usuario> {
    const response = await api.get<Usuario>(ENDPOINTS.auth.me);
    return response.data;
  },

  /** `POST /auth/usuarios/cambiar-clave` */
  async cambiarClave(payload: {
    usuarioId: string;
    claveAnterior: string;
    claveNueva: string;
  }): Promise<void> {
    await api.post(ENDPOINTS.usuarios.cambiarClave, payload);
  },
};
