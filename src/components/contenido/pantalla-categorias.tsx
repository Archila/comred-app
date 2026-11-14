import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { Siren, TriangleAlert, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import {
  PRESENTACION_SECCION,
  iconoDeCategoria,
  type PresentacionSeccion,
  type SeccionConVisor,
} from '@/constants';
import {
  resumirIncidentes,
  useCategoriasContenido,
  useIncidentesPublicos,
  type ResumenIncidentes,
} from '@/hooks';
import { cn, resolveAssetUrl } from '@/lib';
import type { CategoriaContenido } from '@/models';
import { useBrandColors } from '@/store';

import { EmptyState } from '../feedback/empty-state';
import { ErrorState } from '../feedback/error-state';
import { LoadingScreen } from '../feedback/loading-screen';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import { Etiqueta } from './etiqueta';

const MARGEN = 16;
const SEPARACION = 12;
/** En una pantalla muy baja, dos tarjetas por pantalla quedarian ilegibles. */
const ALTO_MINIMO = 180;

/**
 * Pantalla de tarjetas de una seccion (Plan Maestro, 5.1 y 6): tarjetas
 * grandes con foto e icono, de media pantalla cada una, para que se vean unas
 * dos a la vez y se descubran las demas deslizando.
 *
 * En Reportes, ademas, las tarjetas con incidentes abiertos lo dicen, y con
 * una alerta oficial, en rojo (5.3).
 */
export function PantallaCategorias({ seccion }: { seccion: SeccionConVisor }) {
  const presentacion = PRESENTACION_SECCION[seccion];
  const router = useRouter();
  const brand = useBrandColors();
  const [alto, setAlto] = useState(0);

  const categorias = useCategoriasContenido(seccion);
  // El tope del API son 50: los incidentes mas recientes. Los cerrados no
  // marcan la tarjeta y los antiguos suelen estarlo.
  const incidentes = useIncidentesPublicos({ limit: 50 }, seccion === 'REPORTES');
  const resumen = resumirIncidentes(incidentes.data?.items);

  const altoTarjeta = Math.max(ALTO_MINIMO, Math.floor((alto - MARGEN * 2 - SEPARACION) / 2));

  let contenido;
  if (categorias.isPending) {
    contenido = <LoadingScreen />;
  } else if (categorias.isError) {
    contenido = <ErrorState error={categorias.error} onRetry={() => void categorias.refetch()} />;
  } else if (categorias.data.length === 0) {
    contenido = (
      <EmptyState
        icon={presentacion.icono}
        title="Sin categorías"
        description="Aún no se han configurado categorías para esta sección."
      />
    );
  } else {
    contenido = alto > 0 && (
      <FlatList
        data={categorias.data}
        keyExtractor={(categoria) => categoria.id}
        contentContainerStyle={{ padding: MARGEN, gap: SEPARACION }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Tarjeta
            categoria={item}
            presentacion={presentacion}
            alto={altoTarjeta}
            resumen={resumen[item.id]}
            onPress={() => router.push(`/${presentacion.slug}/${item.id}` as Href)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={categorias.isRefetching}
            onRefresh={() => {
              void categorias.refetch();
              if (seccion === 'REPORTES') void incidentes.refetch();
            }}
            colors={[brand.primary]}
            tintColor={brand.primary}
          />
        }
      />
    );
  }

  return (
    <View
      className="flex-1 bg-surface-muted dark:bg-surface-dark"
      onLayout={(evento) => setAlto(Math.floor(evento.nativeEvent.layout.height))}
    >
      {contenido}
    </View>
  );
}

function Tarjeta({
  categoria,
  presentacion,
  alto,
  resumen,
  onPress,
}: {
  categoria: CategoriaContenido;
  presentacion: PresentacionSeccion;
  alto: number;
  resumen?: ResumenIncidentes;
  onPress: () => void;
}) {
  const portada = resolveAssetUrl(categoria.portadaUrl);
  const icono = iconoDeCategoria(categoria, presentacion.icono);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={categoria.nombre}
      accessibilityHint="Abre las publicaciones de esta categoría"
      onPress={onPress}
      style={{ height: alto }}
      className="overflow-hidden rounded-card bg-secondary-500 active:opacity-90"
    >
      {portada ? (
        <Image
          source={{ uri: portada }}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          contentFit="cover"
          transition={200}
          recyclingKey={categoria.id}
        />
      ) : (
        // Sin foto: el icono en grande, como marca de agua sobre el azul.
        <View className="absolute inset-0 items-center justify-center">
          <Icon as={icono} size={alto * 0.45} className="text-secondary-foreground opacity-20" />
        </View>
      )}

      {/* Velo para que el texto blanco se lea sobre cualquier foto. */}
      <View className="absolute inset-0 bg-black/35" />
      <View className="absolute bottom-0 left-0 right-0 h-1/2 bg-black/30" />

      {resumen && <EstadoTarjeta resumen={resumen} />}

      <View className="flex-1 justify-end gap-2 p-4">
        <IconoCirculo icono={icono} presentacion={presentacion} />
        <Text variant="plain" className="text-2xl font-bold leading-7 text-white" numberOfLines={2}>
          {categoria.nombre}
        </Text>
        {categoria.descripcion && (
          <Text variant="plain" className="text-sm text-white/90" numberOfLines={2}>
            {categoria.descripcion}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function IconoCirculo({
  icono,
  presentacion,
}: {
  icono: LucideIcon;
  presentacion: PresentacionSeccion;
}) {
  return (
    <View
      className={cn('h-12 w-12 items-center justify-center rounded-full', presentacion.fondoIcono)}
    >
      <Icon as={icono} size={24} className={presentacion.textoIcono} />
    </View>
  );
}

/** Esquina superior: alerta oficial en rojo, o cuantos incidentes siguen abiertos. */
function EstadoTarjeta({ resumen }: { resumen: ResumenIncidentes }) {
  return (
    <View className="absolute right-3 top-3">
      {resumen.alertaOficial ? (
        <Etiqueta etiqueta="Alerta oficial" icono={Siren} fondo="bg-danger-500" texto="text-white" />
      ) : (
        <Etiqueta
          etiqueta={resumen.activos === 1 ? '1 incidente activo' : `${resumen.activos} incidentes activos`}
          icono={TriangleAlert}
          fondo="bg-warning-100"
          texto="text-warning-700"
        />
      )}
    </View>
  );
}
