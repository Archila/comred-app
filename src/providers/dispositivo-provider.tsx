import { useEffect, type PropsWithChildren } from 'react';

import { setDispositivoRechazadoHandler } from '@/api';
import { useDispositivoStore } from '@/store';

/**
 * Arranque de la identidad del dispositivo.
 *
 * Corre una sola vez y ANTES de que la app muestre nada: si el dispositivo no
 * esta registrado, no hay a quien entregarle una notificacion de emergencia, y
 * eso no se puede descubrir despues del login.
 *
 * Tambien atiende el 401 de las rutas del aparato (credenciales que el API ya
 * no reconoce: la fila se borro, la base se reinicio) volviendo a registrar.
 *
 * No renderiza UI: quien decide que se ve mientras tanto es el navegador raiz,
 * leyendo `useDispositivoStatus()`.
 */
export function DispositivoProvider({ children }: PropsWithChildren) {
  const bootstrap = useDispositivoStore((state) => state.bootstrap);
  const renovarCredenciales = useDispositivoStore((state) => state.renovarCredenciales);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    // Una vez por ejecucion. Varias consultas pueden fallar a la vez con las
    // mismas credenciales, y si el registro nuevo tambien se rechazara, un
    // bucle se comeria el limite de 3/min del endpoint de registro.
    let renovado = false;

    setDispositivoRechazadoHandler(() => {
      if (renovado) return;
      renovado = true;
      void renovarCredenciales();
    });

    return () => setDispositivoRechazadoHandler(null);
  }, [renovarCredenciales]);

  return <>{children}</>;
}
