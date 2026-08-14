import { View } from 'react-native';

import { ApiException } from '@/api';
import { useDispositivoStore } from '@/store';

import { ErrorState } from './error-state';

/**
 * Pantalla de bloqueo cuando el dispositivo no se pudo registrar.
 *
 * Es intencionadamente un muro: sin registro el aparato no recibe avisos, y
 * dejar entrar al login daria la falsa impresion de que la app esta operativa.
 * Es preferible una pantalla honesta con un boton de reintento.
 */
export function DispositivoErrorScreen() {
  const error = useDispositivoStore((state) => state.error);
  const reintentar = useDispositivoStore((state) => state.reintentar);

  // El API limita el registro a 3 llamadas por minuto. El mensaje crudo del
  // throttler no le dice nada al usuario; este si.
  const esThrottle = error instanceof ApiException && error.statusCode === 429;
  const mostrado = esThrottle
    ? new ApiException({
        message: 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.',
        statusCode: 429,
      })
    : error;

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <ErrorState
        error={mostrado}
        title="No se pudo preparar la aplicacion"
        onRetry={() => void reintentar()}
      />
    </View>
  );
}
