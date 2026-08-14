import { create } from 'zustand';

import { dispositivosActions } from '@/actions';
import { setDispositivoCredentials } from '@/api';
import { env } from '@/config';
import { STORAGE_KEYS } from '@/constants';
import { generarInstalacionId, getDeviceInfo, secureStorage } from '@/lib';
import type { DispositivoRegistrado } from '@/models';

/**
 * Identidad del dispositivo frente al API.
 *
 * Es lo PRIMERO que resuelve la app al arrancar, antes de mirar siquiera si
 * hay sesion: el dispositivo es el destinatario de las notificaciones y existe
 * aunque nadie inicie sesion nunca (un vecino que solo quiere recibir avisos).
 *
 * El flujo de arranque es deliberadamente perezoso: si ya hay un registro
 * guardado para la organizacion de este build, NO se toca la red. El endpoint
 * de registro esta limitado a 3 llamadas por minuto justamente porque se
 * espera que un cliente legitimo lo use una vez por instalacion.
 */

export type DispositivoStatus =
  /** Leyendo el almacenamiento seguro / registrando contra el API. */
  | 'checking'
  /** Hay un dispositivo vinculado a la organizacion de este build. */
  | 'registered'
  /**
   * El build no trae `EXPO_PUBLIC_ORGANIZACION_ID`, asi que no hay a que
   * organizacion registrarse. No es un error: la app sigue funcionando, pero
   * este dispositivo no recibira notificaciones hasta que el build lo declare.
   */
  | 'unavailable'
  /** El registro fallo (red o API). La app no continua hasta reintentar. */
  | 'error';

interface DispositivoState {
  status: DispositivoStatus;
  dispositivo: DispositivoRegistrado | null;
  /** Ultimo error de registro, ya normalizado a `ApiException`. */
  error: unknown;

  /** Resuelve la identidad del dispositivo. Lo llama `DispositivoProvider`. */
  bootstrap: () => Promise<void>;
  /** Fuerza un registro nuevo aunque ya hubiera uno guardado. */
  reintentar: () => Promise<void>;
}

/**
 * Devuelve el id de instalacion, creandolo la primera vez.
 *
 * Este UUID es lo que hace idempotente el registro en el API: mientras
 * sobreviva, re-registrar actualiza la misma fila en lugar de crear otra.
 */
async function obtenerInstalacionId(): Promise<string> {
  const existente = await secureStorage.getItem(STORAGE_KEYS.instalacionId);
  if (existente) return existente;

  const nuevo = generarInstalacionId();
  await secureStorage.setItem(STORAGE_KEYS.instalacionId, nuevo);
  return nuevo;
}

/** Lee el registro guardado, exigiendo que siga siendo utilizable. */
async function leerRegistroGuardado(
  organizacionId: string,
  instalacionId: string,
): Promise<{ registro: DispositivoRegistrado; clave: string } | null> {
  const registro = await secureStorage.getObject<DispositivoRegistrado>(
    STORAGE_KEYS.dispositivo,
  );
  const clave = await secureStorage.getItem(STORAGE_KEYS.dispositivoClave);

  // Sin clave el registro es inservible: el API solo la entrega al registrar,
  // asi que la unica salida es volver a hacerlo.
  if (!registro || !clave) return null;

  // Un build reapuntado a otra municipalidad, o un id de instalacion que se
  // perdio y se regenero, invalidan el registro anterior.
  if (registro.organizacionId !== organizacionId) return null;
  if (registro.instalacionId !== instalacionId) return null;

  return { registro, clave };
}

async function registrarEnApi(
  organizacionId: string,
  instalacionId: string,
): Promise<{ registro: DispositivoRegistrado; clave: string }> {
  const respuesta = await dispositivosActions.registrar({
    organizacionId,
    instalacionId,
    ...getDeviceInfo(),
  });

  const registro: DispositivoRegistrado = {
    dispositivoId: respuesta.dispositivoId,
    organizacionId: respuesta.organizacionId,
    instalacionId: respuesta.instalacionId,
    registradoEn: new Date().toISOString(),
  };

  // La clave se guarda ANTES que el registro: si el proceso muere entre ambas
  // escrituras, el arranque siguiente ve un registro sin clave (o al reves) y
  // vuelve a registrar, que es la recuperacion correcta.
  await secureStorage.setItem(STORAGE_KEYS.dispositivoClave, respuesta.clave);
  await secureStorage.setObject(STORAGE_KEYS.dispositivo, registro);

  return { registro, clave: respuesta.clave };
}

/** Nucleo compartido por `bootstrap` y `reintentar`. */
async function resolver(
  set: (partial: Partial<DispositivoState>) => void,
  { forzarRegistro }: { forzarRegistro: boolean },
): Promise<void> {
  set({ status: 'checking', error: null });

  const { organizacionId } = env;

  if (!organizacionId) {
    console.warn(
      '[dispositivo] EXPO_PUBLIC_ORGANIZACION_ID no esta definido: el dispositivo ' +
        'no se registrara y no recibira notificaciones.',
    );
    set({ status: 'unavailable', dispositivo: null });
    return;
  }

  try {
    const instalacionId = await obtenerInstalacionId();

    if (!forzarRegistro) {
      const guardado = await leerRegistroGuardado(organizacionId, instalacionId);
      if (guardado) {
        setDispositivoCredentials({
          dispositivoId: guardado.registro.dispositivoId,
          clave: guardado.clave,
        });
        set({ status: 'registered', dispositivo: guardado.registro });
        return;
      }
    }

    const { registro, clave } = await registrarEnApi(organizacionId, instalacionId);
    setDispositivoCredentials({ dispositivoId: registro.dispositivoId, clave });
    set({ status: 'registered', dispositivo: registro });
  } catch (error) {
    // Sin dispositivo registrado no tiene sentido seguir: el usuario podria
    // iniciar sesion y nunca recibir un aviso de emergencia sin enterarse.
    setDispositivoCredentials(null);
    set({ status: 'error', dispositivo: null, error });
  }
}

export const useDispositivoStore = create<DispositivoState>((set) => ({
  status: 'checking',
  dispositivo: null,
  error: null,

  bootstrap: () => resolver(set, { forzarRegistro: false }),

  reintentar: () => resolver(set, { forzarRegistro: true }),
}));

/* -------------------------------------------------------------------------- */
/* Selectores                                                                  */
/* -------------------------------------------------------------------------- */

export const useDispositivoStatus = () => useDispositivoStore((state) => state.status);
export const useDispositivo = () => useDispositivoStore((state) => state.dispositivo);
export const useDispositivoId = () =>
  useDispositivoStore((state) => state.dispositivo?.dispositivoId ?? null);
