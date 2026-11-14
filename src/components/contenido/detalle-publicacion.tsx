import {
  CalendarClock,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Flag,
  Landmark,
  MapPin,
  Phone,
  Share2,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { vars } from 'nativewind';
import { useMemo, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VERIFICACION_INCIDENTE } from '@/constants';
import { formatDate, formatDateOnly, formatDateTime } from '@/lib';
import type { Publicacion } from '@/models';
import { useBrandVars } from '@/store';

import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import {
  abrirDocumento,
  abrirUbicacion,
  compartirPublicacion,
  comunidadDe,
  diasDe,
  entidadDe,
  ubicacionDe,
} from './acciones';
import { BarraAvance } from './barra-avance';
import { InsigniasPublicacion } from './insignias-publicacion';

/**
 * Hoja con todo lo de una publicacion: descripcion completa, datos del
 * incidente, la jornada o el proyecto, y documentos. Es el "Ver mas" y la
 * "informacion adicional
 * desplegable" del Plan Maestro (3.3); el visor solo muestra el resumen para
 * que la foto siga siendo protagonista.
 *
 * Es un `Modal`, y los modales se montan en otra ventana: no heredan las
 * variables de color de `BrandingProvider`. Por eso se vuelven a aplicar aqui.
 */
export function DetallePublicacion({
  publicacion,
  tarjeta,
  onCerrar,
}: {
  publicacion: Publicacion | null;
  tarjeta?: string;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const brandVars = useBrandVars();
  const estiloMarca = useMemo(() => vars(brandVars), [brandVars]);

  return (
    <Modal
      visible={publicacion !== null}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <View style={estiloMarca} className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          onPress={onCerrar}
          className="absolute inset-0 bg-black/50"
        />

        {publicacion && (
          <View
            className="max-h-[88%] rounded-t-3xl bg-surface dark:bg-surface-dark"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <View className="flex-row items-center gap-2 px-4 pb-2 pt-3">
              <View className="flex-1">
                <InsigniasPublicacion publicacion={publicacion} tarjeta={tarjeta} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={10}
                onPress={onCerrar}
                className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken active:opacity-70 dark:bg-surface-dark-muted"
              >
                <Icon as={X} size={20} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerClassName="gap-4 px-4 pb-4"
              showsVerticalScrollIndicator={false}
            >
              <Contenido publicacion={publicacion} />
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
}

function Contenido({ publicacion }: { publicacion: Publicacion }) {
  const { incidente, jornada, proyecto } = publicacion;
  const entidad = entidadDe(publicacion);
  const comunidad = comunidadDe(publicacion);
  const responsable = publicacion.dependencia ?? proyecto?.dependencia;
  const ubicacion = ubicacionDe(publicacion);
  const documentos = publicacion.media.filter((archivo) => archivo.tipo === 'DOCUMENTO');
  const verificacion = incidente ? VERIFICACION_INCIDENTE[incidente.verificacion] : null;
  const actualizada =
    publicacion.fechaActualizacion &&
    formatDate(publicacion.fechaActualizacion) !== formatDate(publicacion.fechaPublicacion)
      ? formatDate(publicacion.fechaActualizacion)
      : null;

  return (
    <>
      <View className="gap-1">
        {entidad && entidad.nombre !== publicacion.titulo && (
          <Text variant="label">{entidad.nombre}</Text>
        )}
        <Text variant="title" className="text-2xl">
          {publicacion.titulo}
        </Text>
      </View>

      {verificacion && <Text variant="subtitle">{verificacion.descripcion}</Text>}

      <View className="gap-2">
        {incidente && (
          <Dato icono={TriangleAlert} etiqueta="Reportado" valor={formatDateTime(incidente.fechaReporte)} />
        )}
        {jornada && (
          <>
            {/* Sin horario escrito, la hora de inicio es el unico dato que hay. */}
            <Dato
              icono={CalendarDays}
              etiqueta="Fecha"
              valor={jornada.horario ? diasDe(jornada) : formatDateTime(jornada.fechaInicio)}
            />
            {jornada.horario && <Dato icono={Clock} etiqueta="Horario" valor={jornada.horario} />}
            {jornada.lugar && <Dato icono={MapPin} etiqueta="Lugar" valor={jornada.lugar} />}
            {jornada.institucion && (
              <Dato icono={Users} etiqueta="Organiza" valor={jornada.institucion} />
            )}
            {jornada.contacto && <Dato icono={Phone} etiqueta="Contacto" valor={jornada.contacto} />}
          </>
        )}
        {proyecto && (
          <>
            {proyecto.fechaInicio && (
              <Dato icono={CalendarDays} etiqueta="Inicio" valor={formatDateOnly(proyecto.fechaInicio)} />
            )}
            {proyecto.fechaFinPrevista && (
              <Dato
                icono={Flag}
                etiqueta="Finalización prevista"
                valor={formatDateOnly(proyecto.fechaFinPrevista)}
              />
            )}
          </>
        )}
        <Dato
          icono={CalendarClock}
          etiqueta={publicacion.seccion === 'BOLETINES' ? 'Emitido' : 'Publicado'}
          valor={formatDateTime(publicacion.fechaPublicacion)}
        />
        {actualizada && <Dato icono={CalendarClock} etiqueta="Última actualización" valor={actualizada} />}
        {responsable && <Dato icono={Landmark} etiqueta="Responsable" valor={responsable} />}
        {comunidad && (
          <Dato
            icono={MapPin}
            etiqueta={jornada ? 'Comunidad beneficiada' : 'Comunidad'}
            valor={comunidad}
          />
        )}
      </View>

      {/* Solo con dato comprobado: sin el no hay barra, que no es lo mismo que 0 %. */}
      {proyecto?.avance != null && <BarraAvance avance={proyecto.avance} />}

      {publicacion.descripcion && <Text variant="body">{publicacion.descripcion}</Text>}

      {jornada && (
        <>
          {jornada.descripcion && jornada.descripcion !== publicacion.descripcion && (
            <Bloque titulo="Sobre la jornada">
              <Text variant="body">{jornada.descripcion}</Text>
            </Bloque>
          )}
          {jornada.servicios && (
            <Bloque titulo="Servicios disponibles" icono={Stethoscope}>
              <Text variant="body">{jornada.servicios}</Text>
            </Bloque>
          )}
          {jornada.requisitos && (
            <Bloque titulo="Requisitos" icono={ClipboardList}>
              <Text variant="body">{jornada.requisitos}</Text>
            </Bloque>
          )}
        </>
      )}

      {proyecto?.descripcion && proyecto.descripcion !== publicacion.descripcion && (
        <Bloque titulo="Sobre el proyecto">
          <Text variant="body">{proyecto.descripcion}</Text>
        </Bloque>
      )}

      {incidente && (
        <>
          {incidente.descripcion && incidente.descripcion !== publicacion.descripcion && (
            <Bloque titulo="Sobre el incidente">
              <Text variant="body">{incidente.descripcion}</Text>
            </Bloque>
          )}
          {incidente.recomendaciones && (
            <Bloque titulo="Recomendaciones de seguridad" icono={ShieldCheck} destacado>
              <Text variant="body">{incidente.recomendaciones}</Text>
            </Bloque>
          )}
          {incidente.afectaciones && (
            <Bloque titulo="Afectaciones verificadas">
              <Text variant="body">{incidente.afectaciones}</Text>
            </Bloque>
          )}
          {incidente.instituciones && (
            <Bloque titulo="Instituciones participantes" icono={Users}>
              <Text variant="body">{incidente.instituciones}</Text>
            </Bloque>
          )}
        </>
      )}

      {documentos.length > 0 && (
        <Bloque titulo="Documentos" icono={FileText}>
          <View className="gap-2">
            {documentos.map((documento) => (
              <Pressable
                key={documento.id}
                accessibilityRole="link"
                onPress={() => void abrirDocumento(documento.url)}
                className="flex-row items-center gap-3 rounded-field border border-line p-3 active:bg-surface-sunken dark:border-line-dark dark:active:bg-surface-dark-muted"
              >
                <Icon as={FileText} size={20} className="text-primary-500" />
                <Text variant="body" className="flex-1" numberOfLines={2}>
                  {documento.titulo ?? 'Documento adjunto'}
                </Text>
                <Icon as={ChevronRight} size={18} className="text-content-subtle" />
              </Pressable>
            ))}
          </View>
        </Bloque>
      )}

      <View className="gap-2">
        {ubicacion && (
          <Button
            label="Ver ubicación en el mapa"
            icon={MapPin}
            variant="outline"
            fullWidth
            onPress={() =>
              void abrirUbicacion(ubicacion.latitud, ubicacion.longitud, ubicacion.etiqueta)
            }
          />
        )}
        <Button
          label="Compartir"
          icon={Share2}
          variant="secondary"
          fullWidth
          onPress={() => void compartirPublicacion(publicacion)}
        />
      </View>
    </>
  );
}

function Dato({ icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Icon as={icono} size={16} className="mt-0.5 text-content-subtle dark:text-content-dark-subtle" />
      <Text variant="body" className="flex-1 text-sm">
        <Text variant="plain" className="text-sm font-semibold text-content dark:text-content-dark-default">
          {etiqueta}:{' '}
        </Text>
        {valor}
      </Text>
    </View>
  );
}

function Bloque({
  titulo,
  icono,
  destacado = false,
  children,
}: {
  titulo: string;
  icono?: LucideIcon;
  /** Las recomendaciones de seguridad van resaltadas: es lo que hay que hacer. */
  destacado?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className={
        destacado
          ? 'gap-2 rounded-card border border-warning-500 bg-warning-50 p-3 dark:bg-warning-500/10'
          : 'gap-2'
      }
    >
      <View className="flex-row items-center gap-2">
        {icono && (
          <Icon
            as={icono}
            size={18}
            className={destacado ? 'text-warning-700 dark:text-warning-500' : undefined}
          />
        )}
        <Text variant="heading" className="text-base">
          {titulo}
        </Text>
      </View>
      {children}
    </View>
  );
}
