import { TriangleAlert } from 'lucide-react-native';
import { View } from 'react-native';

import { getErrorMessage } from '@/api';

import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Estado de error reutilizable para cualquier consulta fallida.
 * Recibe el error crudo y lo normaliza con `getErrorMessage`.
 */
export function ErrorState({
  error,
  onRetry,
  title = 'Algo salio mal',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-6">
      <Icon as={TriangleAlert} size={40} className="text-danger-500" />
      <Text variant="heading">{title}</Text>
      <Text variant="subtitle" className="text-center">
        {getErrorMessage(error)}
      </Text>
      {onRetry && <Button label="Reintentar" variant="outline" onPress={onRetry} />}
    </View>
  );
}
