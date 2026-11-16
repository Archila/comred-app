import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Eye,
  ImagePlus,
  Images,
  LayoutGrid,
  Lock,
  Send,
  TextAlignStart,
  Trash,
  TriangleAlert,
  Type,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { PRESENTACION_SECCION, type SeccionConVisor } from '@/constants';
import { useCategoriasContenido, useCrearPublicacion, type BorradorPublicacion } from '@/hooks';
import {
  CALIDAD_IMAGEN,
  MAX_IMAGENES_PUBLICACION,
  MAX_MB_IMAGEN,
  cn,
  comprimirImagen,
  elegirImagenes,
  formatNumber,
  motivoDeRechazo,
} from '@/lib';
import type { CategoriaContenido, ImagenComprimida } from '@/models';
import { usePuedeCrearContenido } from '@/store';

import { EmptyState } from '../feedback/empty-state';
import { ErrorState } from '../feedback/error-state';
import { LoadingScreen } from '../feedback/loading-screen';
import { Screen } from '../layout/screen';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Icon } from '../ui/icon';
import { Input } from '../ui/input';
import { Text } from '../ui/text';

/**
 * Nueva publicacion desde el telefono, para administradores.
 *
 * Arriba se redacta (tarjeta, titulo, descripcion y fotos) y abajo se ve como
 * quedara en el visor, mientras se escribe: no hay un paso de confirmacion
 * aparte porque la vista previa ya lo es. Al publicar se vuelve al visor de
 * la tarjeta elegida, donde aparece la publicacion recien creada.
 *
 * Las fotos se comprimen al elegirlas (`comprimirImagen`), no al publicar:
 * asi la espera se reparte y la vista previa ya muestra lo que se subira.
 */

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// `CreatePublicacionDto` admite 5000 caracteres de descripcion; aqui se pide
// algo que se lea de un vistazo en el visor. El resto, en el panel.
const TITULO = { min: 3, max: 150 };
const DESCRIPCION = { min: 3, max: 1000 };

type CampoFormulario = 'categoriaContenidoId' | 'titulo' | 'descripcion' | 'imagenes';
type Errores = Partial<Record<CampoFormulario, string>>;

function validar(borrador: BorradorPublicacion): Errores {
  const errores: Errores = {};
  const titulo = borrador.titulo.trim().length;
  const descripcion = borrador.descripcion.trim().length;

  if (!borrador.categoriaContenidoId) errores.categoriaContenidoId = 'Elige dónde se publicará.';
  if (titulo < TITULO.min || titulo > TITULO.max) {
    errores.titulo = `El título debe tener entre ${TITULO.min} y ${TITULO.max} caracteres.`;
  }
  if (descripcion < DESCRIPCION.min || descripcion > DESCRIPCION.max) {
    errores.descripcion = `La descripción debe tener entre ${DESCRIPCION.min} y ${formatNumber(DESCRIPCION.max)} caracteres.`;
  }
  if (borrador.imagenes.length === 0) errores.imagenes = 'Agrega al menos una imagen.';

  return errores;
}

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export function PantallaNuevaPublicacion({ seccion }: { seccion: SeccionConVisor }) {
  const puedeCrear = usePuedeCrearContenido();
  const categorias = useCategoriasContenido(seccion);

  // La ruta ya va en `Stack.Protected`; esto cubre el instante en que la
  // sesion cambia con la pantalla abierta.
  if (!puedeCrear) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={Lock}
          title="Solo administradores"
          description="Para crear publicaciones inicia sesión con una cuenta de administrador."
        />
      </Screen>
    );
  }

  if (categorias.isPending) return <LoadingScreen message="Cargando..." />;
  if (categorias.isError) {
    return <ErrorState error={categorias.error} onRetry={() => void categorias.refetch()} />;
  }
  if (categorias.data.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={LayoutGrid}
          title="Sin categorías"
          description="Esta sección aún no tiene categorías. Créalas desde el panel para poder publicar."
        />
      </Screen>
    );
  }

  return <Formulario seccion={seccion} categorias={categorias.data} />;
}

