import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';

import { AuthProvider } from './auth-provider';
import { BrandingProvider } from './branding-provider';
import { DispositivoProvider } from './dispositivo-provider';
import { PushProvider } from './push-provider';
import { QueryProvider } from './query-provider';

/**
 * Punto unico de composicion de providers. El orden importa:
 *   - DispositivoProvider va primero: la identidad del dispositivo es previa a
 *     la sesion y no depende de ella.
 *   - PushProvider cuelga del dispositivo y no de la sesion: un aparato sin
 *     usuario tambien recibe avisos. Necesita el QueryClient para el acuse.
 *   - AuthProvider necesita el QueryClient.
 *   - BrandingProvider necesita ambos: consulta el API y lee la organizacion
 *     del usuario autenticado.
 *   - KeyboardProvider envuelve todo lo visual: sin el, el `avoidKeyboard`
 *     de `Screen` no recibe la altura del teclado.
 */
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <QueryProvider>
            <DispositivoProvider>
              <PushProvider>
                <AuthProvider>
                  <BrandingProvider>{children}</BrandingProvider>
                </AuthProvider>
              </PushProvider>
            </DispositivoProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
