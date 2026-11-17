import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ArrowDown,
  Building,
  CalendarClock,
  CalendarX,
  CircleCheck,
  Eye,
  FileClock,
  Flag,
  House,
  Images,
  LayoutGrid,
  Link2,
  Lock,
  MapPin,
  Send,
  TextAlignStart,
  Trash,
  Type,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PRESENTACION_SECCION, type SeccionConVisor } from '@/constants';
import {
  useCategoriasContenido,
  useCrearPublicacion,
  useIncidentesPublicos,
  useJornadasPublicas,
  useProyectosPublicos,
  type BorradorPublicacion,
  type MomentoPublicacion,
} from '@/hooks';
import {
  MAX_IMAGENES_PUBLICACION,
  MAX_MB_IMAGEN,
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
import { SelectorFecha } from '../ui/selector-fecha';
import { Text } from '../ui/text';
import {
  Campo,
  Chip,
  Interruptor,
  MensajeError,
  MensajeExito,
  Miniaturas,
  OpcionRadio,
  TituloBloque,
  ZonaSeleccion,
} from './piezas-formulario';
import { PRIORIDADES, SelectorVisibilidad, sumarDias } from './opciones-publicacion';
import { TarjetaPublicacion } from './tarjeta-publicacion';

/**
 * Nueva publicacion desde el telefono, para administradores.
 *
 * Sirve para la pagina principal (`GENERAL`) y para cada seccion con visor.
 * Pide todo lo que admite `CreatePublicacionDto`, en tres bloques:
 *   1. Contenido: tarjeta, vinculo (incidente / jornada / proyecto), titulo,
 *      descripcion e imagenes. Es lo que se ve.
 *   2. Detalles: dependencia y comunidad. Opcionales.
 *   3. Opciones: pagina principal, cuando sale, cuando se retira, prioridad
 *      y quien la ve.
 * Debajo, la vista previa se actualiza mientras se escribe: no hay paso de
 * confirmacion aparte porque la vista previa ya lo es.
 *
 * Las fotos se comprimen al elegirlas (`comprimirImagen`), no al publicar:
 * asi la espera se reparte y la vista previa ya muestra lo que se subira.
 */

/** La pagina principal o una seccion con tarjetas. */
export type DestinoPublicacion = SeccionConVisor | 'GENERAL';

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// Los mismos limites que `CreatePublicacionDto`, salvo la descripcion: el API
// admite 5000, aqui se pide algo que se lea de un vistazo. El resto, en el panel.
const TITULO = { min: 3, max: 150 };
const DESCRIPCION = { min: 3, max: 1000 };
const TEXTO_CORTO = 150;

const MOMENTOS: { valor: MomentoPublicacion; etiqueta: string; descripcion: string; icono: LucideIcon }[] = [
  { valor: 'ahora', etiqueta: 'Publicar ahora', descripcion: 'Se ve en cuanto la publiques.', icono: Send },
  {
    valor: 'programada',
    etiqueta: 'Programar',
    descripcion: 'Aparece sola en la fecha y hora que elijas.',
    icono: CalendarClock,
  },
  {
    valor: 'borrador',
    etiqueta: 'Guardar como borrador',
    descripcion: 'No se ve en la app. Se termina y publica desde el panel.',
    icono: FileClock,
  },
];

type CampoFormulario =
  | 'categoriaContenidoId'
  | 'titulo'
  | 'descripcion'
  | 'dependencia'
  | 'comunidad'
  | 'imagenes'
  | 'fechaPublicacion'
  | 'fechaExpiracion'
  | 'grupo';
type Errores = Partial<Record<CampoFormulario, string>>;

function validar(borrador: BorradorPublicacion, conTarjeta: boolean): Errores {
  const errores: Errores = {};
  const titulo = borrador.titulo.trim().length;
  const descripcion = borrador.descripcion.trim().length;
  const ahora = new Date();

  if (conTarjeta && !borrador.categoriaContenidoId) {
    errores.categoriaContenidoId = 'Elige dónde se publicará.';
  }
  if (titulo < TITULO.min || titulo > TITULO.max) {
    errores.titulo = `El título debe tener entre ${TITULO.min} y ${TITULO.max} caracteres.`;
  }
  if (descripcion < DESCRIPCION.min || descripcion > DESCRIPCION.max) {
    errores.descripcion = `La descripción debe tener entre ${DESCRIPCION.min} y ${formatNumber(DESCRIPCION.max)} caracteres.`;
  }
  if (borrador.dependencia.trim().length > TEXTO_CORTO) {
    errores.dependencia = `Máximo ${TEXTO_CORTO} caracteres.`;
  }
  if (borrador.comunidad.trim().length > TEXTO_CORTO) {
    errores.comunidad = `Máximo ${TEXTO_CORTO} caracteres.`;
  }
  if (borrador.imagenes.length === 0) errores.imagenes = 'Agrega al menos una imagen.';

  if (borrador.momento === 'programada') {
    if (!borrador.fechaPublicacion) errores.fechaPublicacion = 'Elige cuándo se publicará.';
    else if (borrador.fechaPublicacion <= ahora) {
      errores.fechaPublicacion = 'La fecha ya pasó. Elige una futura o publica ahora.';
    }
  }

  if (borrador.fechaExpiracion) {
    const inicio =
      borrador.momento === 'programada' && borrador.fechaPublicacion ? borrador.fechaPublicacion : ahora;
    if (borrador.fechaExpiracion <= inicio) {
      errores.fechaExpiracion = 'Debe ser posterior a la publicación; si no, nunca se vería.';
    }
  }

  if (borrador.visibilidad === 'GRUPO' && !borrador.grupo) {
    errores.grupo = 'Elige qué grupo la verá.';
  }

  return errores;
}

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export function PantallaNuevaPublicacion({ seccion }: { seccion: DestinoPublicacion }) {
  const puedeCrear = usePuedeCrearContenido();
  const esInicio = seccion === 'GENERAL';
  // La pagina principal no tiene tarjetas: no se piden.
  const categorias = useCategoriasContenido(seccion, !esInicio && puedeCrear);

  // La ruta ya va protegida; esto cubre el instante en que la sesion cambia
  // con la pantalla abierta.
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

  if (esInicio) return <Formulario seccion={seccion} categorias={[]} />;

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
  seccion: DestinoPublicacion,
  categorias: CategoriaContenido[],
  sugerida?: string,
): BorradorPublicacion {
  // Desde el visor llega la tarjeta que se estaba viendo; si solo hay una,
  // preguntarla no aporta nada.
  const tarjeta =
    categorias.find((c) => c.id === sugerida)?.id ?? (categorias.length === 1 ? categorias[0].id : '');

  return {
    seccion,
    categoriaContenidoId: tarjeta,
    entidadId: '',
    titulo: '',
    descripcion: '',
    dependencia: '',
    comunidad: '',
    visibilidad: 'PUBLICA',
    grupo: null,
    momento: 'ahora',
    fechaPublicacion: null,
    fechaExpiracion: null,
    prioridad: 0,
    // Lo que se crea desde el inicio es del inicio.
    paginaPrincipal: seccion === 'GENERAL',
    imagenes: [],
  };
}

function Formulario({
  seccion,
  categorias,
}: {
  seccion: DestinoPublicacion;
  categorias: CategoriaContenido[];
}) {
  const router = useRouter();
  const { categoriaId } = useLocalSearchParams<{ categoriaId?: string }>();
  const esInicio = seccion === 'GENERAL';
  const presentacion = esInicio ? null : PRESENTACION_SECCION[seccion];
  const nombreDestino = presentacion?.titulo ?? 'la página principal';

  const [borrador, setBorrador] = useState(() => borradorVacio(seccion, categorias, categoriaId));
  const [errores, setErrores] = useState<Errores>({});
  const [procesando, setProcesando] = useState(false);
  const [avisoImagenes, setAvisoImagenes] = useState<string | null>(null);
  const [borradorGuardado, setBorradorGuardado] = useState(false);

  const crear = useCrearPublicacion();
  const ocupado = procesando || crear.isPending;
  const tarjeta = categorias.find((c) => c.id === borrador.categoriaContenidoId);

  function actualizar(cambios: Partial<BorradorPublicacion>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setBorradorGuardado(false);
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

    const encontrados = validar(borrador, !esInicio);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    crear.mutate(borrador, {
      onSuccess: () => {
        // Un borrador no se ve en la app: se confirma aqui y se deja el
        // formulario limpio para el siguiente.
        if (borrador.momento === 'borrador') {
          limpiar();
          setBorradorGuardado(true);
          return;
        }
        // Al sitio donde aparece. `dismissTo` vuelve al visor si ya estaba
        // debajo en vez de apilar otro: volver atras no debe dejar el
        // formulario listo para publicarlo otra vez.
        if (esInicio || !presentacion) router.navigate('/');
        else router.dismissTo(`/${presentacion.slug}/${borrador.categoriaContenidoId}` as Href);
      },
    });
  }

  const etiquetaPublicar =
    crear.fase === 'subiendo'
      ? 'Subiendo imágenes...'
      : crear.fase === 'publicando'
        ? 'Guardando...'
        : borrador.momento === 'borrador'
          ? 'Guardar borrador'
          : borrador.momento === 'programada'
            ? 'Programar publicación'
            : `Publicar en ${esInicio ? 'página principal' : nombreDestino}`;

  const enInicio = esInicio || borrador.paginaPrincipal;
  const ubicacionPrevia = enInicio
    ? 'la página principal'
    : [nombreDestino, tarjeta?.nombre].filter(Boolean).join(' › ');

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-5 pb-28">
      <View className="gap-1">
        <Text variant="title" className="text-2xl">
          {esInicio ? 'Publicaciones en página principal' : `Publicar en ${nombreDestino}`}
        </Text>
        <Text variant="subtitle">
          {esInicio
            ? 'Crea una nueva publicación para la página principal.'
            : 'Crea una nueva publicación para esta sección.'}
        </Text>
      </View>

      {/* 1. Contenido ----------------------------------------------------- */}
      <Card className="gap-6">
        {!esInicio && (
          <Campo
            icono={LayoutGrid}
            titulo="Categoría"
            requerido
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
                  // Los incidentes de otra tarjeta no sirven en esta.
                  onPress={() => actualizar({ categoriaContenidoId: categoria.id, entidadId: '' })}
                />
              ))}
            </View>
          </Campo>
        )}

        {!esInicio && borrador.categoriaContenidoId && (
          <SelectorEntidad
            seccion={seccion}
            categoriaId={borrador.categoriaContenidoId}
            seleccionada={borrador.entidadId}
            deshabilitado={crear.isPending}
            onCambiar={(entidadId) => actualizar({ entidadId })}
          />
        )}

        <Campo icono={Type} titulo="Texto en letras grandes (Título)" requerido>
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

        <Campo icono={TextAlignStart} titulo="Texto en letras pequeñas (Descripción)" requerido>
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
          requerido
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
              onQuitar={(id) => actualizar({ imagenes: borrador.imagenes.filter((i) => i.id !== id) })}
            />
          )}
        </Campo>
      </Card>

      {/* 2. Detalles ------------------------------------------------------ */}
      <Card className="gap-6">
        <TituloBloque titulo="Detalles" descripcion="Opcionales. Ayudan a ubicar la publicación." />

        <Campo icono={Building} titulo="Dependencia" ayuda="Quién emite la publicación.">
          <Input
            placeholder="Ej: COMRED, Dirección Municipal de Planificación"
            maxLength={TEXTO_CORTO}
            value={borrador.dependencia}
            onChangeText={(dependencia) => actualizar({ dependencia })}
            error={errores.dependencia}
            editable={!crear.isPending}
          />
        </Campo>

        <Campo icono={MapPin} titulo="Comunidad" ayuda="Lugar o comunidad a la que se refiere.">
          <Input
            placeholder="Ej: Aldea Las Majadas"
            maxLength={TEXTO_CORTO}
            value={borrador.comunidad}
            onChangeText={(comunidad) => actualizar({ comunidad })}
            error={errores.comunidad}
            editable={!crear.isPending}
          />
        </Campo>
      </Card>

      {/* 3. Opciones de publicacion -------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Opciones de publicación" />

        {esInicio ? (
          <View className="flex-row items-center gap-3 rounded-field border border-line bg-surface p-3 dark:border-line-dark dark:bg-surface-dark">
            <Icon as={House} size={22} className="text-primary-500 dark:text-primary-500" />
            <Text variant="caption" className="flex-1">
              Se mostrará en la página principal. El inicio enseña las 5 más recientes.
            </Text>
          </View>
        ) : (
          <Interruptor
            icono={House}
            etiqueta="Mostrar en la página principal"
            descripcion="Además de en su sección, sale en el inicio (las 5 más recientes)."
            activo={borrador.paginaPrincipal}
            deshabilitado={crear.isPending}
            onCambiar={(paginaPrincipal) => actualizar({ paginaPrincipal })}
          />
        )}

        <Campo icono={CalendarClock} titulo="¿Cuándo se publica?" error={errores.fechaPublicacion}>
          <View className="gap-2">
            {MOMENTOS.map((momento) => (
              <OpcionRadio
                key={momento.valor}
                icono={momento.icono}
                etiqueta={momento.etiqueta}
                descripcion={momento.descripcion}
                seleccionada={borrador.momento === momento.valor}
                deshabilitado={crear.isPending}
                onPress={() =>
                  actualizar({
                    momento: momento.valor,
                    // Volver a "ahora" descarta la fecha: no debe colarse.
                    fechaPublicacion: momento.valor === 'programada' ? borrador.fechaPublicacion : null,
                  })
                }
              />
            ))}
          </View>
          {borrador.momento === 'programada' && (
            <SelectorFecha
              valor={borrador.fechaPublicacion}
              minimo={new Date()}
              placeholder="Elige fecha y hora de publicación"
              deshabilitado={crear.isPending}
              onCambiar={(fechaPublicacion) => actualizar({ fechaPublicacion })}
            />
          )}
        </Campo>

        <Campo icono={CalendarX} titulo="Vencimiento" error={errores.fechaExpiracion}>
          <Interruptor
            etiqueta="Retirar automáticamente"
            descripcion="Deja de verse sola en una fecha. Útil para convocatorias y avisos de temporada."
            activo={borrador.fechaExpiracion !== null}
            deshabilitado={crear.isPending}
            onCambiar={(activo) =>
              actualizar({
                fechaExpiracion: activo
                  ? sumarDias(borrador.momento === 'programada' ? borrador.fechaPublicacion : null, 7)
                  : null,
              })
            }
          />
          {borrador.fechaExpiracion && (
            <SelectorFecha
              valor={borrador.fechaExpiracion}
              minimo={(borrador.momento === 'programada' && borrador.fechaPublicacion) || new Date()}
              placeholder="Elige hasta cuándo se verá"
              deshabilitado={crear.isPending}
              onCambiar={(fechaExpiracion) => actualizar({ fechaExpiracion })}
            />
          )}
        </Campo>

        <Campo icono={Flag} titulo="Prioridad" ayuda="Ordena la publicación dentro de su sección.">
          <View className="gap-2">
            {PRIORIDADES.map((prioridad) => (
              <OpcionRadio
                key={prioridad.valor}
                icono={prioridad.icono}
                etiqueta={prioridad.etiqueta}
                descripcion={prioridad.descripcion}
                seleccionada={borrador.prioridad === prioridad.valor}
                deshabilitado={crear.isPending}
                onPress={() => actualizar({ prioridad: prioridad.valor })}
              />
            ))}
          </View>
        </Campo>

        <SelectorVisibilidad
          visibilidad={borrador.visibilidad}
          grupo={borrador.grupo}
          error={errores.grupo}
          deshabilitado={crear.isPending}
          onCambiar={(cambios) => actualizar(cambios)}
        />
      </Card>

      {/* Vista previa ----------------------------------------------------- */}
      <View className="flex-row items-center gap-3 rounded-card border border-secondary-300 bg-secondary-500 px-4 py-3">
        <Icon as={ArrowDown} size={20} className="text-secondary-foreground dark:text-secondary-foreground" />
        <Text variant="plain" className="flex-1 text-base font-semibold text-secondary-foreground">
          La vista previa de la publicación se muestra abajo
        </Text>
      </View>

      <Card className="gap-4">
        <View className="gap-0.5">
          <View className="flex-row items-center gap-2">
            <Icon as={Eye} size={22} />
            <Text variant="heading">Vista previa de la publicación</Text>
          </View>
          <Text variant="caption">Así se verá en {ubicacionPrevia}.</Text>
        </View>
        <TarjetaPublicacion
          imagenes={borrador.imagenes}
          titulo={borrador.titulo.trim()}
          descripcion={borrador.descripcion.trim()}
          detalle={[borrador.dependencia.trim(), borrador.comunidad.trim()].filter(Boolean).join(' · ')}
          placeholderTitulo="Título de la publicación"
          placeholderDescripcion="Aquí se mostrará la descripción de la publicación con la información detallada para la población."
        />
      </Card>

      {crear.errorMessage && <MensajeError texto={crear.errorMessage} />}
      {borradorGuardado && (
        <MensajeExito
          icono={CircleCheck}
          texto="Borrador guardado. No se verá en la app hasta que lo publiques desde el panel."
        />
      )}

      <View className="gap-3">
        <Button
          label={etiquetaPublicar}
          icon={borrador.momento === 'borrador' ? FileClock : Send}
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
/* Vinculo con incidente, jornada o proyecto                                   */
/* -------------------------------------------------------------------------- */

