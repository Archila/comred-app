import { Image } from 'expo-image';
import {
  Check,
  CloudUpload,
  FileText,
  ImagePlus,
  Paperclip,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { CALIDAD_IMAGEN, MAX_IMAGENES_PUBLICACION, cn, formatTamanoArchivo } from '@/lib';
import type { DocumentoElegido, ImagenComprimida } from '@/models';
import { useBrandColors } from '@/store';

import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Piezas del formulario de nueva publicacion. Viven aparte para que la
 * pantalla se lea como lo que es: que se pide y en que orden.
 */

/** Bloque con icono rojo, titulo, ayuda y error. `requerido` pinta el asterisco. */
export function Campo({
  icono,
  titulo,
  ayuda,
  error,
  requerido = false,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  ayuda?: string;
  error?: string;
  requerido?: boolean;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Icon as={icono} size={24} className="text-primary-500 dark:text-primary-500" />
        <View className="flex-1 gap-0.5">
          <Text variant="body" className="font-semibold">
            {titulo}
            {requerido && (
              <Text variant="plain" className="text-primary-500">
                {' *'}
              </Text>
            )}
          </Text>
          {ayuda && <Text variant="caption">{ayuda}</Text>}
        </View>
      </View>
      {children}
      {error && <Text variant="error">{error}</Text>}
    </View>
  );
}

/** Titulo de cada tarjeta del formulario. */
export function TituloBloque({ titulo, descripcion }: { titulo: string; descripcion?: string }) {
  return (
    <View className="gap-0.5 border-b border-line pb-3 dark:border-line-dark">
      <Text variant="heading">{titulo}</Text>
      {descripcion && <Text variant="caption">{descripcion}</Text>}
    </View>
  );
}

/** Opcion corta en forma de pastilla. Para listas de nombres (tarjetas, incidentes). */
export function Chip({
  etiqueta,
  seleccionado,
  deshabilitado = false,
  onPress,
}: {
  etiqueta: string;
  seleccionado: boolean;
  deshabilitado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado, disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      className={cn(
        'min-h-10 justify-center rounded-full border px-4 py-2',
        seleccionado
          ? 'border-primary-500 bg-primary-500'
          : 'border-line-strong bg-surface active:bg-surface-sunken dark:border-line-dark-strong dark:bg-surface-dark dark:active:bg-surface-dark-sunken',
        deshabilitado && 'opacity-60',
      )}
    >
      <Text
        variant="plain"
        className={cn(
          'text-sm font-semibold',
          seleccionado ? 'text-primary-foreground' : 'text-content dark:text-content-dark-default',
        )}
      >
        {etiqueta}
      </Text>
    </Pressable>
  );
}

/** Opcion con explicacion, para decisiones que conviene leer antes de elegir. */
export function OpcionRadio({
  etiqueta,
  descripcion,
  icono,
  seleccionada,
  deshabilitado = false,
  onPress,
}: {
  etiqueta: string;
  descripcion: string;
  icono?: LucideIcon;
  seleccionada: boolean;
  deshabilitado?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionada, disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-field border-2 p-3',
        seleccionada
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
          : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark',
        deshabilitado && 'opacity-60',
      )}
    >
      {icono && (
        <Icon
          as={icono}
          size={22}
          className={
            seleccionada
              ? 'text-primary-500 dark:text-primary-400'
              : 'text-content-muted dark:text-content-dark-muted'
          }
        />
      )}
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="font-semibold">
          {etiqueta}
        </Text>
        <Text variant="caption">{descripcion}</Text>
      </View>
      <View
        className={cn(
          'h-6 w-6 items-center justify-center rounded-full border-2',
          seleccionada ? 'border-primary-500 bg-primary-500' : 'border-line-strong dark:border-line-dark-strong',
        )}
      >
        {seleccionada && <Icon as={Check} size={14} className="text-primary-foreground dark:text-primary-foreground" />}
      </View>
    </Pressable>
  );
}

