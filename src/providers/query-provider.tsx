import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { createQueryClient, setVersionObsoletaHandler } from '@/api';
import { QUERY_KEYS } from '@/constants';

/**
 * Provee la cache de TanStack Query.
 *
 * El cliente se crea con `useState` (no como constante de modulo) para que
 * Fast Refresh y los tests no compartan una cache entre montajes.
 *
 * Tambien traduce `AppState` al `focusManager`. TanStack solo escucha el
 * `visibilitychange` del navegador, que en React Native no existe: sin esto,
 * `refetchOnWindowFocus: true` no hace nada, y la bandeja —que depende de
 * resincronizar al volver del segundo plano— se quedaria con lo que tenia.
 */
export function QueryProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (estado) => {
      focusManager.setFocused(estado === 'active');
    });

    return () => subscription.remove();
  }, []);

  // 426 en cualquier peticion: la version en cache esta desfasada (el minimo
  // subio hace menos de 15 min). Al refrescarla, `useVersionApp` pasa a
  // OBLIGATORIA y el navegador raiz levanta el muro. `cancelRefetch: false`
  // porque varias peticiones pueden fallar a la vez: basta con una consulta.
  useEffect(() => {
    setVersionObsoletaHandler(() => {
      void queryClient.invalidateQueries(
        { queryKey: [...QUERY_KEYS.organizaciones.all, 'version'] },
        { cancelRefetch: false },
      );
    });

    return () => setVersionObsoletaHandler(null);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
