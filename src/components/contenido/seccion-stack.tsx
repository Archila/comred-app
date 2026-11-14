import { Stack } from 'expo-router';

import { PRESENTACION_SECCION, type SeccionConVisor } from '@/constants';
import { useBrandColors } from '@/store';

/**
 * Navegacion de una seccion con visor: tarjetas -> visor de la tarjeta.
 *
 * Igual que la de avisos enviados, es un Stack dentro de la pestana para que
 * "atras" vuelva a las tarjetas, y su cabecera hace de barra de seccion: va
 * debajo del encabezado institucional y con su azul. El titulo del visor lo
 * pone el propio visor, con el nombre de la tarjeta.
 */
export function SeccionStack({ seccion }: { seccion: SeccionConVisor }) {
  const brand = useBrandColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: brand.secondaryDark },
        headerTintColor: brand.secondaryForeground,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: PRESENTACION_SECCION[seccion].titulo }} />
      <Stack.Screen name="[categoriaId]" options={{ title: '' }} />
    </Stack>
  );
}
