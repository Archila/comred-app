import { create } from 'zustand';

/**
 * Estado de cliente de las notificaciones.
 *
 * Lo que se le ha enviado al aparato NO vive aqui: eso es la bandeja, y la
 * cachea TanStack Query. Aqui solo lo que sabe el telefono y no el servidor.
 */
interface PushState {
  /** Permiso del sistema operativo. `null` mientras no se ha consultado. */
  permitido: boolean | null;
  /**
   * Mensaje que el usuario abrio tocando una notificacion y al que todavia no
   * se ha navegado. Existe porque el tap puede llegar antes de que haya
   * pantallas donde aterrizar: con la app cerrada, o sin sesion.
   */
  mensajeAbierto: string | null;

  setPermitido: (permitido: boolean) => void;
  abrirMensaje: (mensajeId: string) => void;
  /** Devuelve el mensaje pendiente y lo borra, para navegar una sola vez. */
  consumirMensajeAbierto: () => string | null;
}

export const usePushStore = create<PushState>((set, get) => ({
  permitido: null,
  mensajeAbierto: null,

  setPermitido: (permitido) => set({ permitido }),

  abrirMensaje: (mensajeId) => set({ mensajeAbierto: mensajeId }),

  consumirMensajeAbierto: () => {
    const { mensajeAbierto } = get();
    if (mensajeAbierto) set({ mensajeAbierto: null });
    return mensajeAbierto;
  },
}));

/* -------------------------------------------------------------------------- */
/* Selectores                                                                  */
/* -------------------------------------------------------------------------- */

export const usePermisoNotificaciones = () => usePushStore((state) => state.permitido);
export const useMensajeAbierto = () => usePushStore((state) => state.mensajeAbierto);
