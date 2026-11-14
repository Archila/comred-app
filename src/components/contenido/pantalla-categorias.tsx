import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { CalendarClock, CalendarDays, HardHat, Siren, TriangleAlert, type LucideIcon } from 'lucide-react-native';
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
  resumirJornadas,
  resumirProyectos,
  useCategoriasContenido,
  useIncidentesPublicos,
  useJornadasPublicas,
  useProyectosPublicos,
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
 * Pantalla de tarjetas de una seccion (Plan Maestro, 5.1, 6, 7, 8.3 y 10):
 * tarjetas grandes con foto e icono, de media pantalla cada una, para que se
 * vean unas dos a la vez y se descubran las demas deslizando.
 *
 * Las tarjetas con algo vigente lo dicen en su esquina: en Reportes los
 * incidentes abiertos, y en rojo si hay alerta oficial (5.3); en Jornadas las
 * proximas o en desarrollo; en Proyectos las obras en ejecucion.
 */
export function PantallaCategorias({ seccion }: { seccion: SeccionConVisor }) {
  const presentacion = PRESENTACION_SECCION[seccion];
  const router = useRouter();
  const brand = useBrandColors();
  const [alto, setAlto] = useState(0);

  const categorias = useCategoriasContenido(seccion);
  const { marcas, refrescar: refrescarMarcas } = useMarcasDeTarjetas(seccion);

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
            marca={marcas[item.id]}
            onPress={() => router.push(`/${presentacion.slug}/${item.id}` as Href)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={categorias.isRefetching}
            onRefresh={() => {
              void categorias.refetch();
              refrescarMarcas();
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

/** Lo que una tarjeta anuncia en su esquina superior. */
interface MarcaTarjeta {
  etiqueta: string;
  icono: LucideIcon;
  fondo: string;
  texto: string;
}

/** "1 incidente activo" / "3 incidentes activos". */
function contar(cantidad: number, singular: string, plural: string): string {
  return cantidad === 1 ? `1 ${singular}` : `${cantidad} ${plural}`;
}

/**
 * Marca de cada tarjeta segun lo vigente en ella. Sale de los listados de
 * entidades, que no dependen de la sesion; Boletines y Brigadas no tienen.
 *
 * El tope del API son 50, lo mas reciente: lo cerrado o finalizado no marca
 * la tarjeta, y lo antiguo suele estarlo.
 */
function useMarcasDeTarjetas(seccion: SeccionConVisor): {
  marcas: Record<string, MarcaTarjeta>;
  refrescar: () => void;
} {
  const incidentes = useIncidentesPublicos({ limit: 50 }, seccion === 'REPORTES');
  const jornadas = useJornadasPublicas({ limit: 50 }, seccion === 'JORNADAS');
  const proyectos = useProyectosPublicos({ limit: 50 }, seccion === 'PROYECTOS');

  const marcas: Record<string, MarcaTarjeta> = {};

  if (seccion === 'REPORTES') {
    for (const [id, resumen] of Object.entries(resumirIncidentes(incidentes.data?.items))) {
      marcas[id] = resumen.alertaOficial
        ? { etiqueta: 'Alerta oficial', icono: Siren, fondo: 'bg-danger-500', texto: 'text-white' }
        : {
            etiqueta: contar(resumen.activos, 'incidente activo', 'incidentes activos'),
            icono: TriangleAlert,
            fondo: 'bg-warning-100',
            texto: 'text-warning-700',
          };
    }
  } else if (seccion === 'JORNADAS') {
    for (const [id, resumen] of Object.entries(resumirJornadas(jornadas.data?.items))) {
      // Lo que esta ocurriendo ahora pesa mas que lo que viene.
      marcas[id] =
        resumen.enDesarrollo > 0
          ? {
              etiqueta: 'En desarrollo',
              icono: CalendarClock,
              fondo: 'bg-success-100',
              texto: 'text-success-700',
            }
          : {
              etiqueta: contar(resumen.proximas, 'próxima', 'próximas'),
              icono: CalendarDays,
              fondo: 'bg-secondary-100',
              texto: 'text-secondary-600',
            };
    }
  } else if (seccion === 'PROYECTOS') {
    for (const [id, enEjecucion] of Object.entries(resumirProyectos(proyectos.data?.items))) {
      marcas[id] = {
        etiqueta: `${enEjecucion} en ejecución`,
        icono: HardHat,
        fondo: 'bg-success-100',
        texto: 'text-success-700',
      };
    }
  }

  return {
    marcas,
    refrescar: () => {
      if (seccion === 'REPORTES') void incidentes.refetch();
      if (seccion === 'JORNADAS') void jornadas.refetch();
      if (seccion === 'PROYECTOS') void proyectos.refetch();
    },
  };
}

function Tarjeta({
  categoria,
  presentacion,
  alto,
  marca,
  onPress,
}: {
  categoria: CategoriaContenido;
  presentacion: PresentacionSeccion;
  alto: number;
  marca?: MarcaTarjeta;
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

      {marca && (
        <View className="absolute right-3 top-3">
          <Etiqueta
            etiqueta={marca.etiqueta}
            icono={marca.icono}
            fondo={marca.fondo}
            texto={marca.texto}
          />
        </View>
      )}

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
