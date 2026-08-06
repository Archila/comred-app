import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { cn } from '@/lib';

/**
 * Tipografia de la app. Centraliza tamanos y colores para que las pantallas
 * no repitan combinaciones de clases.
 */

type TextVariant = 'title' | 'subtitle' | 'heading' | 'body' | 'label' | 'caption' | 'error';

const VARIANTS: Record<TextVariant, string> = {
  title: 'text-3xl font-bold text-content dark:text-content-dark-default',
  subtitle: 'text-base text-content-muted dark:text-content-dark-muted',
  heading: 'text-lg font-semibold text-content dark:text-content-dark-default',
  body: 'text-base text-content dark:text-content-dark-default',
  label: 'text-sm font-medium text-content-muted dark:text-content-dark-muted',
  caption: 'text-xs text-content-subtle dark:text-content-dark-subtle',
  error: 'text-sm text-danger-600 dark:text-danger-500',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  className?: string;
}

export function Text({ variant = 'body', className, ...props }: TextProps) {
  return <RNText className={cn(VARIANTS[variant], className)} {...props} />;
}
