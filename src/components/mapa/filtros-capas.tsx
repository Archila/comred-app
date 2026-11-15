import { Check, X } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { iconoDeCapa } from '@/constants';
import { cn } from '@/lib';
import type { CapaMapa } from '@/models';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Panel de filtros (Plan Maestro, 9.2): cada capa se enciende o apaga por
 * separado, y pueden estar varias encendidas a la vez.
 */
export function FiltrosCapas({
  categorias,
  activas,
  onAlternar,
  onRestablecer,
  onCerrar,
}: {
  categorias: CapaMapa[];
  activas: Set<string>;
  onAlternar: (categoriaId: string, visibleAhora: boolean) => void;
  onRestablecer: () => void;
  onCerrar: () => void;
}) {
  return (
    <View
      style={{ elevation: 8 }}
      className="absolute left-3 right-3 top-3 max-h-[70%] rounded-card bg-surface p-4 shadow-lg dark:bg-surface-dark-muted"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <Text variant="heading">Capas del mapa</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar filtros"
          onPress={onCerrar}
          hitSlop={12}
        >
          <Icon as={X} size={22} />
        </Pressable>
      </View>

      {categorias.length === 0 ? (
        <Text variant="subtitle">Aún no hay capas publicadas para este municipio.</Text>
      ) : (
        <ScrollView className="flex-grow-0">
          {categorias.map((categoria) => {
            const visible = activas.has(categoria.id);
            return (
              <Pressable
                key={categoria.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: visible }}
                onPress={() => onAlternar(categoria.id, visible)}
                className="flex-row items-center gap-3 rounded-field px-2 py-2.5 active:bg-surface-sunken dark:active:bg-surface-dark-sunken"
              >
                <View
                  style={{ backgroundColor: categoria.color, opacity: visible ? 1 : 0.35 }}
                  className="h-8 w-8 items-center justify-center rounded-full"
                >
                  <Icon as={iconoDeCapa(categoria)} size={16} color="#FFFFFF" className="text-white" />
                </View>
                <Text
                  className={cn(
                    'flex-1',
                    !visible && 'text-content-subtle dark:text-content-dark-subtle',
                  )}
                >
                  {categoria.nombre}
                </Text>
                <View
                  className={cn(
                    'h-6 w-6 items-center justify-center rounded-md border',
                    visible
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-line-strong dark:border-line-dark-strong',
                  )}
                >
                  {visible && <Icon as={Check} size={16} className="text-primary-foreground" />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {categorias.length > 0 && (
        <Pressable onPress={onRestablecer} className="mt-3 self-start" hitSlop={8}>
          <Text variant="label" className="text-primary-600 dark:text-primary-400">
            Restablecer capas
          </Text>
        </Pressable>
      )}
    </View>
  );
}
