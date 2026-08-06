import { Inbox, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/** Estado vacio para listados sin resultados. */
export function EmptyState({
  title = 'Sin resultados',
  description,
  icon = Inbox,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-2 p-6">
      <Icon as={icon} size={40} className="text-content-subtle dark:text-content-dark-subtle" />
      <Text variant="heading">{title}</Text>
      {description && (
        <Text variant="subtitle" className="text-center">
          {description}
        </Text>
      )}
    </View>
  );
}
