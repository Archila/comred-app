import { Stack } from 'expo-router';

import { useBrandColors } from '@/store';

/**
 * El historial queda siempre debajo: si se entra directo a "Nuevo aviso"
 * desde Inicio, "atras" vuelve a la lista y no saca de la pestana, y tras
 * enviar el detalle tambien tiene la lista detras.
 */
export const unstable_settings = { anchor: 'index' };

/**
 * Pestana de avisos enviados: historial -> detalle, e historial -> nuevo aviso.
 *
 * Es un Stack dentro de la pestana para que "atras" vuelva al historial. Su
 * cabecera hace de barra de seccion: va debajo del encabezado institucional
 * (ver `(app)/_layout.tsx`) y con su mismo azul. React Navigation no acepta
 * `className` aqui, por eso el color se lee del store de marca.
 */
export default function MensajesLayout() {
  const brand = useBrandColors();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: brand.secondaryDark },
        headerTintColor: brand.secondaryForeground,
        headerTitleAlign: 'center',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Avisos enviados' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo aviso' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del aviso' }} />
    </Stack>
  );
}
