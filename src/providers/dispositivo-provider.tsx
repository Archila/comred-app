import { useEffect, type PropsWithChildren } from 'react';

import { useDispositivoStore } from '@/store';

/**
 * Arranque de la identidad del dispositivo.
 *
 * Corre una sola vez y ANTES de que la app muestre nada: si el dispositivo no
 * esta registrado, no hay a quien entregarle una notificacion de emergencia, y
 * eso no se puede descubrir despues del login.
 *
 * No renderiza UI: quien decide que se ve mientras tanto es el navegador raiz,
 * leyendo `useDispositivoStatus()`.
 */
export function DispositivoProvider({ children }: PropsWithChildren) {
  const bootstrap = useDispositivoStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return <>{children}</>;
}
