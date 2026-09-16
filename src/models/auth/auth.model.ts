import type { Usuario } from './usuario.model';

/**
 * Tipo de cliente que inicia sesion. El API emite el token con 30 dias de
 * vigencia para MOVIL y con la vigencia corta del panel para WEB.
 */
export type ClienteAuth = 'MOVIL' | 'WEB';

/** Datos que captura la pantalla de login. */
export interface LoginPayload {
  /** Minimo 3 caracteres (validado tambien en el API). */
  userName: string;
  /** Minimo 6 caracteres. */
  password: string;
}

/**
 * Cuerpo de `POST /auth/login`. Espejo de `LoginDto`.
 *
 * Lo arma `authActions.login` a partir de `LoginPayload`: la organizacion sale
 * del build y las credenciales del dispositivo del cliente HTTP, no de la
 * pantalla.
 */
export interface LoginRequest extends LoginPayload {
  /** `userName` solo es unico dentro de una organizacion: es obligatoria. */
  organizacionId: string;
  cliente: ClienteAuth;
  /** Van en pareja. Vinculan el dispositivo a la sesion en el API. */
  dispositivoId?: string;
  dispositivoKey?: string;
}

/** `data` de `POST /auth/verify-token`. */
export interface AuthSession {
  user: Usuario;
  token: string;
}

/** `data` de `POST /auth/login`. */
export interface LoginResponse extends AuthSession {
  /**
   * `false` si el login se hizo sin credenciales de dispositivo o si el API
   * no las acepto. La sesion es valida igual, pero el aparato solo recibira
   * los avisos generales hasta que quede vinculado.
   */
  dispositivoVinculado: boolean;
}

/** Cuerpo de `POST /auth/verify-token`. Espejo de `VerifyTokenDto`. */
export interface VerifyTokenPayload {
  token: string;
  /** El API solo renueva tokens emitidos para esta organizacion. */
  organizacionId: string;
}
