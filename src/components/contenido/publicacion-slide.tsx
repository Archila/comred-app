import {
  CalendarClock,
  CalendarDays,
  FileText,
  Landmark,
  Lock,
  MapPin,
  Share2,
  Siren,
  type LucideIcon,
} from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { formatDateTime } from '@/lib';
import type { Publicacion } from '@/models';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import {
  abrirDocumento,
  abrirUbicacion,
  compartirPublicacion,
  comunidadDe,
  cuandoEs,
  entidadDe,
  ubicacionDe,
} from './acciones';
import { BarraAvance } from './barra-avance';
import { GaleriaMedia } from './galeria-media';
import { esAlertaActiva, InsigniasPublicacion } from './insignias-publicacion';

/** Parte de la altura que se lleva la galeria. El resto es el texto. */
const PROPORCION_MEDIA = 0.52;

/** Altura del panel de color de una publicacion sin fotos. */
const PROPORCION_SIN_MEDIA = 0.28;

/**
 * Hueco a la derecha de la fila de acciones para el boton flotante del menu
 * (56 px + 16 de margen).
 */
const HUECO_BOTON_MENU = 76;

/**
 * Una publicacion a pantalla casi completa (Plan Maestro, 3.1 y 3.3): la
 * galeria arriba, protagonista, y debajo el resumen. Lo demas —descripcion
 * completa, recomendaciones, documentos— se abre con "Ver mas", para que
 * ningun texto largo empuje la foto fuera de la pantalla.
 *
 * El resumen cambia con lo que la publicacion cuenta: de un incidente, cuando
 * se reporto; de una jornada, cuando y donde es; de un proyecto, su avance.
 *
 * La descripcion se recorta al espacio que quede: en un telefono bajo se ven
 * menos lineas, pero las acciones siempre quedan a la vista.
 */
