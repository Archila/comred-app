import { Check, ChevronDown, ChevronUp, Layers, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { iconoDeCapa } from '@/constants';
import { cn } from '@/lib';
import type { CapaMapa } from '@/models';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Panel de capas (Plan Maestro, 9.2), sobrepuesto al pie del mapa.
 *
 * Desplegado muestra la lista con una casilla por capa, del color de la capa,
 * que la enciende o la apaga; pueden estar varias encendidas a la vez.
 * Reducido queda solo la barra de titulo con cuantas hay encendidas, para no
 * tapar el mapa. Tocar la barra alterna entre los dos.
 */
export function FiltrosCapas({
  categorias,
  activas,
  expandido,
  onAlternarExpandido,
  onAlternar,
  onMostrarVarias,
}: {
  categorias: CapaMapa[];
  activas: Set<string>;
  expandido: boolean;
  onAlternarExpandido: () => void;
  onAlternar: (categoriaId: string, visibleAhora: boolean) => void;
  onMostrarVarias: (categoriaIds: string[], visible: boolean) => void;
}) {
  const encendidas = categorias.filter((categoria) => activas.has(categoria.id)).length;
  const ids = categorias.map((categoria) => categoria.id);

  return (
    <View
      style={{ elevation: 8 }}
      className="rounded-card bg-surface/95 shadow-lg dark:bg-surface-dark-muted/95"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: expandido }}
        accessibilityLabel={expandido ? 'Minimizar las capas' : 'Mostrar las capas'}
        onPress={onAlternarExpandido}
        className="flex-row items-center gap-2 px-4 py-3"
      >
        <Icon as={Layers} size={18} />
        <Text variant="heading" className="flex-1 text-base">
          Filtros{' '}
          <Text variant="caption" className="text-sm">
            (mostrar en el mapa)
          </Text>
        </Text>
        {categorias.length > 0 && (
          <Text variant="caption">
            {encendidas}/{categorias.length}
          </Text>
        )}
        <Icon as={expandido ? ChevronDown : ChevronUp} size={20} />
      </Pressable>

      {expandido &&
        (categorias.length === 0 ? (
          <Text variant="subtitle" className="px-4 pb-4">
            Aún no hay capas publicadas para este municipio.
          </Text>
        ) : (
          <>
            <ScrollView className="max-h-64 flex-grow-0 px-2">
              {categorias.map((categoria) => (
                <FilaCapa
                  key={categoria.id}
                  categoria={categoria}
                  icono={iconoDeCapa(categoria)}
                  visible={activas.has(categoria.id)}
                  onPress={() => onAlternar(categoria.id, activas.has(categoria.id))}
                />
              ))}
            </ScrollView>

            <View className="flex-row gap-4 border-t border-line px-4 py-2.5 dark:border-line-dark">
              <Pressable onPress={() => onMostrarVarias(ids, true)} hitSlop={8}>
                <Text variant="label" className="text-primary-600 dark:text-primary-400">
                  Mostrar todas
                </Text>
              </Pressable>
              <Pressable onPress={() => onMostrarVarias(ids, false)} hitSlop={8}>
                <Text variant="label" className="text-primary-600 dark:text-primary-400">
                  Ocultar todas
                </Text>
              </Pressable>
            </View>
          </>
        ))}
    </View>
  );
}

function FilaCapa({
  categoria,
  icono: IconoCapa,
  visible,
  onPress,
}: {
  categoria: CapaMapa;
  icono: LucideIcon;
  visible: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: visible }}
      accessibilityLabel={categoria.nombre}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-field px-2 py-2 active:bg-surface-sunken dark:active:bg-surface-dark-sunken"
    >
      {/* La casilla lleva el color de la capa: sirve tambien de leyenda. */}
      <View
        style={{
          borderColor: categoria.color,
          backgroundColor: visible ? categoria.color : 'transparent',
        }}
        className="h-6 w-6 items-center justify-center rounded-md border-2"
      >
        {visible && <Icon as={Check} size={16} color="#FFFFFF" className="text-white" />}
      </View>
      {/* Sin `Icon`: su clase de color por defecto pisaria el color de la capa. */}
      <IconoCapa size={16} color={categoria.color} opacity={visible ? 1 : 0.4} />
      <Text
        className={cn('flex-1', !visible && 'text-content-subtle dark:text-content-dark-subtle')}
      >
        {categoria.nombre}
      </Text>
    </Pressable>
  );
}
