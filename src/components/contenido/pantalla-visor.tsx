import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDown } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  View,
  useWindowDimensions,
  type ListViewToken,
} from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ICONO_SIN_PUBLICACIONES,
  PRESENTACION_SECCION,
  iconoDeCategoria,
  type SeccionConVisor,
} from '@/constants';
import { useCategoriasContenido, useVisorPublicaciones, type PublicacionVisor } from '@/hooks';
import type { Publicacion } from '@/models';
import { useBrandColors } from '@/store';

import { EmptyState } from '../feedback/empty-state';
import { ErrorState } from '../feedback/error-state';
import { LoadingScreen } from '../feedback/loading-screen';
import { Button } from '../ui/button';
import { Text } from '../ui/text';
import { entidadDe } from './acciones';
import { DetallePublicacion } from './detalle-publicacion';
import { PublicacionSlide } from './publicacion-slide';

/** Cuanto se ve el aviso discreto al pasar a otra tarjeta, incidente, jornada o proyecto. */
const DURACION_AVISO = 2200;

const VISIBILIDAD = { itemVisiblePercentThreshold: 60 };

/**
 * Visor de publicaciones de una seccion (Plan Maestro, 3).
 *
 *   - Vertical, una publicacion por pantalla con ajuste automatico: deslizar
 *     arriba avanza y abajo regresa.
 *   - Horizontal, dentro de cada una, su galeria.
 *   - Navegacion continua: al acabar la tarjeta elegida sigue con la
 *     siguiente, y lo avisa discretamente arriba (3.4).
 *
 * Al volver desde el menu conserva la posicion: el navegador de pestanas no
 * desmonta la pantalla, y el menu vuelve a la ultima ruta de la seccion.
 */
export function PantallaVisor({ seccion }: { seccion: SeccionConVisor }) {
  const { categoriaId } = useLocalSearchParams<{ categoriaId: string }>();
  const presentacion = PRESENTACION_SECCION[seccion];
  const router = useRouter();
  const brand = useBrandColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const categorias = useCategoriasContenido(seccion);
  const visor = useVisorPublicaciones({
    seccion,
    categorias: categorias.data,
    categoriaInicialId: categoriaId,
  });
  const { items, tarjetaInicial } = visor;

  // Alto real del hueco entre el encabezado y el borde inferior. Cada
  // publicacion mide exactamente esto, y es lo que hace funcionar el ajuste.
  const [alto, setAlto] = useState(0);
  const [activo, setActivo] = useState(0);
  const [detalle, setDetalle] = useState<PublicacionVisor | null>(null);
  const { aviso, alMostrar } = useAvisoDeCambio();

  // FlatList exige que este callback no cambie nunca: por eso lee el item del
  // propio token y no de `items`.
  const alCambiarVisibles = useCallback(
    ({ viewableItems }: { viewableItems: ListViewToken[] }) => {
      const primero = viewableItems.find((token) => token.isViewable);
      if (primero?.index == null) return;
      setActivo(primero.index);
      alMostrar(primero.item as PublicacionVisor);
    },
    [alMostrar],
  );

  const abrirDetalle = useCallback(
    (publicacion: Publicacion) => {
      setDetalle(items.find((item) => item.publicacion.id === publicacion.id) ?? null);
    },
    [items],
  );

  const titulo = tarjetaInicial?.nombre ?? presentacion.titulo;

  let contenido;
  if (categorias.isPending || (visor.isPending && Boolean(tarjetaInicial))) {
    contenido = <LoadingScreen />;
  } else if (categorias.isError) {
    contenido = <ErrorState error={categorias.error} onRetry={() => void categorias.refetch()} />;
  } else if (!tarjetaInicial) {
    contenido = (
      <EmptyState
        title="Categoría no disponible"
        description="Esta categoría ya no existe o fue desactivada."
      />
    );
  } else if (visor.isError && items.length === 0) {
    contenido = <ErrorState error={visor.error} onRetry={() => void visor.refetch()} />;
  } else if (items.length === 0) {
    contenido = (
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <EmptyState
          icon={ICONO_SIN_PUBLICACIONES}
          title="Aún no hay publicaciones"
          description={`Cuando se publique algo en "${tarjetaInicial.nombre}" lo verás aquí.`}
        />
        {visor.hasNextPage ? (
          <Button
            label="Ver las siguientes categorías"
            icon={ArrowDown}
            loading={visor.isFetchingNextPage}
            onPress={() => void visor.fetchNextPage()}
          />
        ) : (
          <Button label="Volver a las categorías" variant="outline" onPress={() => router.back()} />
        )}
      </View>
    );
  } else {
    contenido = alto > 0 && (
      <FlatList
        data={items}
        keyExtractor={(item) => item.publicacion.id}
        renderItem={({ item, index }) => (
          <PublicacionSlide
            publicacion={item.publicacion}
            tarjeta={item.tarjeta.nombre}
            iconoTarjeta={iconoDeCategoria(item.tarjeta, presentacion.icono)}
            ancho={width}
            alto={alto}
            margenInferior={insets.bottom}
            activa={index === activo}
            onVerMas={abrirDetalle}
          />
        )}
        pagingEnabled
        decelerationRate="fast"
        disableIntervalMomentum
        showsVerticalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: alto, offset: alto * index, index })}
        onViewableItemsChanged={alCambiarVisibles}
        viewabilityConfig={VISIBILIDAD}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={5}
        onEndReachedThreshold={2}
        onEndReached={() => {
          if (visor.hasNextPage && !visor.isFetchingNextPage) void visor.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={visor.isRefetching && !visor.isFetchingNextPage}
            onRefresh={() => void visor.refetch()}
            colors={[brand.primary]}
            tintColor={brand.primary}
          />
        }
        ListFooterComponent={
          <Final
            cargando={visor.isFetchingNextPage}
            terminado={!visor.hasNextPage}
            margenInferior={insets.bottom}
          />
        }
      />
    );
  }

  return (
    <View
      className="flex-1 bg-surface dark:bg-surface-dark"
      onLayout={(evento) => setAlto(Math.floor(evento.nativeEvent.layout.height))}
    >
      <Stack.Screen options={{ title: titulo }} />
      {contenido}

      {aviso && (
        <Animated.View
          key={aviso.clave}
          entering={FadeInDown.duration(220)}
          exiting={FadeOut.duration(300)}
          pointerEvents="none"
          className="absolute left-0 right-0 top-12 items-center px-6"
        >
          <View className="max-w-full rounded-full bg-black/75 px-4 py-2">
            <Text variant="plain" className="text-center text-sm font-semibold text-white" numberOfLines={1}>
              {aviso.texto}
            </Text>
          </View>
        </Animated.View>
      )}

      <DetallePublicacion
        publicacion={detalle?.publicacion ?? null}
        tarjeta={detalle?.tarjeta.nombre}
        onCerrar={() => setDetalle(null)}
      />
    </View>
  );
}

