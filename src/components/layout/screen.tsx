import { remapProps } from 'nativewind';
import { ScrollView, View, type ViewProps } from 'react-native';
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
} from 'react-native-keyboard-controller';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib';

// NativeWind solo traduce `className` en los componentes de React Native; los
// de terceros hay que registrarlos para que acepten las mismas clases.
remapProps(KeyboardAwareScrollView, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});

/** Aire entre el campo enfocado y el borde superior del teclado. */
const MARGEN_TECLADO = 24;

/**
 * Contenedor base de una pantalla: area segura, fondo del tema y, opcionalmente,
 * scroll + manejo del teclado. Evita repetir este andamiaje en cada ruta.
 */
export interface ScreenProps extends ViewProps {
  /** Envuelve el contenido en un ScrollView. */
  scrollable?: boolean;
  /**
   * Mantiene visible el campo enfocado cuando aparece el teclado (formularios).
   *
   * Con la app en edge-to-edge (obligatorio desde Android 15 y activo en el
   * build) `adjustResize` ya no encoge la ventana, y el `KeyboardAvoidingView`
   * de React Native mide relativo a su padre: se queda corto bajo un header.
   * Por eso se usa react-native-keyboard-controller, que mide en pantalla y
   * desplaza el scroll hasta el campo enfocado.
   */
  avoidKeyboard?: boolean;
  /** Bordes donde aplicar el inset seguro. */
  edges?: readonly Edge[];
  contentClassName?: string;
  className?: string;
}

export function Screen({
  scrollable = false,
  avoidKeyboard = false,
  edges = ['top', 'bottom'],
  className,
  contentClassName,
  children,
  ...props
}: ScreenProps) {
  const contentContainerClassName = cn('grow p-4', contentClassName);

  let content;
  if (scrollable && avoidKeyboard) {
    content = (
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName={contentContainerClassName}
        bottomOffset={MARGEN_TECLADO}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  } else if (scrollable) {
    content = (
      <ScrollView
        className="flex-1"
        contentContainerClassName={contentContainerClassName}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  } else {
    const fijo = <View className={cn('flex-1 p-4', contentClassName)}>{children}</View>;
    content = avoidKeyboard ? (
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        {fijo}
      </KeyboardAvoidingView>
    ) : (
      fijo
    );
  }

  return (
    <SafeAreaView
      edges={edges}
      className={cn('flex-1 bg-surface dark:bg-surface-dark', className)}
      {...props}
    >
      {content}
    </SafeAreaView>
  );
}
