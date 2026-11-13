import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { dispositivosActions } from '@/actions';
import { env } from '@/config';
import { QUERY_KEYS } from '@/constants';
import {
  configurarCanales,
  escucharAperturas,
  escucharMensajes,
  escucharTokenFcm,
  leerAperturaInicial,
  leerPermiso,
  mostrarAvisoLocal,
  obtenerTokenFcm,
  pedirPermiso,
} from '@/lib';
import type { DatosPushComred } from '@/models';
import { usePushStore } from '@/store';

import { useMarcarLeido } from './use-bandeja';

/**
 * Mantiene al API al dia del token FCM y del permiso de este aparato.
 *
 * Se sincroniza al arrancar, cuando FCM rota el token y cada vez que la app
 * vuelve a primer plano. Lo ultimo es lo que detecta que el usuario quito (o
 * devolvio) el permiso desde los ajustes del sistema: sin ello, el servidor
 * seguiria contando con un aparato que ya no muestra nada.
 *
 * Con el permiso denegado se manda `pushToken: null` y
 * `notificacionesActivas: false`, que es lo que el API espera (§10 del plan):
 * el aparato sigue recibiendo en su bandeja, pero no se le intentan entregas.
 *
 * El `PUT /token` esta limitado a 10 por minuto. Solo se llama cuando cambia
 * algo respecto a lo ultimo que el API acepto en esta ejecucion.
 */
export function useSincronizarPush(dispositivoId: string | null) {
  const setPermitido = usePushStore((state) => state.setPermitido);
  const ultimaFirma = useRef<string | null>(null);
  // El arranque, el cambio de AppState que provoca el propio dialogo de
  // permiso y un `onTokenRefresh` pueden coincidir. En fila, el segundo ve la
  // firma que dejo el primero y no repite la llamada.
  const cola = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!dispositivoId) return;
    ultimaFirma.current = null;

    async function sincronizarUnaVez(pedir: boolean, tokenNuevo?: string) {
      await configurarCanales();

      const permitido = pedir ? await pedirPermiso() : await leerPermiso();
      setPermitido(permitido);

      const pushToken = permitido ? (tokenNuevo ?? (await obtenerTokenFcm())) : null;

      // Permitido pero sin token es un fallo de lectura (sin red, sin Play
      // Services), no una baja: mandar `null` borraria en el servidor un
      // token que probablemente sigue siendo bueno.
      if (permitido && !pushToken) return;

      const firma = `${permitido}|${pushToken}`;
      if (firma === ultimaFirma.current) return;

      await dispositivosActions.actualizarToken({ pushToken, notificacionesActivas: permitido });
      ultimaFirma.current = firma;
    }

    const sincronizar = (pedir: boolean, tokenNuevo?: string) => {
      cola.current = cola.current
        .then(() => sincronizarUnaVez(pedir, tokenNuevo))
        .catch((error) => {
          // No se reintenta aqui: la proxima vuelta a primer plano lo hace.
          if (env.isDevelopment) console.warn('[push] No se pudo sincronizar el token', error);
        });
    };

    sincronizar(true);

    const quitarToken = escucharTokenFcm((token) => sincronizar(false, token));
    const appState = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') sincronizar(false);
    });

    return () => {
      quitarToken();
      appState.remove();
    };
  }, [dispositivoId, setPermitido]);
}

/**
 * Avisos que llegan con la app abierta.
 *
 * FCM no los muestra en ese caso, asi que se pintan como notificacion local
 * en el canal de su tipo. Ademas se invalida la bandeja: el aviso ya esta en
 * el servidor y la lista y el contador tienen que enterarse sin esperar a que
 * la app pase por segundo plano.
 */
export function useMensajesEnPrimerPlano(habilitado: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!habilitado) return;

    return escucharMensajes((mensaje) => {
      void mostrarAvisoLocal(mensaje);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bandeja.all });
    });
  }, [habilitado, queryClient]);
}

/**
 * Tap sobre una notificacion: acusa recibo en el acto y deja el mensaje
 * pendiente de abrir.
 *
 * El acuse no espera a que haya una pantalla: tocar el aviso ES enterarse, y
 * el tap puede llegar sin sesion o con la app aun arrancando. La navegacion la
 * hace quien tenga pantallas donde aterrizar (`app/(app)/_layout.tsx`).
 * Si el acuse falla por red, la pantalla de avisos lo repite al abrirse; el
 * API lo admite porque es idempotente.
 */
export function useAperturasPush(habilitado: boolean) {
  const { mutate: marcarLeido } = useMarcarLeido();
  const abrirMensaje = usePushStore((state) => state.abrirMensaje);
  const inicialLeida = useRef(false);

  useEffect(() => {
    if (!habilitado) return;

    const abrir = ({ mensajeId }: DatosPushComred) => {
      marcarLeido(mensajeId);
      abrirMensaje(mensajeId);
    };

    // La apertura inicial se lee una sola vez por ejecucion: RNFirebase la
    // sigue devolviendo en cada llamada.
    if (!inicialLeida.current) {
      inicialLeida.current = true;
      void leerAperturaInicial().then((datos) => {
        if (datos) abrir(datos);
      });
    }

    return escucharAperturas(abrir);
  }, [habilitado, marcarLeido, abrirMensaje]);
}
