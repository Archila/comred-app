import { Image } from 'expo-image';
import { View } from 'react-native';

import { cn, getInitials, useAssetUrl } from '@/lib';
import { useOrganizacion } from '@/store';

import { Text } from '../ui/text';

/**
 * Logo de la organizacion.
 *
 * Si la municipalidad no tiene `logoUrl` configurado, cae a un recuadro con
 * las iniciales pintado con el color primario de su marca, de modo que la
 * pantalla nunca queda con un hueco.
 */
export function BrandLogo({ size = 64, className }: { size?: number; className?: string }) {
  const organizacion = useOrganizacion();
  const uri = useAssetUrl(organizacion?.logoUrl);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={200}
        accessibilityLabel={organizacion?.nombre ?? 'Logo'}
        className={className}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size }}
      className={cn('items-center justify-center rounded-card bg-primary-500', className)}
    >
      <Text
        className="font-bold text-primary-foreground"
        style={{ fontSize: size * 0.35 }}
      >
        {getInitials(organizacion?.nombre) || 'CR'}
      </Text>
    </View>
  );
}
