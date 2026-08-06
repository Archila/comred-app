import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

import { cn } from '@/lib';

/**
 * Iconografia: lucide-react-native.
 *
 * Los iconos de Lucide reciben el color por PROP, no por `style`, asi que
 * `cssInterop` traduce la clase de Tailwind (`text-primary-500`) al prop
 * `color`. Sin esto, `className` no tendria ningun efecto sobre un icono.
 *
 * Uso:
 *   import { Icon } from '@/components/ui';
 *   import { LogOut } from 'lucide-react-native';
 *   <Icon as={LogOut} size={20} className="text-danger-500" />
 */
export function iconWithClassName(icon: LucideIcon): LucideIcon {
  cssInterop(icon, {
    className: {
      target: 'style',
      nativeStyleToProp: { color: true, opacity: true },
    },
  });
  return icon;
}

export interface IconProps extends LucideProps {
  /** Componente de icono de lucide-react-native. */
  as: LucideIcon;
  className?: string;
}

export function Icon({ as: LucideIconComponent, size = 20, className, ...props }: IconProps) {
  iconWithClassName(LucideIconComponent);

  return (
    <LucideIconComponent
      size={size}
      className={cn('text-content dark:text-content-dark-default', className)}
      {...props}
    />
  );
}
