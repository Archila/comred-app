import { Stack } from 'expo-router';

import { PRESENTACION_SECCION, type SeccionConVisor } from '@/constants';
import { useBrandColors, usePuedeCrearContenido } from '@/store';

/**
 * Navegacion de una seccion con visor: tarjetas -> visor de la tarjeta, y
 * -> nueva publicacion para los administradores.
 *
 * Igual que la de avisos enviados, es un Stack dentro de la pestana para que
 * "atras" vuelva a las tarjetas, y su cabecera hace de barra de seccion: va
 * debajo del encabezado institucional y con su azul. El titulo del visor lo
 * pone el propio visor, con el nombre de la tarjeta.
 */
export function SeccionStack({ seccion }: { seccion: SeccionConVisor }) {
  const brand = useBrandColors();
  const puedeCrear = usePuedeCrearContenido();

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
      {/* Sin barra: la pantalla de tarjetas pinta su propio titulo en pastilla. */}
      <Stack.Screen
        name="index"
        options={{ title: PRESENTACION_SECCION[seccion].titulo, headerShown: false }}
      />
      <Stack.Screen name="[categoriaId]" options={{ title: '' }} />
      {/*
        Como `Tabs.Protected` en el layout de la app: sin sesion de
        administrador la ruta no existe, ni siquiera con un enlace. Al cerrar
        sesion estando en ella, se vuelve a las tarjetas.
      */}
      <Stack.Protected guard={puedeCrear}>
        <Stack.Screen
          name="nueva"
          options={{ title: seccion === 'BOLETINES' ? 'Nuevo boletín' : 'Nueva publicación' }}
        />
        {seccion === 'REPORTES' && (
          <Stack.Screen name="reportar" options={{ title: 'Reportar desastre' }} />
        )}
        {seccion === 'JORNADAS' && (
          <Stack.Screen name="registrar" options={{ title: 'Nueva jornada' }} />
        )}
      </Stack.Protected>
    </Stack>
  );
}
