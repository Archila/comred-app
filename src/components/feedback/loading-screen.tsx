import { ActivityIndicator, View } from 'react-native';

import { useBrandColors } from '@/store';

import { Text } from '../ui/text';

/** Pantalla completa de carga. Se usa mientras se restaura la sesion. */
export function LoadingScreen({ message }: { message?: string }) {
  const brand = useBrandColors();

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-surface dark:bg-surface-dark">
      <ActivityIndicator size="large" color={brand.primary} />
      {message && <Text variant="subtitle">{message}</Text>}
    </View>
  );
}
