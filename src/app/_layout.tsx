import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { ActualizacionObligatoriaScreen, DispositivoErrorScreen } from '@/components';
import { useAvisoActualizacion, useVersionApp } from '@/hooks';
import { AppProviders } from '@/providers';
import { useAuthStatus, useDispositivoStatus } from '@/store';

// El splash se mantiene visible hasta que el dispositivo este resuelto y
// sepamos si hay sesion activa.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

/**
 * Navegador raiz. Es el UNICO lugar donde se decide que grupo de rutas puede
 * verse: `Stack.Protected` saca del stack el grupo cuyo guard sea falso y
 * redirige solo. Ninguna pantalla necesita hacer `router.replace` manual.
 *
 * Orden de arranque, y es deliberado:
 *   1. Dispositivo registrado (identidad del aparato, previa a la sesion).
 *   2. Sesion restaurada.
 *   3. Recien entonces se decide entre (auth) y (app).
 *
 * El paso 1 va primero porque un dispositivo sin registrar no recibe avisos de
 * emergencia. Dejar pasar al login lo ocultaria hasta que hiciera falta.
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

  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  // Mientras se resuelve el dispositivo y se restaura la sesion seguimos
  // mostrando el splash nativo.
  if (isArrancando) return null;

  // Binario por debajo de la version minima: no se ofrece ni el login, con o
  // sin sesion abierta. Va antes que el error de dispositivo porque un APK
  // obsoleto puede ser justo la causa de que el registro falle.
  if (versionApp.estado === 'OBLIGATORIA') {
    return (
      <ThemeProvider value={theme}>
        <StatusBar style="auto" />
        <ActualizacionObligatoriaScreen urlActualizacion={versionApp.urlActualizacion} />
      </ThemeProvider>
    );
  }

  // Si el registro fallo no se monta el stack: no hay login que ofrecer
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
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
