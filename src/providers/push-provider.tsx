import { useEffect, type PropsWithChildren } from 'react';

import { useAperturasPush, useMensajesEnPrimerPlano, useSincronizarPush } from '@/hooks';
import { configurarPresentacion } from '@/lib';
import { useDispositivoId } from '@/store';

/**
 * Notificaciones push del aparato.
 *
 * Depende del dispositivo y NO de la sesion: los avisos a la ciudadania llegan
 * al telefono aunque nadie haya iniciado sesion, y el token, el acuse y la
 * bandeja se autentican con las cabeceras del dispositivo. Por eso todo espera
 * a que haya `dispositivoId` y nada mira el JWT.
 *
 * No renderiza UI.
 */
export function PushProvider({ children }: PropsWithChildren) {
  const dispositivoId = useDispositivoId();
  const registrado = dispositivoId !== null;

  useEffect(() => {
    configurarPresentacion();
  }, []);

  useSincronizarPush(dispositivoId);
  useMensajesEnPrimerPlano(registrado);
  useAperturasPush(registrado);

  return <>{children}</>;
}
