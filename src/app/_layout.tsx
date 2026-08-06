import '@/global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AppProviders } from '@/providers';
import { useAuthStatus } from '@/store';

// El splash se mantiene visible hasta que sepamos si hay sesion activa.
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
 */
function RootNavigator() {
  const status = useAuthStatus();
  const colorScheme = useColorScheme();

  const isCheckingSession = status === 'checking';
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    if (!isCheckingSession) {
      void SplashScreen.hideAsync();
    }
  }, [isCheckingSession]);

  // Mientras se restaura la sesion seguimos mostrando el splash nativo.
  if (isCheckingSession) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