function borradorVacio(
  seccion: SeccionConVisor,
  categorias: CategoriaContenido[],
  sugerida?: string,
): BorradorPublicacion {
  // Desde el visor llega la tarjeta que se estaba viendo; si solo hay una,
  // preguntarla no aporta nada.
  const inicial = categorias.find((c) => c.id === sugerida)?.id ?? (categorias.length === 1 ? categorias[0].id : '');
  return { seccion, categoriaContenidoId: inicial, titulo: '', descripcion: '', imagenes: [] };
}

function Formulario({
  seccion,
  categorias,
}: {
  seccion: SeccionConVisor;
  categorias: CategoriaContenido[];
}) {
  const router = useRouter();
  const presentacion = PRESENTACION_SECCION[seccion];
  const { categoriaId } = useLocalSearchParams<{ categoriaId?: string }>();

  const [borrador, setBorrador] = useState(() => borradorVacio(seccion, categorias, categoriaId));
  const [errores, setErrores] = useState<Errores>({});
  const [procesando, setProcesando] = useState(false);
  const [avisoImagenes, setAvisoImagenes] = useState<string | null>(null);

  const crear = useCrearPublicacion();
  const ocupado = procesando || crear.isPending;
  const tarjeta = categorias.find((c) => c.id === borrador.categoriaContenidoId);

  function actualizar(cambios: Partial<BorradorPublicacion>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    // El error de un campo desaparece en cuanto se toca.
    setErrores((actuales) => {
      const siguientes = { ...actuales };
      for (const campo of Object.keys(cambios) as CampoFormulario[]) delete siguientes[campo];
      return siguientes;
    });
  }

  async function seleccionarImagenes() {
    const restantes = MAX_IMAGENES_PUBLICACION - borrador.imagenes.length;
    if (restantes <= 0 || ocupado) return;

    setAvisoImagenes(null);
    const rechazos: string[] = [];

    try {
      const elegidas = await elegirImagenes(restantes);
      if (elegidas.length === 0) return;

      setProcesando(true);
      const nuevas: ImagenComprimida[] = [];
      // Una a una y no en paralelo: cada foto descomprimida ocupa decenas de
      // MB, y diez a la vez tumban a un telefono modesto.
      for (const asset of elegidas) {
        const motivo = motivoDeRechazo(asset);
        if (motivo) {
          rechazos.push(motivo);
          continue;
        }
        try {
          nuevas.push(await comprimirImagen(asset.uri));
        } catch {
          rechazos.push(`${asset.fileName ?? 'Una imagen'}: no se pudo procesar.`);
        }
      }

      if (nuevas.length > 0) {
        setBorrador((actual) => ({
          ...actual,
          imagenes: [...actual.imagenes, ...nuevas].slice(0, MAX_IMAGENES_PUBLICACION),
        }));
        setErrores((actuales) => ({ ...actuales, imagenes: undefined }));
      }
    } catch {
      rechazos.push('No se pudo abrir la galería. Revisa los permisos de la app.');
    } finally {
      setProcesando(false);
      if (rechazos.length > 0) setAvisoImagenes(rechazos.join('\n'));
    }
  }

  function quitarImagen(id: string) {
    actualizar({ imagenes: borrador.imagenes.filter((imagen) => imagen.id !== id) });
  }

  function limpiar() {
    crear.reset();
    setErrores({});
    setAvisoImagenes(null);
    setBorrador(borradorVacio(seccion, categorias, categoriaId));
  }

  function publicar() {
    // `isPending` ya deshabilita el boton; esto cubre el doble toque que llega
    // antes de que React vuelva a pintar. Dos toques serian dos publicaciones.
    if (crear.isPending) return;

    const encontrados = validar(borrador);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    crear.mutate(borrador, {
      // Al visor de la tarjeta: si ya estaba debajo, se vuelve a el en vez de
      // apilar otro; volver atras no debe dejar el formulario listo para
      // publicarlo otra vez.
      onSuccess: () =>
        router.dismissTo(`/${presentacion.slug}/${borrador.categoriaContenidoId}` as Href),
    });
  }

  const etiquetaPublicar =
    crear.fase === 'subiendo'
      ? 'Subiendo imágenes...'
      : crear.fase === 'publicando'
        ? 'Publicando...'
        : `Publicar en ${presentacion.titulo}`;

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-5 pb-28">
      <View className="gap-1">
        <Text variant="title" className="text-2xl">
          Publicar en {presentacion.titulo}
        </Text>
        <Text variant="subtitle">Crea una nueva publicación para esta sección.</Text>
      </View>

      <Card className="gap-6">
        <Campo
          icono={LayoutGrid}
          titulo="Categoría"
          ayuda="La tarjeta bajo la que aparecerá la publicación."
          error={errores.categoriaContenidoId}
        >
          <View className="flex-row flex-wrap gap-2">
            {categorias.map((categoria) => (
              <Chip
                key={categoria.id}
                etiqueta={categoria.nombre}
                seleccionado={borrador.categoriaContenidoId === categoria.id}
                deshabilitado={crear.isPending}
                onPress={() => actualizar({ categoriaContenidoId: categoria.id })}
              />
            ))}
          </View>
        </Campo>

        <Campo icono={Type} titulo="Texto en letras grandes (Título)">
          <Input
            placeholder="Escribe el título de la publicación..."
            maxLength={TITULO.max}
            value={borrador.titulo}
            onChangeText={(titulo) => actualizar({ titulo })}
            error={errores.titulo}
            hint={`${borrador.titulo.length} / ${TITULO.max}`}
            editable={!crear.isPending}
          />
        </Campo>

        <Campo icono={TextAlignStart} titulo="Texto en letras pequeñas (Descripción)">
          <Input
            placeholder="Escribe la descripción o información detallada..."
            multiline
            maxLength={DESCRIPCION.max}
            value={borrador.descripcion}
            onChangeText={(descripcion) => actualizar({ descripcion })}
            error={errores.descripcion}
            hint={`${formatNumber(borrador.descripcion.length)} / ${formatNumber(DESCRIPCION.max)}`}
            editable={!crear.isPending}
          />
        </Campo>

        <Campo
          icono={Images}
          titulo="Imágenes"
          ayuda={`Puedes subir varias imágenes (máx. ${MAX_IMAGENES_PUBLICACION}). Formatos: JPG, JPEG, PNG (máx. ${MAX_MB_IMAGEN} MB por imagen). La primera es la portada.`}
          error={errores.imagenes}
        >
          <ZonaSeleccion
            cantidad={borrador.imagenes.length}
            procesando={procesando}
            deshabilitado={crear.isPending}
            onSeleccionar={() => void seleccionarImagenes()}
          />
          {avisoImagenes && <MensajeError texto={avisoImagenes} />}
          {borrador.imagenes.length > 0 && (
            <Miniaturas
              imagenes={borrador.imagenes}
              deshabilitado={crear.isPending}
              onQuitar={quitarImagen}
            />
          )}
        </Campo>
      </Card>

      <View className="flex-row items-center gap-3 rounded-card border border-secondary-300 bg-secondary-500 px-4 py-3">
        <Icon as={ArrowDown} size={20} className="text-secondary-foreground dark:text-secondary-foreground" />
        <Text variant="plain" className="flex-1 text-base font-semibold text-secondary-foreground">
          La vista previa de la publicación se muestra abajo
        </Text>
      </View>

      <VistaPrevia
        titulo={borrador.titulo.trim()}
        descripcion={borrador.descripcion.trim()}
        imagenes={borrador.imagenes}
        ubicacion={[presentacion.titulo, tarjeta?.nombre].filter(Boolean).join(' › ')}
      />

      {crear.errorMessage && <MensajeError texto={crear.errorMessage} />}

      <View className="gap-3">
        <Button
          label={etiquetaPublicar}
          icon={Send}
          size="lg"
          fullWidth
          loading={crear.isPending}
          disabled={procesando}
          onPress={publicar}
        />
        <Button
          label="Limpiar formulario"
          icon={Trash}
          variant="outline"
          size="lg"
          fullWidth
          disabled={ocupado}
          onPress={limpiar}
        />
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas del formulario                                                       */
/* -------------------------------------------------------------------------- */

function Campo({
  icono,
  titulo,
  ayuda,
  error,
  children,
}: {
  icono: LucideIcon;
  titulo: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <Icon as={icono} size={24} className="text-primary-500 dark:text-primary-500" />
        <View className="flex-1 gap-0.5">
          <Text variant="body" className="font-semibold">
            {titulo} <Text variant="plain" className="text-primary-500">*</Text>
          </Text>
          {ayuda && <Text variant="caption">{ayuda}</Text>}
        </View>
      </View>
      {children}
      {error && <Text variant="error">{error}</Text>}
    </View>
  );
}

function Chip({
  etiqueta,
  seleccionado,
  deshabilitado,
  onPress,
}: {
  etiqueta: string;
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
      className={cn(
        'min-h-10 justify-center rounded-full border px-4 py-2',
        seleccionado
          ? 'border-primary-500 bg-primary-500'
          : 'border-line-strong bg-surface active:bg-surface-sunken dark:border-line-dark-strong dark:bg-surface-dark dark:active:bg-surface-dark-sunken',
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

function ZonaSeleccion({
  cantidad,
  procesando,
  deshabilitado,
  onSeleccionar,
}: {
  cantidad: number;
  procesando: boolean;
  deshabilitado: boolean;
  onSeleccionar: () => void;
}) {
  const llena = cantidad >= MAX_IMAGENES_PUBLICACION;

  return (
    <View className="items-center gap-3 rounded-card border-2 border-dashed border-line-strong bg-surface-sunken px-4 py-6 dark:border-line-dark-strong dark:bg-surface-dark-sunken">
      <Icon as={CloudUpload} size={36} className="text-content-muted dark:text-content-dark-muted" />
      <Text variant="body" className="text-center">
        {llena ? 'Llegaste al máximo de imágenes' : 'Selecciona aquí tus imágenes desde la galería'}
      </Text>
      <Button
        label={procesando ? 'Optimizando imágenes...' : 'Seleccionar imágenes'}
        icon={ImagePlus}
        loading={procesando}
        disabled={llena || deshabilitado}
        onPress={onSeleccionar}
      />
      <Text variant="caption" className="text-center">
        {cantidad} de {MAX_IMAGENES_PUBLICACION} · Se optimizan al {Math.round(CALIDAD_IMAGEN * 100)} % de
        calidad para que suban rápido
      </Text>
    </View>
  );
}

const COLUMNAS = 3;
const SEPARACION_MINIATURAS = 8;

function Miniaturas({
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

/* -------------------------------------------------------------------------- */
/* Vista previa                                                                */
/* -------------------------------------------------------------------------- */

function VistaPrevia({
  titulo,
  descripcion,
  imagenes,
  ubicacion,
}: {
  titulo: string;
  descripcion: string;
  imagenes: ImagenComprimida[];
  ubicacion: string;
}) {
  return (
    <Card className="gap-4">
      <View className="gap-0.5">
        <View className="flex-row items-center gap-2">
          <Icon as={Eye} size={22} />
          <Text variant="heading">Vista previa de la publicación</Text>
        </View>
        <Text variant="caption">Así se verá en {ubicacion}.</Text>
      </View>

      <CarruselPrevia imagenes={imagenes} />

      <View className="gap-2">
        <Text
          variant="plain"
          className={cn(
            'text-2xl font-bold leading-8',
            titulo ? 'text-content dark:text-content-dark-default' : 'text-content-subtle dark:text-content-dark-subtle',
          )}
        >
          {titulo || 'Título de la publicación'}
        </Text>
        <Text
          variant="plain"
          className={cn(
            'text-base leading-6',
            descripcion
              ? 'text-content-muted dark:text-content-dark-muted'
              : 'text-content-subtle dark:text-content-dark-subtle',
          )}
        >
          {descripcion ||
            'Aquí se mostrará la descripción de la publicación con la información detallada para la población.'}
        </Text>
      </View>
    </Card>
  );
}

/**
 * Galeria de la vista previa. Como en el visor, la foto se ve entera sobre
 * una copia desenfocada: lo que se ve aqui es lo que vera la poblacion.
 */
function CarruselPrevia({ imagenes }: { imagenes: ImagenComprimida[] }) {
  const lista = useRef<FlatList<ImagenComprimida>>(null);
  const [ancho, setAncho] = useState(0);
  const [actual, setActual] = useState(0);
  const alto = Math.round(ancho * 0.62);
  // Al quitar fotos el indice puede quedar fuera de la lista.
  const indice = Math.min(actual, Math.max(imagenes.length - 1, 0));

  function ir(destino: number) {
    if (destino < 0 || destino >= imagenes.length) return;
    lista.current?.scrollToIndex({ index: destino, animated: true });
    setActual(destino);
  }

  function alTerminarDeslizar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    if (ancho > 0) setActual(Math.round(evento.nativeEvent.contentOffset.x / ancho));
  }

  return (
    <View className="gap-3">
      <View
        className="overflow-hidden rounded-card bg-surface-sunken dark:bg-surface-dark-sunken"
        style={{ height: alto || undefined }}
        onLayout={(evento) => setAncho(evento.nativeEvent.layout.width)}
      >
        {imagenes.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-2 p-6" style={{ minHeight: 160 }}>
            <Icon as={Images} size={36} className="text-content-subtle dark:text-content-dark-subtle" />
            <Text variant="caption" className="text-center">
              Aquí se verán tus imágenes
            </Text>
          </View>
        ) : (
          ancho > 0 && (
            <FlatList
              ref={lista}
              data={imagenes}
              keyExtractor={(imagen) => imagen.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={alTerminarDeslizar}
              getItemLayout={(_, i) => ({ length: ancho, offset: ancho * i, index: i })}
              renderItem={({ item }) => (
                <View style={{ width: ancho, height: alto }} className="bg-black">
                  <Image
                    source={{ uri: item.uri }}
                    style={{ position: 'absolute', width: ancho, height: alto, opacity: 0.55 }}
                    contentFit="cover"
                    blurRadius={24}
                  />
                  <Image source={{ uri: item.uri }} style={{ width: ancho, height: alto }} contentFit="contain" />
                </View>
              )}
            />
          )
        )}

        {imagenes.length > 1 && (
          <>
            <Flecha icono={ChevronLeft} lado="izquierda" visible={indice > 0} onPress={() => ir(indice - 1)} />
            <Flecha
              icono={ChevronRight}
              lado="derecha"
              visible={indice < imagenes.length - 1}
              onPress={() => ir(indice + 1)}
            />
          </>
        )}
      </View>

      {imagenes.length > 1 && (
        <View className="flex-row justify-center gap-2">
          {imagenes.map((imagen, i) => (
            <View
              key={imagen.id}
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                i === indice ? 'bg-primary-500' : 'bg-line-strong dark:bg-line-dark-strong',
              )}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function Flecha({
  icono,
  lado,
  visible,
  onPress,
}: {
  icono: LucideIcon;
  lado: 'izquierda' | 'derecha';
  visible: boolean;
  onPress: () => void;
}) {
  if (!visible) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={lado === 'izquierda' ? 'Imagen anterior' : 'Imagen siguiente'}
      hitSlop={8}
      onPress={onPress}
      className={cn(
        'absolute top-1/2 -mt-5 h-10 w-10 items-center justify-center rounded-full bg-surface/90 active:opacity-70',
        lado === 'izquierda' ? 'left-2' : 'right-2',
      )}
    >
      <Icon as={icono} size={22} className="text-content dark:text-content" />
    </Pressable>
  );
}

function MensajeError({ texto }: { texto: string }) {
  return (
    <View className="flex-row gap-2 rounded-field border border-danger-500 bg-danger-50 p-3 dark:bg-danger-500/10">
      <Icon as={TriangleAlert} size={18} className="text-danger-600 dark:text-danger-500" />
      <Text variant="error" className="flex-1">
        {texto}
      </Text>
    </View>
  );
}
