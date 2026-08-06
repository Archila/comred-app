import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib';

/**
 * Contenedor base de una pantalla: area segura, fondo del tema y, opcionalmente,
 * scroll + manejo del teclado. Evita repetir este andamiaje en cada ruta.
 */
export interface ScreenProps extends ViewProps {
  /** Envuelve el contenido en un ScrollView. */
  scrollable?: boolean;
  /** Sube el contenido cuando aparece el teclado (formularios). */
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
  const content = scrollable ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName={cn('grow p-4', contentClassName)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 p-4', contentClassName)}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      className={cn('flex-1 bg-surface dark:bg-surface-dark', className)}
      {...props}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
