import { View } from 'react-native';

import { cn } from '@/lib';

import { Text } from './text';

/**
 * Etiqueta corta de estado ("Entregado", "En cola"...). Fondo y texto llegan
 * por separado: el color de texto no se hereda en React Native, asi que hay
 * que ponerlo en el `Text` y no en el contenedor.
 */
export function Insignia({
  etiqueta,
  fondo,
  texto,
  className,
}: {
  etiqueta: string;
  fondo: string;
  texto: string;
  className?: string;
}) {
  return (
    <View className={cn('self-start rounded-full px-2.5 py-0.5', fondo, className)}>
      <Text variant="caption" className={cn('font-semibold', texto)}>
        {etiqueta}
      </Text>
    </View>
  );
}
