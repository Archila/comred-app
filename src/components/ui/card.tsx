import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib';

/** Contenedor con superficie, borde y radio estandar. */
export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={cn(
        'rounded-card border border-line bg-surface p-4',
        'dark:border-line-dark dark:bg-surface-dark-muted',
        className,
      )}
      {...props}
    />
  );
}
