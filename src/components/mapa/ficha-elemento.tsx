import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Navigation, Newspaper, Phone, X } from 'lucide-react-native';
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESTADO_ELEMENTO, iconoDeCapa } from '@/constants';
import { useElementoGeografico } from '@/hooks';
import { formatDate, formatDateOnly, formatNumber, resolveAssetUrl } from '@/lib';
import type { Bbox, VinculoElemento } from '@/models';

import { abrirUbicacion } from '../contenido/acciones';
import { ErrorState } from '../feedback/error-state';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Insignia } from '../ui/insignia';
import { Text } from '../ui/text';

/** Seccion de la app donde vive lo vinculado: el visor de su tarjeta. */
const SLUG_DE_VINCULO: Record<VinculoElemento['tipo'], string> = {
  INCIDENTE: 'reportes',
  JORNADA: 'jornadas',
  PROYECTO: 'proyectos',
};

/** Alto del boton flotante del menu (56) mas su margen y un respiro. */
const ESPACIO_BOTON_MENU = 84;

/**
 * Ficha que se abre al tocar una figura (Plan Maestro, 9.3): nombre, tipo,
 * estado, descripcion, comunidad, foto, fuente y fecha de actualizacion, con
 * "Como llegar" y "Ver publicaciones".
 *
 * Flota sobre el boton del menu para no quedar tapada por el.
 */
export function FichaElemento({
  id,
  onCerrar,
  onEncuadrar,
}: {
  id: string;
  onCerrar: () => void;
  onEncuadrar: (caja: Bbox) => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: elemento, isLoading, error, refetch } = useElementoGeografico(id);

  const estado = elemento?.estado ? ESTADO_ELEMENTO[elemento.estado] : null;
  const foto = resolveAssetUrl(elemento?.fotoUrl);
  const detalles = elemento
    ? [
        elemento.comunidad && `Comunidad: ${elemento.comunidad}`,
        elemento.direccion && `Dirección: ${elemento.direccion}`,
        elemento.capacidad != null && `Capacidad: ${formatNumber(elemento.capacidad)} personas`,
      ].filter(Boolean)
    : [];

  return (
    <View
      style={{ bottom: insets.bottom + ESPACIO_BOTON_MENU, elevation: 8 }}
      className="absolute left-3 right-3 max-h-[55%] rounded-card bg-surface shadow-lg dark:bg-surface-dark-muted"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar ficha"
        onPress={onCerrar}
        hitSlop={12}
        className="absolute right-3 top-3 z-10 h-8 w-8 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface-dark-sunken"
      >
        <Icon as={X} size={18} />
      </Pressable>

      {isLoading ? (
        <View className="items-center p-8">
          <ActivityIndicator />
        </View>
      ) : error || !elemento ? (
        <View className="h-56">
          <ErrorState error={error} onRetry={() => void refetch()} title="No se pudo abrir" />
        </View>
      ) : (
        <ScrollView contentContainerClassName="gap-3 p-4">
          <View className="flex-row items-center gap-2 pr-10">
            <View
              style={{ backgroundColor: elemento.categoria.color }}
              className="h-7 w-7 items-center justify-center rounded-full"
            >
              <Icon
                as={iconoDeCapa(elemento.categoria)}
                size={14}
                color="#FFFFFF"
                className="text-white"
              />
            </View>
            <Text variant="label">{elemento.categoria.nombre}</Text>
          </View>

          <Text variant="heading" className="pr-10">
            {elemento.nombre}
          </Text>
          {estado && <Insignia {...estado} />}

          {foto && (
            <Image
              source={{ uri: foto }}
              style={{ width: '100%', height: 160, borderRadius: 12 }}
              contentFit="cover"
            />
          )}

          {elemento.descripcion && <Text>{elemento.descripcion}</Text>}
          {detalles.map((linea) => (
            <Text key={String(linea)} variant="subtitle">
              {linea}
            </Text>
          ))}

          {/* Plan Maestro 9.3: las capas de amenaza dicen de donde salen. */}
          {elemento.fuente && (
            <Text variant="caption">
              Fuente: {elemento.fuente}
              {elemento.fechaFuente ? ` (${formatDateOnly(elemento.fechaFuente)})` : ''}
            </Text>
          )}
          <Text variant="caption">Actualizado el {formatDate(elemento.actualizado)}</Text>

          <View className="flex-row flex-wrap gap-2">
            {elemento.latitud != null && elemento.longitud != null && (
              <Button
                label="Cómo llegar"
                icon={Navigation}
                size="sm"
                onPress={() =>
                  void abrirUbicacion(elemento.latitud!, elemento.longitud!, elemento.nombre)
                }
              />
            )}
            {elemento.vinculo && (
              <Button
                label="Ver publicaciones"
                icon={Newspaper}
                size="sm"
                variant="outline"
                onPress={() => {
                  const { tipo, categoriaContenidoId } = elemento.vinculo!;
                  router.push(`/${SLUG_DE_VINCULO[tipo]}/${categoriaContenidoId}` as Href);
                }}
              />
            )}
            {elemento.telefono && (
              <Button
                label="Llamar"
                icon={Phone}
                size="sm"
                variant="outline"
                onPress={() => void Linking.openURL(`tel:${elemento.telefono}`)}
              />
            )}
            {elemento.bbox && elemento.tipoGeometria !== 'PUNTO' && (
              <Button
                label="Ver completo"
                size="sm"
                variant="ghost"
                onPress={() => onEncuadrar(elemento.bbox!)}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
