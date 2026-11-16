import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { ESQUEMA_FORZADO } from '@/constants';

/**
 * Igual que la version nativa, pero en modo `sistema` el valor se recalcula en
 * el cliente para soportar el renderizado estatico.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (ESQUEMA_FORZADO) {
    return ESQUEMA_FORZADO;
  }

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
