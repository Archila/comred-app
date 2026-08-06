/**
 * Contrato tipado de las variables de entorno.
 *
 * Expo reemplaza `process.env.EXPO_PUBLIC_*` en tiempo de compilacion, por eso
 * hay que escribir el acceso completo y literal (no se puede desestructurar
 * `process.env` ni indexarlo dinamicamente).
 *
 * Fuente de los valores: archivo `.env` en la raiz del proyecto.
 */

type AppEnvironment = 'development' | 'staging' | 'production';

/** Lanza un error temprano y claro si falta una variable obligatoria. */
function required(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `[env] Falta la variable ${name}. Copia .env.example a .env y reinicia con "npx expo start --clear".`,
    );
  }
  return value.trim();
}

function toNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** URL base del API, siempre sin `/` final para poder concatenar rutas. */
const apiUrl = required(process.env.EXPO_PUBLIC_API_URL, 'EXPO_PUBLIC_API_URL').replace(
  /\/+$/,
  '',
);

const environment = (process.env.EXPO_PUBLIC_ENV ?? 'development') as AppEnvironment;

export const env = {
  /** Ej: `http://192.168.0.10:3000/v1` */
  apiUrl,
  /** Entorno logico de la app. */
  environment,
  /** Timeout de las peticiones HTTP en milisegundos. */
  apiTimeout: toNumber(process.env.EXPO_PUBLIC_API_TIMEOUT, 20_000),
  /** Atajos utiles para condicionar logs o herramientas de debug. */
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
} as const;

export type Env = typeof env;
