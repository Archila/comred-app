import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { createQueryClient } from '@/api';

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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
