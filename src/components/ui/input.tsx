import type { LucideIcon } from 'lucide-react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  Pressable,
  TextInput,
  useColorScheme,
  View,
  type TextInputProps,
} from 'react-native';

import { Colors } from '@/constants';
import { cn } from '@/lib';

import { Icon } from './icon';
import { Text } from './text';

/**
 * Campo de texto con etiqueta, icono, mensaje de error y toggle de password.
 *
 * `placeholderTextColor` se pasa como prop porque React Native no lo resuelve
 * desde `style`; por eso se lee el color crudo de `constants/theme`.
 */
export interface InputProps extends TextInputProps {
  label?: string;
  /** Mensaje de error; si viene, el borde se pinta en rojo. */
  error?: string | null;
  /** Texto de ayuda debajo del campo (se oculta si hay error). */
  hint?: string;
  icon?: LucideIcon;
  /** Campo de contrasena: agrega el boton de mostrar/ocultar. */
  isPassword?: boolean;
  containerClassName?: string;
  className?: string;
}

export function Input({
  label,
  error,
  hint,
  icon,
  isPassword = false,
  containerClassName,
  className,
  editable = true,
  ...props
}: InputProps) {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;

  const [isSecure, setIsSecure] = useState(isPassword);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);

  return (
    <View className={cn('w-full gap-1.5', containerClassName)}>
      {label && <Text variant="label">{label}</Text>}

      <View
        className={cn(
          'h-control flex-row items-center gap-2 rounded-field border bg-surface px-3',
          'dark:bg-surface-dark-muted',
          hasError
            ? 'border-danger-500'
            : isFocused
              ? 'border-primary-500'
              : 'border-line dark:border-line-dark',
          !editable && 'opacity-60',
        )}
      >
        {icon && (
          <Icon as={icon} size={18} className="text-content-subtle dark:text-content-dark-subtle" />
        )}

        <TextInput
          className={cn(
            'h-full flex-1 text-base text-content dark:text-content-dark-default',
            className,
          )}
          placeholderTextColor={palette.textSubtle}
          secureTextEntry={isSecure}
          editable={editable}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          {...props}
        />

        {isPassword && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isSecure ? 'Mostrar contrasena' : 'Ocultar contrasena'}
            hitSlop={8}
            onPress={() => setIsSecure((value) => !value)}
          >
            <Icon
              as={isSecure ? Eye : EyeOff}
              size={18}
              className="text-content-subtle dark:text-content-dark-subtle"
            />
          </Pressable>
        )}
      </View>

      {hasError ? (
        <Text variant="error">{error}</Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}
