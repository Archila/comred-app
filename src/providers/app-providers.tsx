import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

import { AuthProvider } from './auth-provider';
import { BrandingProvider } from './branding-provider';
import { DispositivoProvider } from './dispositivo-provider';
import { QueryProvider } from './query-provider';

/**
 * Punto unico de composicion de providers. El orden importa:
 *   - DispositivoProvider va primero: la identidad del dispositivo es previa a
 *     la sesion y no depende de ella.
 *   - AuthProvider necesita el QueryClient.
 *   - BrandingProvider necesita ambos: consulta el API y lee la organizacion
 *     del usuario autenticado.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <DispositivoProvider>
            <AuthProvider>
              <BrandingProvider>{children}</BrandingProvider>
            </AuthProvider>
          </DispositivoProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
