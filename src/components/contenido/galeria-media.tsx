import { useEvent } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { Volume2, VolumeX } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { cn, resolveAssetUrl } from '@/lib';
import type { MediaPublicacion } from '@/models';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Galeria horizontal de una publicacion (Plan Maestro, 3.2).
 *
 * Es un `FlatList` horizontal dentro del vertical del visor. Los dos
 * paginan, y el sistema operativo asigna cada gesto a uno solo segun su
 * direccion: deslizar a los lados cambia de foto, deslizar arriba o abajo
 * cambia de publicacion. No hace falta gesture-handler para eso.
 */
export function GaleriaMedia({
  media,
  ancho,
  alto,
  activa,
}: {
  /** Solo imagenes y videos: los documentos van aparte. */
  media: MediaPublicacion[];
  ancho: number;
  alto: number;
  /** La publicacion es la visible del visor. Un video fuera de ella se pausa. */
  activa: boolean;
}) {
  const [actual, setActual] = useState(0);

  function alTerminarDeslizar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    setActual(Math.round(evento.nativeEvent.contentOffset.x / ancho));
  }

  return (
    <View style={{ width: ancho, height: alto }} className="bg-black">
      <FlatList
        data={media}
        keyExtractor={(archivo) => archivo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={alTerminarDeslizar}
        getItemLayout={(_, index) => ({ length: ancho, offset: ancho * index, index })}
        initialNumToRender={1}
        windowSize={3}
        renderItem={({ item, index }) =>
          item.tipo === 'VIDEO' ? (
            <VideoMedia
              url={item.url}
              ancho={ancho}
              alto={alto}
              activo={activa && index === actual}
            />
          ) : (
            <ImagenMedia archivo={item} ancho={ancho} alto={alto} />
          )
        }
      />

      {media.length > 1 && (
        <>
          {/* Plan Maestro 3.2: indicador "1/4, 2/4...". */}
          <View className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1">
            <Text variant="plain" className="text-xs font-semibold text-white">
              {actual + 1}/{media.length}
            </Text>
          </View>

          <View className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5">
            {media.map((archivo, index) => (
              <View
                key={archivo.id}
                className={cn(
                  'h-1.5 rounded-full',
                  index === actual ? 'w-4 bg-white' : 'w-1.5 bg-white/50',
                )}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Imagen entera, sin recortar: una infografia recortada pierde justo lo que
 * dice. El hueco que deja se rellena con la misma foto desenfocada.
 */
function ImagenMedia({
  archivo,
  ancho,
  alto,
}: {
  archivo: MediaPublicacion;
  ancho: number;
  alto: number;
}) {
  const uri = resolveAssetUrl(archivo.url);

  return (
    <View style={{ width: ancho, height: alto }}>
      <Image
        source={{ uri }}
        style={{ position: 'absolute', width: ancho, height: alto, opacity: 0.55 }}
        contentFit="cover"
        blurRadius={24}
        recyclingKey={`${archivo.id}-fondo`}
      />
      <Image
        source={{ uri }}
        style={{ width: ancho, height: alto }}
        contentFit="contain"
        transition={200}
        recyclingKey={archivo.id}
        accessibilityLabel={archivo.titulo ?? undefined}
      />
    </View>
  );
}

/**
 * Fuera del componente a proposito: el React Compiler no deja mutar dentro de
 * el un valor devuelto por un hook, y el reproductor se controla asi.
 */
function alternarSonido(reproductor: VideoPlayer) {
  reproductor.muted = !reproductor.muted;
}

/**
 * Video con controles nativos (Plan Maestro, 3.3). No arranca solo, para no
 * gastar los datos de nadie, y se pausa en cuanto deja de verse: al cambiar de
 * foto o de publicacion.
 */
function VideoMedia({
  url,
  ancho,
  alto,
  activo,
}: {
  url: string;
  ancho: number;
  alto: number;
  activo: boolean;
}) {
  const player = useVideoPlayer(resolveAssetUrl(url) ?? null, (reproductor) => {
    reproductor.loop = false;
  });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });

  useEffect(() => {
    if (!activo) player.pause();
  }, [activo, player]);

  return (
    <View style={{ width: ancho, height: alto }}>
      <VideoView
        player={player}
        style={{ width: ancho, height: alto }}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={muted ? 'Activar sonido' : 'Silenciar'}
        hitSlop={8}
        onPress={() => alternarSonido(player)}
        className="absolute left-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/60 active:opacity-70"
      >
        <Icon as={muted ? VolumeX : Volume2} size={18} className="text-white" />
      </Pressable>
    </View>
  );
}
