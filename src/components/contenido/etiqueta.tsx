import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Insignia con icono opcional. Igual que `Insignia`, el color del texto llega
 * aparte porque en React Native no se hereda del contenedor; el icono usa el
 * mismo.
 */
export function Etiqueta({
  etiqueta,
  fondo,
  texto,
  icono,
  className,
}: {
  etiqueta: string;
  fondo: string;
  texto: string;
  icono?: LucideIcon;
  className?: string;
}) {
  return (
    <View
      className={cn('flex-row items-center gap-1 self-start rounded-full px-2.5 py-1', fondo, className)}
    >
      {icono && <Icon as={icono} size={12} className={texto} />}
      <Text variant="plain" className={cn('text-xs font-semibold', texto)}>
        {etiqueta}
      </Text>
    </View>
  );
}