const ENTIDAD_DE_SECCION: Partial<
  Record<SeccionConVisor, { titulo: string; ayuda: string; ninguna: string }>
> = {
  REPORTES: {
    titulo: 'Incidente',
    ayuda: 'Si la publicación cuenta un incidente concreto, vincúlala para seguirlo en el visor.',
    ninguna: 'Ningún incidente',
  },
  JORNADAS: {
    titulo: 'Jornada',
    ayuda: 'Vincúlala a la jornada que anuncia: la app mostrará su fecha, lugar y requisitos.',
    ninguna: 'Ninguna jornada',
  },
  PROYECTOS: {
    titulo: 'Proyecto',
    ayuda: 'Vincúlala al proyecto del que da seguimiento: la app mostrará su avance.',
    ninguna: 'Ningún proyecto',
  },
};

/**
 * Solo Reportes, Jornadas y Proyectos tienen entidad, y solo la de su seccion:
 * lo exige el API (`PUB-06-01`). Se listan las de la tarjeta elegida, porque
 * al vincular el API pone la tarjeta de la entidad.
 */
function SelectorEntidad({
  seccion,
  categoriaId,
  seleccionada,
  deshabilitado,
  onCambiar,
}: {
  seccion: SeccionConVisor;
  categoriaId: string;
  seleccionada: string;
  deshabilitado: boolean;
  onCambiar: (entidadId: string) => void;
}) {
  const filtro = { categoriaContenidoId: categoriaId, limit: 50 };
  // Las tres llamadas siempre (reglas de los hooks); solo una se ejecuta.
  const incidentes = useIncidentesPublicos(filtro, seccion === 'REPORTES');
  const jornadas = useJornadasPublicas(filtro, seccion === 'JORNADAS');
  const proyectos = useProyectosPublicos(filtro, seccion === 'PROYECTOS');

  const textos = ENTIDAD_DE_SECCION[seccion];
  if (!textos) return null;

  const consulta = seccion === 'REPORTES' ? incidentes : seccion === 'JORNADAS' ? jornadas : proyectos;
  const opciones = consulta.data?.items ?? [];

  return (
    <Campo icono={Link2} titulo={textos.titulo} ayuda={textos.ayuda}>
      {consulta.isPending ? (
        <Text variant="caption">Cargando...</Text>
      ) : opciones.length === 0 ? (
        <Text variant="caption">No hay ninguno registrado en esta categoría.</Text>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Chip
            etiqueta={textos.ninguna}
            seleccionado={seleccionada === ''}
            deshabilitado={deshabilitado}
            onPress={() => onCambiar('')}
          />
          {opciones.map((opcion) => (
            <Chip
              key={opcion.id}
              etiqueta={opcion.nombre}
              seleccionado={seleccionada === opcion.id}
              deshabilitado={deshabilitado}
              onPress={() => onCambiar(opcion.id)}
            />
          ))}
        </View>
      )}
    </Campo>
  );
}

