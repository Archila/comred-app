import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants';

/**
 * El historial queda siempre debajo: si se entra directo a "Nuevo aviso"
 * desde Inicio, "atras" vuelve a la lista y no saca de la pestana, y tras
 * enviar el detalle tambien tiene la lista detras.
 */
export const unstable_settings = { anchor: 'index' };

/**
 * Pestana de avisos enviados: historial -> detalle, e historial -> nuevo aviso.
 *
 * Es un Stack dentro de la pestana para que "atras" vuelva al historial. La
 * pestana oculta su propia cabecera (ver `(app)/_layout.tsx`) y la pinta este
 * Stack, con los mismos colores, para no mostrar dos.
 */
export default function MensajesLayout() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Avisos enviados' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo aviso' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del aviso' }} />
    </Stack>
  );
}