export const PublicacionSlide = memo(function PublicacionSlide({
  publicacion,
  tarjeta,
  ancho,
  alto,
  margenInferior,
  activa,
  iconoTarjeta,
  onVerMas,
}: {
  publicacion: Publicacion;
  tarjeta: string;
  ancho: number;
  alto: number;
  /** Inset seguro inferior: el visor llega hasta el borde de la pantalla. */
  margenInferior: number;
  activa: boolean;
  /** Para una publicacion sin fotos: el icono de su tarjeta. */
  iconoTarjeta: LucideIcon;
  onVerMas: (publicacion: Publicacion) => void;
}) {
  const visibles = publicacion.media.filter((archivo) => archivo.tipo !== 'DOCUMENTO');
  const documentos = publicacion.media.filter((archivo) => archivo.tipo === 'DOCUMENTO');
  const ubicacion = ubicacionDe(publicacion);
  const alerta = esAlertaActiva(publicacion);
  const { incidente, jornada, proyecto } = publicacion;
  const entidad = entidadDe(publicacion);
  const comunidad = comunidadDe(publicacion);
  // De una jornada importa el sitio exacto; del resto, comunidad y responsable.
  const lugar = (
    jornada
      ? [jornada.lugar, comunidad]
      : [comunidad, publicacion.dependencia ?? proyecto?.dependencia]
  )
    .filter(Boolean)
    .join(' · ');
  const hayLugar = Boolean(jornada?.lugar ?? comunidad);

  return (
    <View style={{ width: ancho, height: alto }} className="bg-surface dark:bg-surface-dark">
      {visibles.length > 0 ? (
        <GaleriaMedia
          media={visibles}
          ancho={ancho}
          alto={Math.round(alto * PROPORCION_MEDIA)}
          activa={activa}
        />
      ) : (
        // Solo texto: un panel con el icono de su tarjeta en vez de un hueco.
        <View
          style={{ height: Math.round(alto * PROPORCION_SIN_MEDIA) }}
          className="items-center justify-center bg-secondary-500"
        >
          <Icon as={iconoTarjeta} size={64} className="text-secondary-foreground opacity-80" />
        </View>
      )}

      {alerta && (
        <View className="absolute left-0 right-0 top-0 flex-row items-center justify-center gap-2 bg-danger-500 px-3 py-1.5">
          <Icon as={Siren} size={16} className="text-white" />
          <Text variant="plain" className="text-xs font-bold uppercase tracking-wide text-white">
            Alerta oficial
          </Text>
        </View>
      )}

      {/* Plan Maestro 8.3: lo interno se distingue de lo publico a simple vista. */}
      {publicacion.interna && !alerta && (
        <View className="absolute left-0 right-0 top-0 flex-row items-center justify-center gap-2 bg-secondary-700 px-3 py-1.5">
          <Icon as={Lock} size={14} className="text-white" />
          <Text variant="plain" className="text-xs font-bold uppercase tracking-wide text-white">
            Contenido interno
          </Text>
        </View>
      )}

      <View className="flex-1 gap-1.5 px-4 pt-3" style={{ paddingBottom: margenInferior + 16 }}>
        <InsigniasPublicacion publicacion={publicacion} tarjeta={tarjeta} />

        {entidad && entidad.nombre !== publicacion.titulo && (
          <Text variant="label" numberOfLines={1}>
            {entidad.nombre}
          </Text>
        )}
        <Text variant="heading" className="text-xl leading-6" numberOfLines={2}>
          {publicacion.titulo}
        </Text>

        {jornada ? (
          <Meta icono={CalendarDays} texto={cuandoEs(jornada)} />
        ) : (
          <Meta
            icono={CalendarClock}
            texto={
              incidente
                ? `Reportado ${formatDateTime(incidente.fechaReporte)}`
                : formatDateTime(publicacion.fechaPublicacion)
            }
          />
        )}
        {lugar !== '' && <Meta icono={hayLugar ? MapPin : Landmark} texto={lugar} />}
        {proyecto?.avance != null && <BarraAvance avance={proyecto.avance} compacta />}

        {/* Ocupa lo que sobre y recorta: nunca empuja las acciones. */}
        <View className="flex-1 overflow-hidden pt-1">
          {publicacion.descripcion && (
            <Text variant="body" className="text-sm leading-5">
              {publicacion.descripcion}
            </Text>
          )}
        </View>

        <View className="flex-row items-center gap-2" style={{ paddingRight: HUECO_BOTON_MENU }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onVerMas(publicacion)}
            className="h-10 justify-center rounded-full bg-secondary-500 px-4 active:opacity-80"
          >
            <Text variant="plain" className="text-sm font-semibold text-secondary-foreground">
              Ver más
            </Text>
          </Pressable>

          <Accion
            icono={Share2}
            etiqueta="Compartir"
            onPress={() => void compartirPublicacion(publicacion)}
          />
          {ubicacion && (
            <Accion
              icono={MapPin}
              etiqueta="Ver ubicación en el mapa"
              onPress={() =>
                void abrirUbicacion(ubicacion.latitud, ubicacion.longitud, ubicacion.etiqueta)
              }
            />
          )}
          {documentos.length > 0 && (
            <Accion
              icono={FileText}
              etiqueta="Abrir documento"
              // Con uno solo se abre directo; con varios, la lista del detalle.
              onPress={() =>
                documentos.length === 1
                  ? void abrirDocumento(documentos[0].url)
                  : onVerMas(publicacion)
              }
            />
          )}
        </View>
      </View>
    </View>
  );
});

function Meta({ icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon as={icono} size={14} className="text-content-subtle dark:text-content-dark-subtle" />
      <Text variant="caption" className="flex-1 text-[13px]" numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

/** Boton redondo de solo icono. La etiqueta es para el lector de pantalla. */
function Accion({
  icono,
  etiqueta,
  onPress,
}: {
  icono: LucideIcon;
  etiqueta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full bg-surface-sunken active:opacity-60 dark:bg-surface-dark-muted"
    >
      <Icon as={icono} size={19} />
    </Pressable>
  );
}
