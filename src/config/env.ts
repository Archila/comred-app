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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID de la organizacion (municipalidad) para la que se compila este build.
 *
 * Obligatoria: el API la exige para registrar el dispositivo, para el login
 * (`userName` solo es unico dentro de una organizacion) y para renovar el
 * token. Un build sin ella no podria hacer ninguna de las tres cosas, asi que
 * es preferible que no arranque a que parezca operativo sin serlo.
 */
const organizacionId = required(
  process.env.EXPO_PUBLIC_ORGANIZACION_ID,
  'EXPO_PUBLIC_ORGANIZACION_ID',
);

if (!UUID.test(organizacionId)) {
  throw new Error(
    `[env] EXPO_PUBLIC_ORGANIZACION_ID no es un UUID valido: "${organizacionId}".`,
  );
}

export const env = {
  /** Ej: `http://192.168.0.10:3000/v1` */
  apiUrl,
  /** Entorno logico de la app. */
  environment,
  /** UUID de la organizacion embebido en el build. */
  organizacionId,
  /** Timeout de las peticiones HTTP en milisegundos. */
  apiTimeout: toNumber(process.env.EXPO_PUBLIC_API_TIMEOUT, 20_000),
  /** Atajos utiles para condicionar logs o herramientas de debug. */
  isDevelopment: environment === 'development',
  isProduction: environment === 'production',
} as const;

export type Env = typeof env;