/**
 * Lo que identifica "donde estoy": la tarjeta y, si la publicacion cuenta
 * uno, el incidente, la jornada o el proyecto.
 */
function contextoDe(item: PublicacionVisor | undefined) {
  if (!item) return null;
  const entidad = entidadDe(item.publicacion);
  return {
    clave: `${item.tarjeta.id}|${entidad?.id ?? ''}`,
    texto: entidad ? `${item.tarjeta.nombre} · ${entidad.nombre}` : item.tarjeta.nombre,
  };
}

/**
 * Aviso discreto cuando la publicacion visible es de otra tarjeta, u otro
 * incidente, jornada o proyecto, que la anterior (Plan Maestro, 3.4: "al
 * llegar al final del proyecto, continuar hacia otro"). No sale al abrir el visor:
 * ahi el titulo ya dice donde se esta.
 *
 * Se dispara desde el callback de visibilidad y no desde un efecto: es la
 * respuesta a que el usuario deslizo, no a que cambiara un estado.
 */
function useAvisoDeCambio() {
  const anterior = useRef<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aviso, setAviso] = useState<{ clave: string; texto: string } | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    },
    [],
  );

  const alMostrar = useCallback((item: PublicacionVisor | undefined) => {
    const contexto = contextoDe(item);
    if (!contexto) return;

    const previo = anterior.current;
    anterior.current = contexto.clave;
    if (previo === null || previo === contexto.clave) return;

    setAviso(contexto);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), DURACION_AVISO);
  }, []);

  return { aviso, alMostrar };
}

function Final({
  cargando,
  terminado,
  margenInferior,
}: {
  cargando: boolean;
  terminado: boolean;
  margenInferior: number;
}) {
  const brand = useBrandColors();

  if (cargando) {
    return (
      <View className="h-24 items-center justify-center">
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }
  if (!terminado) return null;

  return (
    <View className="items-center justify-center gap-1 px-6 pt-6" style={{ paddingBottom: margenInferior + 32 }}>
      <Text variant="label">Has visto todas las publicaciones</Text>
      <Text variant="caption" className="text-center">
        Desliza hacia abajo para regresar.
      </Text>
    </View>
  );
}
