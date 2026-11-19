import { useRouter } from 'expo-router';
import { HandHeart, History, Megaphone, Newspaper, Phone, Plus, Siren } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import {
  BotonNuevaPublicacion,
  Button,
  Card,
  DetallePublicacion,
  EmptyState,
  ErrorState,
  Icon,
  TarjetaPublicacion,
  Text,
} from '@/components';
import { useCapacidadesEnvio, usePublicacionesPrincipales } from '@/hooks';
import { resolveAssetUrl, useVersionImagenes } from '@/lib';
import type { Publicacion } from '@/models';
import { useBrandColors, useOrganizacion } from '@/store';

/**
 * Pagina principal. Es publica: la ve cualquier vecino, con o sin sesion.
 *
 * Arriba la presentacion de la coordinacion y debajo las ultimas
 * publicaciones marcadas para el inicio (`paginaPrincipal`), de cualquier
 * seccion. Tocar una abre su detalle completo.
 */
export default function HomeScreen() {
  const brand = useBrandColors();
  const publicaciones = usePublicacionesPrincipales();
  const [detalle, setDetalle] = useState<Publicacion | null>(null);
  // Al recargar imagenes desde el menu cambia la URL de cada imagen
  // (`imagenesDe`); `extraData` hace que la lista vuelva a pintar las tarjetas.
  const versionImagenes = useVersionImagenes();

  return (
    <View className="flex-1 bg-surface dark:bg-surface-dark">
      <FlatList
        data={publicaciones.data ?? []}
        extraData={versionImagenes}
        keyExtractor={(publicacion) => publicacion.id}
        // Aire abajo para que el boton flotante del menu no tape la ultima.
        contentContainerStyle={{ padding: 16, paddingBottom: 112, gap: 16 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Encabezado />}
        renderItem={({ item }) => (
          <TarjetaPublicacion
            imagenes={imagenesDe(item)}
            titulo={item.titulo}
            descripcion={item.descripcion}
            detalle={[item.dependencia, item.comunidad].filter(Boolean).join(' · ')}
            maxLineas={4}
            onPress={() => setDetalle(item)}
          />
        )}
        ListEmptyComponent={
          publicaciones.isPending ? (
            <View className="items-center py-10">
              <ActivityIndicator color={brand.primary} />
            </View>
          ) : publicaciones.isError ? (
            <ErrorState error={publicaciones.error} onRetry={() => void publicaciones.refetch()} />
          ) : (
            <EmptyState
              icon={Newspaper}
              title="Aún no hay publicaciones"
              description="Aquí verás las últimas noticias y avisos de la coordinación."
            />
          )
        }
        ListFooterComponent={<TelefonoEmergencia />}
        refreshControl={
          <RefreshControl
            refreshing={publicaciones.isRefetching}
            onRefresh={() => void publicaciones.refetch()}
            colors={[brand.primary]}
            tintColor={brand.primary}
          />
        }
      />

      <DetallePublicacion publicacion={detalle} onCerrar={() => setDetalle(null)} />
    </View>
  );
}

/** Solo imagenes: el inicio no reproduce videos ni abre documentos. */
function imagenesDe(publicacion: Publicacion) {
  return publicacion.media
    .filter((archivo) => archivo.tipo === 'IMAGEN')
    .map((archivo) => ({ id: archivo.id, uri: resolveAssetUrl(archivo.url) ?? '' }))
    .filter((imagen) => imagen.uri);
}

function Encabezado() {
  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-card bg-primary-500">
          <Icon as={Siren} size={34} className="text-primary-foreground dark:text-primary-foreground" />
        </View>
        <View className="flex-1 gap-1">
          <Text variant="subtitle">Bienvenido</Text>
          <Text variant="plain" className="text-xl font-bold leading-7 text-content dark:text-content-dark-default">
            Información y prevención de riesgos
          </Text>
          <View className="h-1 w-20 rounded-full bg-primary-500" />
        </View>
      </View>

      <Card className="flex-row items-center gap-4">
        <Icon as={HandHeart} size={52} strokeWidth={1.5} />
        <View className="w-px self-stretch bg-line dark:bg-line-dark" />
        <View className="flex-1 gap-1">
          <Text variant="subtitle">Coordinación Municipal</Text>
          <Text variant="heading" className="text-xl">
            Gestión y reducción de riesgos
          </Text>
          <Text variant="label" className="font-normal">
            Información, prevención y atención de emergencias.
          </Text>
        </View>
      </Card>

      <AccesoAvisos />
      <BotonNuevaPublicacion seccion="GENERAL" />
    </View>
  );
}

/**
 * Acceso directo para quien envia avisos. En una emergencia no hay que
 * buscarlo en el menu: es lo primero que ve un coordinador al abrir la app.
 * A un vecino no le aparece.
 */
function AccesoAvisos() {
  const router = useRouter();
  const { data: capacidades } = useCapacidadesEnvio();

  if (!capacidades?.puedeEnviar && !capacidades?.puedeVerHistorial) return null;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-500">
          <Icon as={Megaphone} size={18} className="text-primary-foreground dark:text-primary-foreground" />
        </View>
        <View className="flex-1">
          <Text variant="heading">Avisos a la población</Text>
          <Text variant="caption">
            {capacidades.puedeEnviar
              ? 'Envía un aviso y revisa quién lo leyó.'
              : 'Revisa los avisos enviados y quién los leyó.'}
          </Text>
        </View>
      </View>

      {capacidades.puedeEnviar && (
        <Button
          label="Nuevo aviso"
          icon={Plus}
          size="lg"
          fullWidth
          onPress={() => router.push('/mensajes/nuevo')}
        />
      )}
      {capacidades.puedeVerHistorial && (
        <Button
          label="Ver avisos enviados"
          icon={History}
          variant="outline"
          fullWidth
          onPress={() => router.push('/mensajes')}
        />
      )}
    </Card>
  );
}

/** Al final de la lista: en una emergencia, el numero tiene que estar a mano. */
function TelefonoEmergencia() {
  const organizacion = useOrganizacion();
  if (!organizacion?.telefonoEmergencia) return null;

  return (
    <Card className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-500">
        <Icon as={Phone} size={18} className="text-primary-foreground dark:text-primary-foreground" />
      </View>
      <View className="flex-1">
        <Text variant="label">Teléfono de emergencia</Text>
        <Text variant="body">{organizacion.telefonoEmergencia}</Text>
      </View>
    </Card>
  );
}
