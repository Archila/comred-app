import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { cn } from '@/lib';

import { Icon } from '../ui/icon';

/**
 * Marcador de un punto del mapa: circulo del color de su capa con el icono
 * en blanco y una punta abajo, que es la que senala el lugar.
 *
 * El color llega del API, asi que va por `style`: Tailwind solo genera las
 * clases que encuentra escritas en el codigo.
 */
export function PinMarcador({
  color,
  icono,
  seleccionado = false,
}: {
  color: string;
  icono: LucideIcon;
  seleccionado?: boolean;
}) {
  const tamano = seleccionado ? 44 : 34;

  return (
    <View className="items-center">
      <View
        style={{ backgroundColor: color, width: tamano, height: tamano, elevation: 4 }}
        className={cn(
          'items-center justify-center rounded-full border-2 border-white shadow',
          seleccionado && 'border-[3px]',
        )}
      >
        <Icon as={icono} size={seleccionado ? 22 : 18} color="#FFFFFF" className="text-white" />
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -2,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
}
