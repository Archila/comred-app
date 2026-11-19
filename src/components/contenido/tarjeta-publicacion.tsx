import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight, Images, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { cn } from '@/lib';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Tarjeta de publicacion de la pagina principal: galeria, titulo y
 * descripcion. La usa el inicio y, con las fotos aun en el telefono, la vista
 * previa del formulario: lo que se ve al crear es lo que vera la poblacion.
 */

/** Una imagen ya resuelta: URL absoluta del API o archivo local. */
export interface ImagenTarjeta {
  id: string;
  uri: string;
}

/** Alto respecto al ancho. 4:3 deja respirar a las verticales sin perder las horizontales. */
const PROPORCION = 0.75;

export function TarjetaPublicacion({
  imagenes,
  titulo,
  descripcion,
  detalle,
  placeholderTitulo,
  placeholderDescripcion,
  maxLineas,
  onPress,
}: {
  imagenes: ImagenTarjeta[];
  titulo: string;
  descripcion?: string | null;
  /** Linea pequena bajo la descripcion: dependencia, comunidad. */
  detalle?: string | null;
  /** Lo que se ve en la vista previa mientras el campo esta vacio. */
  placeholderTitulo?: string;
  placeholderDescripcion?: string;
  /** Recorta la descripcion; el resto se lee en el detalle. */
  maxLineas?: number;
  onPress?: () => void;
}) {
  const contenido = (
    <>
      <CarruselImagenes imagenes={imagenes} />

      <View className="gap-2 px-1">
        <Text
          variant="plain"
          className={cn(
            'text-2xl font-bold leading-8',
            titulo ? 'text-content dark:text-content-dark-default' : 'text-content-subtle dark:text-content-dark-subtle',
          )}
        >
          {titulo || placeholderTitulo}
        </Text>
        {(descripcion || placeholderDescripcion) && (
          <Text
            variant="plain"
            numberOfLines={maxLineas}
            className={cn(
              'text-base leading-6',
              descripcion
                ? 'text-content-muted dark:text-content-dark-muted'
                : 'text-content-subtle dark:text-content-dark-subtle',
            )}
          >
            {descripcion || placeholderDescripcion}
          </Text>
        )}
        {detalle && <Text variant="caption">{detalle}</Text>}
      </View>
    </>
  );

  const estilo =
    'gap-4 rounded-card border border-line bg-surface p-3 pb-4 dark:border-line-dark dark:bg-surface-dark-muted';

  if (!onPress) return <View className={estilo}>{contenido}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint="Abre la publicación completa"
      onPress={onPress}
      className={cn(estilo, 'active:opacity-90')}
    >
      {contenido}
    </Pressable>
  );
}

/**
 * Galeria horizontal con flechas y puntos. La foto se ve entera (`contain`):
 * una infografia recortada pierde justo lo que dice.
 */
export function CarruselImagenes({ imagenes }: { imagenes: ImagenTarjeta[] }) {
  const lista = useRef<FlatList<ImagenTarjeta>>(null);
  const [ancho, setAncho] = useState(0);
  const [actual, setActual] = useState(0);
  const alto = Math.round(ancho * PROPORCION);
  // Al quitar fotos (en la vista previa) el indice puede quedar fuera.
  const indice = Math.min(actual, Math.max(imagenes.length - 1, 0));

  function ir(destino: number) {
    if (destino < 0 || destino >= imagenes.length) return;
    lista.current?.scrollToIndex({ index: destino, animated: true });
    setActual(destino);
  }

  function alTerminarDeslizar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    if (ancho > 0) setActual(Math.round(evento.nativeEvent.contentOffset.x / ancho));
  }

  return (
    <View className="gap-3">
      <View
        className="overflow-hidden rounded-field"
        style={{ height: alto || undefined }}
        onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}
      >
        {imagenes.length === 0 ? (
          <View
            className="flex-1 items-center justify-center gap-2 rounded-field bg-surface-sunken p-6 dark:bg-surface-dark-sunken"
            style={{ minHeight: 160 }}
          >
            <Icon as={Images} size={36} className="text-content-subtle dark:text-content-dark-subtle" />
            <Text variant="caption" className="text-center">
              Aquí se verán tus imágenes
            </Text>
          </View>
        ) : (
          ancho > 0 && (
            <FlatList
              ref={lista}
              data={imagenes}
              keyExtractor={(imagen) => imagen.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={alTerminarDeslizar}
              getItemLayout={(_, i) => ({ length: ancho, offset: ancho * i, index: i })}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: ancho, height: alto }}
                  contentFit="contain"
                  transition={200}
                  recyclingKey={item.id}
                />
              )}
            />
          )
        )}

        {imagenes.length > 1 && (
          <>
            <Flecha icono={ChevronLeft} lado="izquierda" visible={indice > 0} onPress={() => ir(indice - 1)} />
            <Flecha
              icono={ChevronRight}
              lado="derecha"
              visible={indice < imagenes.length - 1}
              onPress={() => ir(indice + 1)}
            />
          </>
        )}
      </View>

      {imagenes.length > 1 && (
        <View className="flex-row justify-center gap-2">
          {imagenes.map((imagen, i) => (
            <View
              key={imagen.id}
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                i === indice ? 'bg-primary-500' : 'bg-line-strong dark:bg-line-dark-strong',
              )}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function Flecha({
  icono,
  lado,
  visible,
  onPress,
}: {
  icono: LucideIcon;
  lado: 'izquierda' | 'derecha';
  visible: boolean;
  onPress: () => void;
}) {
  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lado === 'izquierda' ? 'Imagen anterior' : 'Imagen siguiente'}
      hitSlop={8}
      onPress={onPress}
      className={cn(
        // Rojo de la marca con borde claro: se distingue sobre fotos claras y
        // oscuras, y sobre la tarjeta en modo claro y oscuro.
        'absolute top-1/2 -mt-5 h-10 w-10 items-center justify-center rounded-full border-2 border-white/80 bg-primary-500 active:opacity-70',
        lado === 'izquierda' ? 'left-2' : 'right-2',
      )}
    >
      <Icon
        as={icono}
        size={22}
        strokeWidth={2.75}
        className="text-primary-foreground dark:text-primary-foreground"
      />
    </Pressable>
  );
}
