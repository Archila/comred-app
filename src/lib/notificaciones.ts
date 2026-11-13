import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { DatosPushComred, TipoMensaje } from '@/models';

/**
 * Envoltorio de las dos librerias nativas de notificaciones.
 *
 * El reparto no es arbitrario. En Android las dos declaran un
 * `FirebaseMessagingService`, pero el de expo-notifications lleva
 * `priority="-1"`: el sistema le entrega TODO mensaje remoto al de RNFirebase.
 * Por eso:
 *   - RNFirebase: token FCM, mensajes en primer plano y el tap de las
 *     notificaciones que pinta el sistema con la app cerrada o en segundo plano.
 *   - expo-notifications: canales, permiso, y pintar como notificacion local lo
 *     que llega con la app abierta (FCM no lo muestra en ese caso). El tap de
 *     esas notificaciones locales SI lo ve expo-notifications.
 *
 * Nada de aqui habla con el API: eso es de `hooks/comred/use-push.ts`.
 */

/**
 * Mismo id que `CANAL_POR_TIPO` del API. Si no coinciden, Android entrega en
 * el canal de reserva de FCM: sin la importancia ni el sonido de una alerta.
 */
export const CANAL_POR_TIPO: Record<TipoMensaje, string> = {
  EMERGENCIA: 'emergencia',
  ALERTA: 'alerta',
  INFORMATIVO: 'informativo',
};

const TIPOS: readonly TipoMensaje[] = ['EMERGENCIA', 'ALERTA', 'INFORMATIVO'];

/**
 * Definicion de los canales.
 *
 * ATENCION: un canal es INMUTABLE en cuanto existe en el telefono. Cambiar
 * aqui la importancia, el sonido o la vibracion no tiene efecto en una
 * instalacion que ya lo creo; hay que estrenar un id nuevo (`emergencia_v2`)
 * en el API y en la app a la vez. Cerrar esto antes del primer release.
 *
 * Sonido: sin la clave `sound` el canal usa el tono del sistema; `null` lo
 * silencia. No escribir `sound: 'default'`: expo-notifications lo toma como
 * un archivo `res/raw/default`, no lo encuentra y registra un error (aunque
 * al final tambien cae en el tono del sistema).
 */
const CANALES: Record<TipoMensaje, Notifications.NotificationChannelInput> = {
  EMERGENCIA: {
    name: 'Emergencias',
    description: 'Avisos de emergencia de tu municipalidad. Suenan aunque este activo No molestar.',
    importance: Notifications.AndroidImportance.MAX,
    bypassDnd: true,
    enableVibrate: true,
    vibrationPattern: [0, 600, 300, 600, 300, 600],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  },
  ALERTA: {
    name: 'Alertas',
    description: 'Alertas preventivas: clima, cortes, cierres de vias.',
    importance: Notifications.AndroidImportance.HIGH,
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  },
  INFORMATIVO: {
    name: 'Informativos',
    description: 'Comunicados generales, sin urgencia.',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  },
};

/**
 * Crea los tres canales. Es idempotente: sobre un canal ya creado Android solo
 * acepta cambios de nombre y descripcion.
 *
 * Tiene que ir ANTES de pedir el permiso: en Android 13+ el dialogo del
 * sistema no aparece mientras la app no tenga al menos un canal.
 */
export async function configurarCanales(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    TIPOS.map((tipo) => Notifications.setNotificationChannelAsync(CANAL_POR_TIPO[tipo], CANALES[tipo])),
  );
}

/**
 * Que hacer con una notificacion local cuando la app esta en primer plano.
 * Sin este handler expo-notifications la descarta en silencio, y el aviso
 * que la app acaba de recibir no se veria.
 */
export function configurarPresentacion(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function estaPermitido(permiso: Notifications.NotificationPermissionsStatus): boolean {
  if (permiso.granted) return true;
  // En iOS el campo raiz no distingue la autorizacion provisional, que si
  // entrega (en silencio, al centro de notificaciones).
  return permiso.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/** Estado actual del permiso, sin preguntar al usuario. */
export async function leerPermiso(): Promise<boolean> {
  return estaPermitido(await Notifications.getPermissionsAsync());
}

/**
 * Pide el permiso si todavia se puede. Si el usuario ya lo denego de forma
 * definitiva el sistema no vuelve a mostrar el dialogo: solo queda mandarlo a
 * los ajustes.
 */
export async function pedirPermiso(): Promise<boolean> {
  const actual = await Notifications.getPermissionsAsync();
  if (estaPermitido(actual) || !actual.canAskAgain) return estaPermitido(actual);

  return estaPermitido(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    }),
  );
}

