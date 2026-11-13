import { useLocalSearchParams } from 'expo-router';
import { BellOff } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, RefreshControl, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingScreen,
  Screen,
  Text,
} from '@/components';
import { TIPO_MENSAJE } from '@/constants';
import { useBandejaInfinita, useMarcarLeido } from '@/hooks';
import { cn, formatDateTime } from '@/lib';
import type { MensajeBandeja } from '@/models';
import { useBrandColors, usePermisoNotificaciones } from '@/store';

/**
 * Bandeja de avisos del aparato.
 *
 * Es la fuente de verdad, no la notificacion: aqui aparecen tambien los avisos
 * que no sonaron (permiso denegado, token caducado, entrega fallida). Por eso
 * se refresca sola al volver a primer plano.
 *
 * Leer la lista NO acusa recibo: el acuse dice que esa persona se entero de un
 * aviso concreto, y solo se manda al tocarlo (aqui o en la notificacion).
 */

export default function AvisosScreen() {
  const { mensajeId } = useLocalSearchParams<{ mensajeId?: string }>();
  const brand = useBrandColors();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBandejaInfinita({ limit: 30 });
  const { mutate: marcarLeido } = useMarcarLeido();

  const mensajes = useMemo(() => data?.pages.flatMap((pagina) => pagina.items) ?? [], [data]);

  // Si se llego desde una notificacion y el acuse del tap no llego al API
  // (sin red en ese momento), se repite aqui. Una vez por mensaje.
  const acusado = useRef<string | null>(null);
  useEffect(() => {
    if (!mensajeId || acusado.current === mensajeId) return;
    const mensaje = mensajes.find((m) => m.mensajeId === mensajeId);
    if (!mensaje) return;

    acusado.current = mensajeId;
    if (!mensaje.leido) marcarLeido(mensajeId);
  }, [mensajeId, mensajes, marcarLeido]);

  if (isLoading) return <LoadingScreen message="Cargando avisos..." />;
  if (isError && mensajes.length === 0) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <Screen edges={['bottom']} contentClassName="p-0">
      <FlatList
        data={mensajes}
        keyExtractor={(mensaje) => mensaje.mensajeId}
        contentContainerClassName="grow gap-3 p-4"
        ListHeaderComponent={<AvisoPermiso />}
        ListEmptyComponent={
          <EmptyState
            title="Sin avisos"
            description="Aqui veras los avisos que tu municipalidad envie a este telefono."
          />
        }
        renderItem={({ item }) => (
          <AvisoItem
            mensaje={item}
            destacado={item.mensajeId === mensajeId}
            onPress={() => {
              if (!item.leido) marcarLeido(item.mensajeId);
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => refetch()}
            colors={[brand.primary]}
            tintColor={brand.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator color={brand.primary} /> : null
        }
      />
    </Screen>
  );
}

/**
 * Aviso de permiso denegado. Sin el, quien denego las notificaciones no tiene
 * forma de saber que su telefono no va a sonar en una emergencia.
 */
function AvisoPermiso() {
  const permitido = usePermisoNotificaciones();
  if (permitido !== false) return null;

  return (
    <Card className="gap-3 border-warning-500 bg-warning-50 dark:bg-surface-dark-muted">
      <View className="flex-row items-center gap-2">
        <Icon as={BellOff} size={20} className="text-warning-700 dark:text-warning-500" />
        <Text variant="heading" className="flex-1">
          Notificaciones desactivadas
        </Text>
      </View>
      <Text variant="body">
        Los avisos seguiran apareciendo aqui, pero tu telefono no sonara cuando lleguen.
      </Text>
      <Button
        label="Activar en ajustes"
        variant="outline"
        size="sm"
        onPress={() => void Linking.openSettings()}
      />
    </Card>
  );
}

function AvisoItem({
  mensaje,
  destacado,
  onPress,
}: {
  mensaje: MensajeBandeja;
  destacado: boolean;
  onPress: () => void;
}) {
  const tipo = TIPO_MENSAJE[mensaje.tipo];

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card
        // El destacado va por el fondo y no por el borde: `cn` no resuelve
        // conflictos, y un color de borde general podria tapar el del tipo.
        className={cn(
          'gap-2 border-l-4',
          tipo.borde,
          destacado && 'bg-primary-50 dark:bg-primary-950',
        )}
      >
        <View className="flex-row items-center gap-2">
          <Icon as={tipo.icono} size={16} className={tipo.texto} />
          <Text variant="caption" className={cn('flex-1 font-semibold uppercase', tipo.texto)}>
            {tipo.etiqueta}
          </Text>
          {!mensaje.leido && (
            <View
              className="h-2.5 w-2.5 rounded-full bg-primary-500"
              accessibilityLabel="No leido"
            />
          )}
        </View>

        <Text variant="heading" className={cn(mensaje.leido && 'font-normal')}>
          {mensaje.titulo}
        </Text>
        <Text variant="body">{mensaje.cuerpo}</Text>
        <Text variant="caption">{formatDateTime(mensaje.fechaRecepcion)}</Text>
      </Card>
    </Pressable>
  );
}
