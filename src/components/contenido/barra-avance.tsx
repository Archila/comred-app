import { View } from 'react-native';

import { Text } from '../ui/text';

/**
 * Avance comprobado de un proyecto (Plan Maestro, 10). Solo se pinta cuando el
 * API envia un porcentaje: sin dato no hay barra, que no es lo mismo que 0 %.
 *
 * `compacta` es la del visor, en una sola linea para no quitarle sitio a la
 * descripcion; la normal, la de la hoja de detalle.
 */
export function BarraAvance({ avance, compacta = false }: { avance: number; compacta?: boolean }) {
  const porcentaje = Math.min(100, Math.max(0, Math.round(avance)));

  const barra = (
    <View className="h-2 flex-1 overflow-hidden rounded-full bg-surface-sunken dark:bg-surface-dark-muted">
      <View style={{ width: `${porcentaje}%` }} className="h-full rounded-full bg-success-500" />
    </View>
  );

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Avance del proyecto: ${porcentaje} por ciento`}
      accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
      className={compacta ? 'flex-row items-center gap-2' : 'gap-1.5'}
    >
      {compacta ? (
        <>
          {barra}
          <Text variant="label" className="text-[13px]">
            {porcentaje}% de avance
          </Text>
        </>
      ) : (
        <>
          <View className="flex-row items-center justify-between">
            <Text variant="heading" className="text-base">
              Avance del proyecto
            </Text>
            <Text variant="heading" className="text-base">
              {porcentaje}%
            </Text>
          </View>
          <View className="flex-row">{barra}</View>
        </>
      )}
    </View>
  );
}
