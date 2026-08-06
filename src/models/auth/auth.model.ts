import type { Usuario } from './usuario.model';

/** Payload de `POST /auth/login`. Espejo de `LoginDto`. */
export interface LoginPayload {
  /** Minimo 3 caracteres (validado tambien en el API). */
  userName: string;
  /** Minimo 6 caracteres. */
  password: string;
  /**
   * Organizacion contra la que se autentica.
   *
   * `userName` solo es unico DENTRO de una organizacion: dos municipalidades
   * pueden tener cada una su propio "admin". La app lo envia siempre que el
   * build lo tenga configurado; si no, y el usuario existe en varias, el API
   * responde AUT-01-04 pidiendo que se indique.
   */
  organizacionId?: string;
}

/** `data` de `POST /auth/login` y de `POST /auth/verify-token`. */
export interface AuthSession {
  user: Usuario;
  token: string;
}

/** Payload de `POST /auth/verify-token`. */
export interface VerifyTokenPayload {
  token: string;
}
