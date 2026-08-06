import { vars } from 'nativewind';
import { useEffect, useMemo, type PropsWithChildren } from 'react';
import { View } from 'react-native';

import { useOrganizacionPublica } from '@/hooks';
import { useBrandVars, useOrganizacionStore } from '@/store';

/**
 * Theming dinamico por organizacion.
 *
 * `vars()` escribe las variables CSS (`--color-primary-500`, ...) como estilo
 * de esta View; todos los hijos las heredan, asi que las clases
 * `bg-primary-500` de cualquier componente pasan a resolver al color de la
 * municipalidad sin tocar una sola pantalla.
 *
 * Orden de arranque:
 *   1. `hydrate()` lee del disco la ultima marca conocida -> sin parpadeo.
 *   2. `useOrganizacionPublica()` refresca contra el API y persiste.
 *
 * Limitacion conocida de React Native: los `Modal` se montan en una ventana
 * aparte y NO heredan estas variables. Si un modal necesita la marca, hay que
 * envolver su contenido tambien (o usar `useBrandColors()`).
 */
export function BrandingProvider({ children }: PropsWithChildren) {
  const hydrate = useOrganizacionStore((state) => state.hydrate);
  const brandVars = useBrandVars();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Se dispara solo cuando hay un id de organizacion (build o sesion).
  useOrganizacionPublica();

  const style = useMemo(() => vars(brandVars), [brandVars]);

  return (
    <View style={style} className="flex-1">
      {children}
    </View>
  );
}
