import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { PlataformaDispositivo } from '@/models';

/**
 * Datos del aparato que acompanan al registro del dispositivo.
 *
 * Nada de esto identifica a una persona: sirve para que el panel pueda
 * diagnosticar entregas fallidas ("no llego a los Android 10") y para decidir
 * el payload del push por plataforma.
 *
 * Todos los campos opcionales pueden venir vacios —en web `expo-device` casi
 * no informa nada— y el API los acepta nulos.
 */

/** Genera un UUID v4 con entropia criptografica. */
export function generarInstalacionId(): string {
  return Crypto.randomUUID();
}

export function getPlataforma(): PlataformaDispositivo {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return 'WEB';
}

/** Recorta al limite de la columna del API para evitar un 400 por longitud. */
function recortar(value: string | null | undefined, max: number): string | undefined {
  const limpio = value?.trim();
  if (!limpio) return undefined;
  return limpio.slice(0, max);
}

/**
 * Idioma del sistema en formato corto (`es`, `en`).
 * `Intl` puede no estar disponible en algunos entornos, de ahi el try/catch:
 * el idioma es un dato accesorio y jamas debe impedir el registro.
 */
function getIdioma(): string | undefined {
  try {
    return recortar(Intl.DateTimeFormat().resolvedOptions().locale, 10);
  } catch {
    return undefined;
  }
}

export interface DeviceInfo {
  plataforma: PlataformaDispositivo;
  modelo?: string;
  osVersion?: string;
  appVersion?: string;
  idioma?: string;
}

export function getDeviceInfo(): DeviceInfo {
  return {
    plataforma: getPlataforma(),
    modelo: recortar(Device.modelName, 120),
    osVersion: recortar(Device.osVersion, 30),
    appVersion: recortar(Application.nativeApplicationVersion, 20),
    idioma: getIdioma(),
  };
}
