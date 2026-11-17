import { useRouter, type Href } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { PRESENTACION_SECCION } from '@/constants';
import { usePuedeCrearContenido } from '@/store';

import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import type { DestinoPublicacion } from './pantalla-nueva-publicacion';

/** Ruta del formulario, con la tarjeta ya elegida si se sabe. */
function rutaNueva(seccion: DestinoPublicacion, categoriaId?: string): Href {
  if (seccion === 'GENERAL') return '/publicar' as Href;
  const base = `/${PRESENTACION_SECCION[seccion].slug}/nueva`;
  return (categoriaId ? `${base}?categoriaId=${categoriaId}` : base) as Href;
}

/**
 * Acceso a "Nueva publicacion". Solo lo ve un administrador con sesion; a
 * cualquier otro no le aparece nada (`null`), no un boton deshabilitado.
 *
 *   - `boton`: boton grande con texto, para la pantalla de tarjetas.
 *   - `cabecera`: icono "+" para la barra de la seccion, en el visor.
 */
export function BotonNuevaPublicacion({
  seccion,
  categoriaId,
  forma = 'boton',
  variante = 'primary',
}: {
  seccion: DestinoPublicacion;
  categoriaId?: string;
  forma?: 'boton' | 'cabecera';
  /** Con forma `boton`: secundario cuando hay otra accion principal al lado. */
  variante?: 'primary' | 'outline';
}) {
  const router = useRouter();
  const puedeCrear = usePuedeCrearContenido();

  if (!puedeCrear) return null;

  const abrir = () => router.push(rutaNueva(seccion, categoriaId));

  if (forma === 'cabecera') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nueva publicación"
        hitSlop={8}
        onPress={abrir}
        className="h-9 w-9 items-center justify-center rounded-full bg-primary-500 active:bg-primary-600"
      >
        <Icon as={Plus} size={20} className="text-primary-foreground dark:text-primary-foreground" />
      </Pressable>
    );
  }

  return (
    <Button
      label="Nueva publicación"
      icon={Plus}
      variant={variante}
      size="lg"
      fullWidth
      onPress={abrir}
    />
  );
}
