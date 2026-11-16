import { useColorScheme as useRNColorScheme } from 'react-native';

import { ESQUEMA_FORZADO } from '@/constants';

/**
 * Esquema de color efectivo: el que impone `paleta.modo` o, en modo
 * `sistema`, el del telefono. Usar este y no el de `react-native`.
 */
export function useColorScheme() {
  const sistema = useRNColorScheme();
  return ESQUEMA_FORZADO ?? sistema;
}
