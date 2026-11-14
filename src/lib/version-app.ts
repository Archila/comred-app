import * as Application from 'expo-application';
import { Linking } from 'react-native';

import type { VersionOrganizacion } from '@/models';

/**
 * Control de version de la app contra lo que exige su organizacion.
 *
 * Se compara el numero de compilacion del BINARIO (`versionCode` en Android,
 * derivado de `version` en `app.config.js`: 1.0.1 -> 10001), no el texto
 * "1.0.1" ni nada que viaje en el bundle de JS: lo que hay que saber es que
 * APK tiene instalado el telefono.
 */

/**
 * - `OBLIGATORIA`: por debajo de la minima. No se puede usar la app.
 * - `DISPONIBLE`: sirve, pero hay una mas nueva. Solo se avisa.
 * - `AL_DIA`: nada que hacer (o no se pudo saber).
 */
export type EstadoVersion = 'AL_DIA' | 'DISPONIBLE' | 'OBLIGATORIA';

/**
 * Numero de compilacion instalado. `null` en web, donde no hay binario que
 * actualizar: ahi no aplica el control.
 */
export function getVersionCodigo(): number | null {
  const codigo = Number(Application.nativeBuildVersion);
  return Number.isInteger(codigo) && codigo > 0 ? codigo : null;
}

/**
 * Ante la duda, `AL_DIA`: sin red, sin respuesta o sin versiones configuradas
 * no se bloquea una app de emergencias. El API vuelve a comprobar el minimo
 * en cada peticion (cabecera `x-app-version`), que es donde no se puede
 * esquivar: responde 426 y el `httpClient` refresca esta consulta.
 */
export function evaluarVersion(
  instalada: number | null,
  versiones: VersionOrganizacion | undefined,
): EstadoVersion {
  if (instalada === null || !versiones) return 'AL_DIA';

  const { versionMinima, versionUltima } = versiones;
  if (versionMinima && instalada < versionMinima) return 'OBLIGATORIA';
  if (versionUltima && instalada < versionUltima) return 'DISPONIBLE';
  return 'AL_DIA';
}

/**
 * Abre la tienda o el enlace de descarga. Si el telefono no sabe abrirlo no
 * hay nada util que hacer con el error: el aviso sigue en pantalla.
 */
export async function abrirActualizacion(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // Enlace mal configurado o sin app que lo atienda.
  }
}
