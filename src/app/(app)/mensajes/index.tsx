import { useRouter } from 'expo-router';
import { Eye, Lock, Megaphone, Plus, Users, type LucideIcon } from 'lucide-react-native';
import { useMemo, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Insignia,
  LoadingScreen,
  Screen,
  Text,
} from '@/components';
import { ESTADO_MENSAJE, TIPO_MENSAJE } from '@/constants';
import { enCurso, useCapacidadesEnvio, useHistorialMensajes } from '@/hooks';
import { cn, formatDateTime, formatNumber } from '@/lib';
import type { MensajeHistorial } from '@/models';
import { useBrandColors } from '@/store';

/**
 * Avisos enviados por la municipalidad, con su estado y cuantos los leyeron.
 *
 * Es la entrada de la pestana: desde aqui se redacta uno nuevo (si el rol
 * puede enviar) y se abre el detalle de cada uno. La pestana la ve quien
 * puede enviar O quien puede ver el historial —el rol "Consulta" solo mira—,
 * asi que cada mitad se muestra segun su permiso.
 */
export default function AvisosEnviadosScreen() {
  const { data: capacidades, isLoading } = useCapacidadesEnvio();

  if (isLoading || !capacidades) return <LoadingScreen message="Cargando..." />;

  const nuevo = capacidades.puedeEnviar ? <BotonNuevo /> : null;

  if (!capacidades.puedeVerHistorial) {
    return (
      <Screen edges={['bottom']} contentClassName="gap-4">
        {nuevo}
        <EmptyState
          icon={Lock}
          title="Historial no disponible"
          description="Tu rol puede enviar avisos, pero no ver los enviados. Si lo necesitas, pidelo a un administrador."
        />
      </Screen>
    );
  }

  return <Historial cabecera={nuevo} />;
}

function BotonNuevo() {
  const router = useRouter();
  return (
    <Button
      label="Nuevo aviso"
      icon={Plus}
      size="lg"
      fullWidth
      onPress={() => router.push('/mensajes/nuevo')}
    />
  );
}

function Historial({ cabecera }: { cabecera: ReactNode }) {
  const router = useRouter();
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
  } = useHistorialMensajes({ limit: 20 });

  const mensajes = useMemo(() => data?.pages.flatMap((pagina) => pagina.items) ?? [], [data]);

  if (isLoading) return <LoadingScreen message="Cargando avisos enviados..." />;
  if (isError && mensajes.length === 0) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <Screen edges={['bottom']} contentClassName="p-0">
      <FlatList
        data={mensajes}
        keyExtractor={(mensaje) => mensaje.id}
        contentContainerClassName="grow gap-3 p-4"
        ListHeaderComponent={cabecera ? <View className="pb-1">{cabecera}</View> : null}
        ListEmptyComponent={
          <EmptyState
            icon={Megaphone}
            title="Aun no hay avisos enviados"
            description="Aqui veras cada aviso de tu municipalidad, si llego y quien lo leyo."
          />
        }
        renderItem={({ item }) => (
          <FilaMensaje
            mensaje={item}
            onPress={() => router.push({ pathname: '/mensajes/[id]', params: { id: item.id } })}
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

function FilaMensaje({ mensaje, onPress }: { mensaje: MensajeHistorial; onPress: () => void }) {
  const tipo = TIPO_MENSAJE[mensaje.tipo];
  const estado = ESTADO_MENSAJE[mensaje.estado];
  const repartiendo = enCurso(mensaje.estado);

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card className={cn('gap-2 border-l-4', tipo.borde)}>
        <View className="flex-row items-center gap-2">
          <Icon as={tipo.icono} size={16} className={tipo.texto} />
          <Text variant="caption" className={cn('flex-1 font-semibold uppercase', tipo.texto)}>
            {tipo.etiqueta}
          </Text>
          <Insignia etiqueta={estado.etiqueta} fondo={estado.fondo} texto={estado.texto} />
        </View>

        <Text variant="heading" numberOfLines={2}>
          {mensaje.titulo}
        </Text>

        <Text variant="caption">
          {formatDateTime(mensaje.fechaEnvio ?? mensaje.created_at)}
          {mensaje.enviadoPor ? ` - ${mensaje.enviadoPor.nombreCompleto}` : ''}
        </Text>

        {repartiendo ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator size="small" />
            <Text variant="caption">Repartiendo el aviso...</Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-4">
            <Dato icono={Users} texto={`${formatNumber(mensaje.totalDestinatarios)} telefonos`} />
            <Dato icono={Eye} texto={`${formatNumber(mensaje.totalLeidos)} lo leyeron`} />
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function Dato({ icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon as={icono} size={14} className="text-content-muted dark:text-content-dark-muted" />
      <Text variant="caption" className="text-content-muted dark:text-content-dark-muted">
        {texto}
      </Text>
    </View>
  );
}

