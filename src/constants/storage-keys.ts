/**
 * Llaves de almacenamiento persistente.
 *
 * Importante: expo-secure-store solo admite [A-Za-z0-9._-] en las llaves,
 * por eso no se usan los dos puntos tipicos de web.
 */
export const STORAGE_KEYS = {
  /** JWT emitido por el API (cifrado en Keychain / Keystore). */
  token: 'comred.auth.token',
  /** Snapshot del usuario autenticado para pintar la UI sin esperar al API. */
  user: 'comred.auth.user',
  /** Preferencia de tema elegida por el usuario. */
  colorScheme: 'comred.ui.color-scheme',
  /**
   * Configuracion publica de la organizacion (marca + categorias).
   * Se cachea para que la app arranque ya con los colores correctos, sin
   * esperar a la red y sin parpadeo de marca.
   */
  organizacion: 'comred.org.publica',

  /**
   * UUID de esta instalacion, generado la primera vez que arranca la app.
   *
   * Es la identidad estable del dispositivo frente al API: mientras se
   * conserve, re-registrar devuelve la misma fila en lugar de crear una nueva.
   * Sobrevive a las actualizaciones de la app; se pierde al desinstalarla (y
   * en iOS puede perderse al borrar el Keychain), lo que simplemente provoca
   * un alta nueva.
   */
  instalacionId: 'comred.dispositivo.instalacion',
  /**
   * Registro devuelto por el API: id del dispositivo y organizacion a la que
   * quedo vinculado. Su presencia es lo que hace que el arranque NO vuelva a
   * llamar al endpoint de registro.
   */
  dispositivo: 'comred.dispositivo.registro',
  /**
   * Clave del dispositivo. El API la devuelve UNA sola vez al registrar y no
   * hay forma de recuperarla: si se pierde, hay que re-registrar. Va aparte
   * del registro para no arrastrar el secreto en cada lectura del id.
   */
  dispositivoClave: 'comred.dispositivo.clave',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
