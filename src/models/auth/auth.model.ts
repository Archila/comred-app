import type { Usuario } from './usuario.model';

/** Payload de `POST /auth/login`. Espejo de `LoginDto`. */
export interface LoginPayload {
  /** Minimo 3 caracteres (validado tambien en el API). */
  userName: string;
  /** Minimo 6 caracteres. */
  password: string;
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