/** Si / no con explicacion. */
export function Interruptor({
  etiqueta,
  descripcion,
  icono,
  activo,
  deshabilitado = false,
  onCambiar,
}: {
  etiqueta: string;
  descripcion: string;
  icono?: LucideIcon;
  activo: boolean;
  deshabilitado?: boolean;
  onCambiar: (activo: boolean) => void;
}) {
  const brand = useBrandColors();

  return (
    <View className="flex-row items-center gap-3 rounded-field border border-line bg-surface p-3 dark:border-line-dark dark:bg-surface-dark">
      {icono && <Icon as={icono} size={22} className="text-primary-500 dark:text-primary-500" />}
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="font-semibold">
          {etiqueta}
        </Text>
        <Text variant="caption">{descripcion}</Text>
      </View>
      <Switch
        value={activo}
        onValueChange={onCambiar}
        disabled={deshabilitado}
        trackColor={{ true: brand.primary }}
        accessibilityLabel={etiqueta}
      />
    </View>
  );
}

export function MensajeError({ texto }: { texto: string }) {
  return (
    <View className="flex-row gap-2 rounded-field border border-danger-500 bg-danger-50 p-3 dark:bg-danger-500/10">
      <Icon as={TriangleAlert} size={18} className="text-danger-600 dark:text-danger-500" />
      <Text variant="error" className="flex-1">
        {texto}
      </Text>
    </View>
  );
}

