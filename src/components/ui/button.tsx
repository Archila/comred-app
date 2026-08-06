import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { cn } from '@/lib';

import { Icon } from './icon';
import { Text } from './text';

/**
 * Boton de la app. Todas las variantes y tamanos viven aqui: ninguna pantalla
 * debe estilizar un `Pressable` a mano.
 */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const CONTAINER_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 active:bg-primary-600',
  secondary:
    'bg-surface-sunken active:bg-line dark:bg-surface-dark-muted dark:active:bg-line-dark-strong',
  outline:
    'border border-line-strong bg-transparent active:bg-surface-sunken dark:border-line-dark-strong dark:active:bg-surface-dark-muted',
  ghost: 'bg-transparent active:bg-surface-sunken dark:active:bg-surface-dark-muted',
  danger: 'bg-danger-500 active:bg-danger-600',
};

const LABEL_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-content dark:text-content-dark-default',
  outline: 'text-content dark:text-content-dark-default',
  ghost: 'text-primary-600 dark:text-primary-400',
  danger: 'text-white',
};

const CONTAINER_SIZES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4',
  md: 'h-control px-5',
  lg: 'h-14 px-6',
};

const LABEL_SIZES: Record<ButtonSize, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-base',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner y bloquea el boton. */
  loading?: boolean;
  /** Icono opcional a la izquierda del texto. */
  icon?: LucideIcon;
  /** Ocupa todo el ancho disponible. */
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-field',
        CONTAINER_VARIANTS[variant],
        CONTAINER_SIZES[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#208AEF'} />
      ) : (
        icon && <Icon as={icon} size={size === 'sm' ? 16 : 18} className={LABEL_VARIANTS[variant]} />
      )}

      <Text className={cn('font-semibold', LABEL_VARIANTS[variant], LABEL_SIZES[size])}>
        {label}
      </Text>
    </Pressable>
  );
}
