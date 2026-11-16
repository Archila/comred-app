import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { colorScheme as nativewindColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { ActualizacionObligatoriaScreen, DispositivoErrorScreen } from '@/components';
import { Colors, ESQUEMA_FORZADO } from '@/constants';
import { useAvisoActualizacion, useColorScheme, useVersionApp } from '@/hooks';
import { AppProviders } from '@/providers';
import { useAuthStatus, useDispositivoStatus } from '@/store';

// El splash se mantiene visible hasta que el dispositivo este resuelto y
// sepamos si hay sesion activa.
SplashScreen.preventAutoHideAsync();

// Tema impuesto por `paleta.modo` (src/config/paleta.js). Va antes del primer
// render para que las clases `dark:` resuelvan bien desde el inicio. En web
// solo hay `document` en el navegador, no durante el renderizado estatico.
if (ESQUEMA_FORZADO && (Platform.OS !== 'web' || typeof document !== 'undefined')) {
  nativewindColorScheme.set(ESQUEMA_FORZADO);
}

/** Tema de React Navigation con los fondos de la paleta: sin destellos entre pantallas. */
function temaNavegacion(base: Theme, colores: typeof Colors.light): Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colores.background,
      card: colores.surface,
      text: colores.text,
      border: colores.border,
    },
  };
}

const TEMA_CLARO = temaNavegacion(DefaultTheme, Colors.light);
const TEMA_OSCURO = temaNavegacion(DarkTheme, Colors.dark);

// La app siempre arranca en las pantallas publicas, y el login se apila
// encima: "atras" desde el login vuelve a la app aunque se llegue por enlace.
export const unstable_settings = { anchor: '(app)' };

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

/**
 * Navegador raiz.
 *
 * MODO PUBLICO: `(app)` se monta siempre, con o sin sesion. Un vecino sin
 * cuenta ve la informacion general y su bandeja de avisos (el API identifica
 * al aparato, no al usuario). Lo que exige sesion se protege mas adentro, en
 * `(app)/_layout.tsx`, y de verdad en el API.
 *
 * El login es opcional y se abre desde el menu. `Stack.Protected` saca
 * `(auth)` del stack en cuanto hay sesion, y eso devuelve solo a la app:
 * ninguna pantalla necesita hacer `router.replace` manual al iniciar sesion.
 *
 * Orden de arranque, y es deliberado:
 *   1. Dispositivo registrado (identidad del aparato, previa a la sesion).
 *   2. Sesion restaurada.
 *   3. Recien entonces se monta el stack, ya sabiendo si hay usuario.
 *
 * El paso 1 va primero porque un dispositivo sin registrar no recibe avisos de
 * emergencia. Dejar pasar a la app lo ocultaria hasta que hiciera falta.
 */
function RootNavigator() {
  const dispositivoStatus = useDispositivoStatus();
  const status = useAuthStatus();
  const colorScheme = useColorScheme();

  const isCheckingDispositivo = dispositivoStatus === 'checking';
  const isCheckingSession = status === 'checking';
  const isAuthenticated = status === 'authenticated';
  const isArrancando = isCheckingDispositivo || isCheckingSession;

  // No se espera a esta consulta para quitar el splash: sin red la app tiene
  // que abrir igual. Cuando responde, avisa o levanta el muro.
  const versionApp = useVersionApp();
  useAvisoActualizacion(versionApp, !isArrancando);

  useEffect(() => {
    if (!isArrancando) {
      void SplashScreen.hideAsync();
    }
  }, [isArrancando]);

  const theme = colorScheme === 'dark' ? TEMA_OSCURO : TEMA_CLARO;

  // Mientras se resuelve el dispositivo y se restaura la sesion seguimos
  // mostrando el splash nativo.
  if (isArrancando) return null;

  // Binario por debajo de la version minima: no se ofrece nada, con o sin
  // sesion abierta. Va antes que el error de dispositivo porque un APK
  // obsoleto puede ser justo la causa de que el registro falle.
  if (versionApp.estado === 'OBLIGATORIA') {
    return (
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <ActualizacionObligatoriaScreen urlActualizacion={versionApp.urlActualizacion} />
      </ThemeProvider>
    );
  }

  // Si el registro fallo no se monta el stack: no hay nada que ofrecer
  // mientras el aparato no tenga identidad ante el API.
  if (dispositivoStatus === 'error') {
    return (
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <DispositivoErrorScreen />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(app)" />

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