export function MensajeExito({ icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <View className="flex-row gap-2 rounded-field border border-success-500 bg-success-50 p-3 dark:bg-success-500/10">
      <Icon as={icono} size={18} className="text-success-600 dark:text-success-500" />
      <Text variant="plain" className="flex-1 text-sm text-success-700 dark:text-success-500">
        {texto}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Imagenes                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Zona para elegir fotos de la galeria. Con `maximo` 1 (un boletin) habla en
 * singular y, ya elegida, el boton la cambia en vez de bloquearse.
 */
export function ZonaSeleccion({
  cantidad,
  procesando,
  deshabilitado,
  onSeleccionar,
  maximo = MAX_IMAGENES_PUBLICACION,
}: {
  cantidad: number;
  procesando: boolean;
  deshabilitado: boolean;
  onSeleccionar: () => void;
  maximo?: number;
}) {
  const unica = maximo === 1;
  const llena = cantidad >= maximo;
  const calidad = Math.round(CALIDAD_IMAGEN * 100);

  return (
    <View className="items-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-surface-sunken px-4 py-6 dark:border-line-dark-strong dark:bg-surface-dark-sunken">
      <Icon as={CloudUpload} size={36} className="text-content-muted dark:text-content-dark-muted" />
      <Text variant="body" className="text-center">
        {unica
          ? llena
            ? 'Fotografía elegida. Puedes cambiarla.'
            : 'Selecciona aquí la fotografía desde la galería'
          : llena
            ? 'Llegaste al máximo de imágenes'
            : 'Selecciona aquí tus imágenes desde la galería'}
      </Text>
      <Button
        label={
          procesando
            ? unica
              ? 'Optimizando imagen...'
              : 'Optimizando imágenes...'
            : unica
              ? llena
                ? 'Cambiar fotografía'
                : 'Seleccionar fotografía'
              : 'Seleccionar imágenes'
        }
        icon={ImagePlus}
        loading={procesando}
        disabled={(llena && !unica) || deshabilitado}
        onPress={onSeleccionar}
      />
      <Text variant="caption" className="text-center">
        {unica
          ? `Se optimiza al ${calidad} % de calidad para que suba rápido`
          : `${cantidad} de ${maximo} · Se optimizan al ${calidad} % de calidad para que suban rápido`}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Documentos                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * PDF adjunto: la zona para elegirlo o, ya elegido, su ficha con nombre y
 * peso. Es lo que la poblacion descarga desde el visor.
 */
export function ZonaDocumento({
  documento,
  maximoMb,
  deshabilitado,
  onSeleccionar,
  onQuitar,
}: {
  documento: DocumentoElegido | null;
  maximoMb: number;
  deshabilitado: boolean;
  onSeleccionar: () => void;
  onQuitar: () => void;
}) {
  if (!documento) {
    return (
      <View className="items-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-surface-sunken px-4 py-6 dark:border-line-dark-strong dark:bg-surface-dark-sunken">
        <Icon as={CloudUpload} size={36} className="text-content-muted dark:text-content-dark-muted" />
        <View className="items-center gap-0.5">
          <Text variant="body" className="text-center font-semibold">
            Selecciona el archivo PDF
          </Text>
          <Text variant="caption" className="text-center">
            Formato permitido: PDF (máx. {maximoMb} MB)
          </Text>
        </View>
        <Button label="Seleccionar archivo" icon={Paperclip} disabled={deshabilitado} onPress={onSeleccionar} />
      </View>
    );
  }

  const tamano = formatTamanoArchivo(documento.tamano);

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-3 rounded-field border border-line bg-surface p-3 dark:border-line-dark dark:bg-surface-dark">
        <View className="h-11 w-11 items-center justify-center rounded-field bg-primary-500">
          <Icon as={FileText} size={22} className="text-primary-foreground dark:text-primary-foreground" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="body" className="font-semibold" numberOfLines={2}>
            {documento.nombre}
          </Text>
          <Text variant="caption">{tamano ? `PDF · ${tamano}` : 'PDF'}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${documento.nombre}`}
          hitSlop={8}
          disabled={deshabilitado}
          onPress={onQuitar}
          className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken active:opacity-70 dark:bg-surface-dark-muted"
        >
          <Icon as={X} size={18} />
        </Pressable>
      </View>
      <Button
        label="Cambiar archivo"
        icon={Paperclip}
        variant="outline"
        size="sm"
        disabled={deshabilitado}
        onPress={onSeleccionar}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Tipo (mosaico)                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Una opcion grande con icono, dos por fila. Para elegir el tipo de lo que se
 * registra (desastre, boletin): pocas opciones que se reconocen por el dibujo.
 */
export function OpcionMosaico({
  nombre,
  icono,
  seleccionado,
  deshabilitado,
  onPress,
}: {
  nombre: string;
  icono: LucideIcon;
  seleccionado: boolean;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado, disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      style={{ width: '48.5%' }}
      className={cn(
        'min-h-28 items-center justify-center gap-2 rounded-card border-2 p-3',
        seleccionado
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
          : 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark',
        deshabilitado && !seleccionado && 'opacity-50',
      )}
    >
      <View
        className={cn(
          'h-12 w-12 items-center justify-center rounded-full',
          seleccionado ? 'bg-primary-500' : 'bg-surface-sunken dark:bg-surface-dark-sunken',
        )}
      >
        <Icon
          as={icono}
          size={24}
          className={
            seleccionado
              ? 'text-primary-foreground dark:text-primary-foreground'
              : 'text-primary-500 dark:text-primary-500'
          }
        />
      </View>
      <Text variant="body" className="text-center text-sm font-semibold" numberOfLines={2}>
        {nombre}
      </Text>
    </Pressable>
  );
}

const COLUMNAS = 3;
const SEPARACION_MINIATURAS = 8;

export function Miniaturas({
  imagenes,
  deshabilitado,
  onQuitar,
}: {
  imagenes: ImagenComprimida[];
  deshabilitado: boolean;
  onQuitar: (id: string) => void;
}) {
  const [ancho, setAncho] = useState(0);
  const lado = Math.floor((ancho - SEPARACION_MINIATURAS * (COLUMNAS - 1)) / COLUMNAS);

  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: SEPARACION_MINIATURAS }}
      onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}
    >
      {lado > 0 &&
        imagenes.map((imagen, indice) => (
          <View
            key={imagen.id}
            style={{ width: lado, height: lado }}
            className="overflow-hidden rounded-field border border-line bg-surface-sunken dark:border-line-dark dark:bg-surface-dark-sunken"
          >
            <Image
              source={{ uri: imagen.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
              accessibilityLabel={`Imagen ${indice + 1}`}
            />
            {indice === 0 && (
              <View className="absolute bottom-1.5 left-1.5 rounded-full bg-primary-500 px-2 py-0.5">
                <Text variant="plain" className="text-[10px] font-bold uppercase text-primary-foreground">
                  Portada
                </Text>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar imagen ${indice + 1}`}
              hitSlop={6}
              disabled={deshabilitado}
              onPress={() => onQuitar(imagen.id)}
              className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/60 active:opacity-70"
            >
              <Icon as={X} size={16} className="text-white dark:text-white" />
            </Pressable>
          </View>
        ))}
    </View>
  );
}
