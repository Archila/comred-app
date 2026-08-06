import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

import { AuthProvider } from './auth-provider';
import { BrandingProvider } from './branding-provider';
import { QueryProvider } from './query-provider';

/**
 * Punto unico de composicion de providers. El orden importa:
 *   - AuthProvider necesita el QueryClient.
 *   - BrandingProvider necesita ambos: consulta el API y lee la organizacion
 *     del usuario autenticado.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <BrandingProvider>{children}</BrandingProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
