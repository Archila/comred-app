import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import {
  CalendarClock,
  CalendarDays,
  Camera,
  HardHat,
  Siren,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import {
  PRESENTACION_SECCION,
  iconoDeCategoria,
  portadaFijaDe,
  type PresentacionSeccion,
  type SeccionConVisor,
} from '@/constants';
import {
  resumirIncidentes,
  resumirJornadas,
  resumirProyectos,
  useCambiarPortada,
  useCategoriasContenido,
  useIncidentesPublicos,
  useJornadasPublicas,
  useProyectosPublicos,
} from '@/hooks';
import { cn, resolveAssetUrl } from '@/lib';
import type { CategoriaContenido } from '@/models';
import { useBrandColors, usePuedeCrearContenido } from '@/store';

import { EmptyState } from '../feedback/empty-state';
import { ErrorState } from '../feedback/error-state';
import { LoadingScreen } from '../feedback/loading-screen';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import { BotonNuevaPublicacion } from './boton-nueva-publicacion';
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
  const puedeCrear = usePuedeCrearContenido();
  const [alto, setAlto] = useState(0);

  const categorias = useCategoriasContenido(seccion);
  const { marcas, refrescar: refrescarMarcas } = useMarcasDeTarjetas(seccion);
  const portada = useCambiarPortada();

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
        // Solo para administradores; a los demas no les ocupa sitio.
        ListHeaderComponent={
          puedeCrear ? (
            <AccionesAdministrador
              seccion={seccion}
              errorPortada={portada.errorMessage}
              // Si todas las fotos son fijas (Boletines), no hay camara que explicar.
              conCamara={categorias.data.some((categoria) => !portadaFijaDe(categoria))}
            />
          ) : undefined
        }
        renderItem={({ item }) => (
          <Tarjeta
            categoria={item}
            presentacion={presentacion}
            alto={altoTarjeta}
            marca={marcas[item.id]}
            onPress={() => router.push(`/${presentacion.slug}/${item.id}` as Href)}
            onCambiarPortada={
              puedeCrear && !portadaFijaDe(item) ? () => portada.mutate(item.id) : undefined
            }
            cambiandoPortada={portada.isPending && portada.variables === item.id}
            ocupado={portada.isPending}
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
    <View className="flex-1 bg-surface-muted dark:bg-surface-dark">
      <TituloSeccion presentacion={presentacion} />
      {/* El alto que se mide es el que queda bajo el titulo: dos tarjetas en el. */}
      <View className="flex-1" onLayout={(evento) => setAlto(Math.floor(evento.nativeEvent.layout.height))}>
        {contenido}
      </View>
    </View>
  );
}

/**
 * Titulo de la seccion en una pastilla: icono de la seccion, separador y
 * nombre. Sustituye a la barra del Stack en esta pantalla; el visor la
 * conserva, con su flecha para volver aqui.
 */
function TituloSeccion({ presentacion }: { presentacion: PresentacionSeccion }) {
  return (
    <View className="items-center px-4 pt-4">
      <View
        accessibilityRole="header"
        className="max-w-full flex-row items-center gap-3 rounded-full border-2 border-secondary-300 bg-secondary-600 py-2 pl-2 pr-6"
      >
        <View className={cn('h-12 w-14 items-center justify-center rounded-2xl', presentacion.fondoIcono)}>
          <Icon as={presentacion.icono} size={28} className={presentacion.textoIcono} />
        </View>
        <View className="h-8 w-px bg-secondary-300" />
        <Text
          variant="plain"
          className="shrink text-2xl font-bold text-secondary-foreground"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {presentacion.titulo}
        </Text>
      </View>
    </View>
  );
}

/**
 * Lo que solo ve un administrador sobre las tarjetas. En Reportes lo primero
 * es registrar el desastre; publicar sobre uno ya registrado va despues.
 */
function AccionesAdministrador({
  seccion,
  errorPortada,
  conCamara,
}: {
  seccion: SeccionConVisor;
  errorPortada: string | null;
  conCamara: boolean;
}) {
  const router = useRouter();

  return (
    <View className="gap-3">
      {seccion === 'REPORTES' && (
        <Button
          label="Reportar desastre"
          icon={Siren}
          size="lg"
          fullWidth
          onPress={() => router.push('/reportes/reportar' as Href)}
        />
      )}
      <BotonNuevaPublicacion
        seccion={seccion}
        variante={seccion === 'REPORTES' ? 'outline' : 'primary'}
      />
      {conCamara && (
        <Text variant="caption" className="text-center">
          Toca la cámara de una tarjeta para cambiar su fotografía.
        </Text>
      )}
      {errorPortada && (
        <Text variant="error" className="text-center">
          {errorPortada}
        </Text>
      )}
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
  onCambiarPortada,
  cambiandoPortada = false,
  ocupado = false,
}: {
  categoria: CategoriaContenido;
  presentacion: PresentacionSeccion;
  alto: number;
  marca?: MarcaTarjeta;
  onPress: () => void;
  /** Solo para administradores: sin el, no hay boton de camara. */
  onCambiarPortada?: () => void;
  cambiandoPortada?: boolean;
  /** Otra tarjeta esta cambiando su foto: una a la vez. */
  ocupado?: boolean;
}) {
  // La foto fija (tipos de boletin) manda sobre la que se haya subido.
  const fija = portadaFijaDe(categoria);
  const remota = resolveAssetUrl(categoria.portadaUrl);
  const portada = fija ?? (remota ? { uri: remota } : undefined);
  const icono = iconoDeCategoria(categoria, presentacion.icono);
  const brand = useBrandColors();

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
          source={portada}
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

      {onCambiarPortada && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cambiar la fotografía de ${categoria.nombre}`}
          hitSlop={8}
          disabled={ocupado}
          onPress={onCambiarPortada}
          className={cn(
            'absolute left-3 top-3 h-11 w-11 items-center justify-center rounded-full bg-black/60 active:opacity-70',
            ocupado && !cambiandoPortada && 'opacity-50',
          )}
        >
          {cambiandoPortada ? (
            <ActivityIndicator color={brand.primary} />
          ) : (
            <Icon as={Camera} size={20} className="text-white dark:text-white" />
          )}
        </Pressable>
      )}

      <View className="flex-1 justify-end gap-3 p-5">
        <IconoCirculo icono={icono} presentacion={presentacion} />
        <Text variant="plain" className="text-3xl font-bold leading-9 text-white" numberOfLines={2}>
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
      className={cn('h-16 w-16 items-center justify-center rounded-full', presentacion.fondoIcono)}
    >
      <Icon as={icono} size={32} className={presentacion.textoIcono} />
    </View>
  );
}