/**
 * Token FCM del aparato, o `null` si no se pudo obtener (sin Google Play
 * Services, sin red en el primer arranque). `null` aqui NO significa "borrar
 * el token": quien llama no debe mandarlo al API como si lo fuera.
 */
export async function obtenerTokenFcm(): Promise<string | null> {
  try {
    return await getToken(getMessaging());
  } catch {
    return null;
  }
}

export function escucharTokenFcm(listener: (token: string) => void): () => void {
  return onTokenRefresh(getMessaging(), listener);
}

/**
 * Lee las claves que el servidor anade a toda notificacion. Devuelve `null`
 * si falta alguna: un push que no se puede correlacionar con la bandeja no se
 * puede acusar, y es mejor ignorarlo que acusar un id inventado.
 */
export function extraerDatosPush(data: Record<string, unknown> | null | undefined): DatosPushComred | null {
  const mensajeId = data?.mensajeId;
  const tipo = data?.tipo;

  if (typeof mensajeId !== 'string' || mensajeId.length === 0) return null;
  if (typeof tipo !== 'string' || !TIPOS.includes(tipo as TipoMensaje)) return null;

  return { mensajeId, tipo: tipo as TipoMensaje };
}

export interface MensajeRecibido {
  datos: DatosPushComred;
  titulo: string;
  cuerpo: string;
}

function leerMensajeRemoto(mensaje: RemoteMessage): MensajeRecibido | null {
  const datos = extraerDatosPush(mensaje.data);
  if (!datos) return null;

  return {
    datos,
    titulo: mensaje.notification?.title ?? '',
    cuerpo: mensaje.notification?.body ?? '',
  };
}

/** Mensajes que llegan con la app en primer plano. */
export function escucharMensajes(listener: (mensaje: MensajeRecibido) => void): () => void {
  return onMessage(getMessaging(), (mensaje) => {
    const leido = leerMensajeRemoto(mensaje);
    if (leido) listener(leido);
  });
}

/**
 * Pinta como notificacion local un aviso recibido en primer plano, en el canal
 * de su tipo.
 *
 * Solo en Android: en iOS el sistema decide la presentacion en primer plano
 * por su cuenta y pintarla aqui la duplicaria. Queda por comprobar cuando
 * exista el build de iOS.
 */
export async function mostrarAvisoLocal({ datos, titulo, cuerpo }: MensajeRecibido): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: titulo,
      body: cuerpo,
      // Mismas claves que el push remoto: el tap se resuelve igual venga de
      // donde venga.
      data: { mensajeId: datos.mensajeId, tipo: datos.tipo },
    },
    trigger: { channelId: CANAL_POR_TIPO[datos.tipo] },
  });
}

/**
 * Notificacion con la que se abrio la app desde cerrada, si la hubo.
 *
 * Mira las dos fuentes: la que pinto el sistema (RNFirebase) y la que pinto
 * la app en primer plano (expo-notifications) si se toco despues de cerrarla.
 * La de expo se limpia al leerla para que un recargado de JS no la repita.
 */
export async function leerAperturaInicial(): Promise<DatosPushComred | null> {
  const remota = await getInitialNotification(getMessaging());
  const desdeRemota = remota ? extraerDatosPush(remota.data) : null;
  if (desdeRemota) return desdeRemota;

  const local = Notifications.getLastNotificationResponse();
  if (!local) return null;

  Notifications.clearLastNotificationResponse();
  return extraerDatosPush(local.notification.request.content.data);
}

/** Taps sobre una notificacion con la app ya viva (en segundo o primer plano). */
export function escucharAperturas(listener: (datos: DatosPushComred) => void): () => void {
  const quitarRemota = onNotificationOpenedApp(getMessaging(), (mensaje) => {
    const datos = extraerDatosPush(mensaje.data);
    if (datos) listener(datos);
  });

  const local = Notifications.addNotificationResponseReceivedListener((respuesta) => {
    const datos = extraerDatosPush(respuesta.notification.request.content.data);
    if (datos) listener(datos);
  });

  return () => {
    quitarRemota();
    local.remove();
  };
}
