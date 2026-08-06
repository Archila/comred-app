import { api } from '@/api';
import { ENDPOINTS } from '@/constants';
import type { AuthSession, LoginPayload, Usuario } from '@/models';

/**
 * Actions de autenticacion.
 *
 * Un "action" es una funcion pura que habla con el API: recibe datos tipados,
 * devuelve datos tipados y desenvuelve el `ApiResponse`. No sabe nada de React
 * (ni hooks, ni estado, ni navegacion). Eso lo hace la capa `hooks/`.
 */
export const authActions = {
  /** `POST /auth/login` - devuelve el usuario y el JWT. */
  async login(payload: LoginPayload): Promise<AuthSession> {
    const response = await api.post<AuthSession>(ENDPOINTS.auth.login, payload);
    return response.data;
  },

  /**
   * `POST /auth/verify-token` - valida el token guardado al abrir la app.
   * El API responde con un token renovado, hay que persistir el nuevo.
   */
  async verifyToken(token: string): Promise<AuthSession> {
    const response = await api.post<AuthSession>(ENDPOINTS.auth.verifyToken, { token });
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
