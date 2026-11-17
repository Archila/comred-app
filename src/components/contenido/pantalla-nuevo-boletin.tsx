import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ArrowDown,
  Building,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Camera,
  CircleCheck,
  Eye,
  FileClock,
  FileText,
  Flag,
  House,
  LayoutGrid,
  Layers,
  Lock,
  MapPin,
  Paperclip,
  Send,
  TextAlignStart,
  Trash,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { PRESENTACION_SECCION, iconoDeCategoria } from '@/constants';
import { useCategoriasContenido, useCrearBoletin, type BorradorBoletin } from '@/hooks';
import {
  MAX_MB_DOCUMENTO,
  MAX_MB_IMAGEN,
  comprimirImagen,
  elegirImagenes,
  elegirPdf,
  formatDateTime,
  formatNumber,
  motivoDeRechazo,
  motivoDeRechazoPdf,
} from '@/lib';
import type { CategoriaContenido } from '@/models';
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
import { PRIORIDADES, SelectorVisibilidad, sumarDias } from './opciones-publicacion';
import {
  Campo,
  Interruptor,
  MensajeError,
  MensajeExito,
  Miniaturas,
  OpcionMosaico,
  OpcionRadio,
  TituloBloque,
  ZonaDocumento,
  ZonaSeleccion,
} from './piezas-formulario';
import { TarjetaPublicacion } from './tarjeta-publicacion';

/**
 * Nuevo boletin desde el telefono, para administradores.
 *
 * Un boletin es una publicacion de la seccion Boletines con dos cosas que las
 * demas no exigen: UNA fotografia (no es una galeria) y el PDF que la
 * poblacion descarga desde el visor. Pide todo lo que admite
 * `CreatePublicacionDto` para esa seccion, en tres bloques:
 *   1. Contenido: tipo de boletin, titulo, resumen, foto, PDF y fecha de
 *      emision. Es lo que se ve.
 *   2. Detalles: quien lo emite (la fuente oficial) y comunidad. Opcionales.
 *   3. Opciones: pagina principal, publicar o guardar borrador, vencimiento,
 *      prioridad y quien lo ve.
 * Debajo, la vista previa, como en el resto de formularios.
 *
 * La fecha de emision es la `fechaPublicacion`: el detalle la muestra como
 * "Emitido". No se programan boletines a futuro, por eso no admite fechas
 * posteriores a hoy; sin tocarla, la pone el API al publicar.
 */

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// Los mismos limites que `CreatePublicacionDto`, salvo el resumen: el API
// admite 5000, aqui se pide algo que se lea de un vistazo en el visor.
const TITULO = { min: 3, max: 150 };
const RESUMEN = { min: 3, max: 1000 };
const TEXTO_CORTO = 150;
/** Margen para el reloj de un telefono un poco adelantado. */
const TOLERANCIA_FUTURO = 5 * 60_000;
/** Vencimiento que se sugiere al activarlo. Un boletin preventivo dura. */
const DIAS_VIGENCIA_SUGERIDA = 30;

const MOMENTOS: { borrador: boolean; etiqueta: string; descripcion: string; icono: LucideIcon }[] = [
  { borrador: false, etiqueta: 'Publicar ahora', descripcion: 'Se ve en cuanto lo publiques.', icono: Send },
  {
    borrador: true,
    etiqueta: 'Guardar como borrador',
    descripcion: 'No se ve en la app. Se termina y publica desde el panel.',
    icono: FileClock,
  },
];

type CampoFormulario =
  | 'categoriaContenidoId'
  | 'titulo'
  | 'descripcion'
  | 'imagen'
  | 'documento'
  | 'fechaEmision'
  | 'dependencia'
  | 'comunidad'
  | 'fechaExpiracion'
  | 'grupo';
type Errores = Partial<Record<CampoFormulario, string>>;

function validar(borrador: BorradorBoletin): Errores {
  const errores: Errores = {};
  const titulo = borrador.titulo.trim().length;
  const resumen = borrador.descripcion.trim().length;
  const ahora = Date.now();

  if (!borrador.categoriaContenidoId) errores.categoriaContenidoId = 'Elige el tipo de boletín.';
  if (titulo < TITULO.min || titulo > TITULO.max) {
    errores.titulo = `El título debe tener entre ${TITULO.min} y ${TITULO.max} caracteres.`;
  }
  if (resumen < RESUMEN.min || resumen > RESUMEN.max) {
    errores.descripcion = `El resumen debe tener entre ${RESUMEN.min} y ${formatNumber(RESUMEN.max)} caracteres.`;
  }
  if (!borrador.imagen) errores.imagen = 'Agrega la fotografía del boletín.';
  if (!borrador.documento) errores.documento = 'Adjunta el PDF del boletín.';
  if (borrador.fechaEmision && borrador.fechaEmision.getTime() > ahora + TOLERANCIA_FUTURO) {
    errores.fechaEmision = 'La fecha de emisión no puede estar en el futuro.';
  }
  if (borrador.dependencia.trim().length > TEXTO_CORTO) {
    errores.dependencia = `Máximo ${TEXTO_CORTO} caracteres.`;
  }
  if (borrador.comunidad.trim().length > TEXTO_CORTO) {
    errores.comunidad = `Máximo ${TEXTO_CORTO} caracteres.`;
  }
  // La emision ya ocurrio: basta con que venza despues de ahora.
  if (borrador.fechaExpiracion && borrador.fechaExpiracion.getTime() <= ahora) {
    errores.fechaExpiracion = 'Debe ser una fecha futura; si no, nunca se vería.';
  }
  if (borrador.visibilidad === 'GRUPO' && !borrador.grupo) {
    errores.grupo = 'Elige qué grupo lo verá.';
  }

  return errores;
}

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export function PantallaNuevoBoletin() {
  const puedeCrear = usePuedeCrearContenido();
  const tipos = useCategoriasContenido('BOLETINES', puedeCrear);

  // La ruta ya va protegida; esto cubre el instante en que la sesion cambia
  // con la pantalla abierta.
  if (!puedeCrear) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={Lock}
          title="Solo administradores"
          description="Para publicar boletines inicia sesión con una cuenta de administrador."
        />
      </Screen>
    );
  }
  if (tipos.isPending) return <LoadingScreen message="Cargando..." />;
  if (tipos.isError) return <ErrorState error={tipos.error} onRetry={() => void tipos.refetch()} />;
  if (tipos.data.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={LayoutGrid}
          title="Sin tipos de boletín"
          description="Esta organización aún no tiene tipos de boletín. Configúralos desde el panel para poder publicar."
        />
      </Screen>
    );
  }

  return <Formulario tipos={tipos.data} />;
}

function borradorVacio(tipos: CategoriaContenido[], sugerido?: string): BorradorBoletin {
  return {
    // Desde el visor llega el tipo que se estaba viendo.
    categoriaContenidoId: tipos.find((t) => t.id === sugerido)?.id ?? '',
    titulo: '',
    descripcion: '',
    imagen: null,
    documento: null,
    fechaEmision: null,
    dependencia: '',
    comunidad: '',
    visibilidad: 'PUBLICA',
    grupo: null,
    borrador: false,
    fechaExpiracion: null,
    prioridad: 0,
    paginaPrincipal: false,
  };
}

function Formulario({ tipos }: { tipos: CategoriaContenido[] }) {
  const router = useRouter();
  const { categoriaId } = useLocalSearchParams<{ categoriaId?: string }>();

  const [borrador, setBorrador] = useState(() => borradorVacio(tipos, categoriaId));
  const [errores, setErrores] = useState<Errores>({});
  const [procesando, setProcesando] = useState(false);
  const [avisoImagen, setAvisoImagen] = useState<string | null>(null);
  const [avisoDocumento, setAvisoDocumento] = useState<string | null>(null);
  const [borradorGuardado, setBorradorGuardado] = useState(false);

  const crear = useCrearBoletin();
  const enviando = crear.isPending;
  const ocupado = procesando || enviando;
  const tipo = tipos.find((t) => t.id === borrador.categoriaContenidoId);

  function actualizar(cambios: Partial<BorradorBoletin>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setBorradorGuardado(false);
    // El error de un campo desaparece en cuanto se toca.
    setErrores((actuales) => {
      const siguientes = { ...actuales };
      for (const campo of Object.keys(cambios) as CampoFormulario[]) delete siguientes[campo];
      return siguientes;
    });
  }

  async function seleccionarFoto() {
    if (ocupado) return;
    setAvisoImagen(null);

    try {
      const [elegida] = await elegirImagenes(1);
      if (!elegida) return;

      const motivo = motivoDeRechazo(elegida);
      if (motivo) {
        setAvisoImagen(motivo);
        return;
      }

      setProcesando(true);
      // Elegir otra la sustituye: un boletin lleva una sola foto.
      actualizar({ imagen: await comprimirImagen(elegida.uri) });
    } catch {
      setAvisoImagen('No se pudo abrir o procesar la imagen. Revisa los permisos de la app.');
    } finally {
      setProcesando(false);
    }
  }

  async function seleccionarPdf() {
    if (ocupado) return;
    setAvisoDocumento(null);

    try {
      const documento = await elegirPdf();
      if (!documento) return;

      const motivo = motivoDeRechazoPdf(documento);
      if (motivo) {
        setAvisoDocumento(motivo);
        return;
      }
      actualizar({ documento });
    } catch {
      setAvisoDocumento('No se pudo abrir el selector de archivos.');
    }
  }

  function limpiar() {
    crear.reset();
    setErrores({});
    setAvisoImagen(null);
    setAvisoDocumento(null);
    setBorrador(borradorVacio(tipos, categoriaId));
  }

  function publicar() {
    // `isPending` ya deshabilita el boton; esto cubre el doble toque que llega
    // antes de que React vuelva a pintar. Dos toques serian dos boletines.
    if (enviando) return;

    const encontrados = validar(borrador);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    crear.mutate(borrador, {
      onSuccess: () => {
        // Un borrador no se ve en la app: se confirma aqui y se deja el
        // formulario limpio para el siguiente.
        if (borrador.borrador) {
          limpiar();
          setBorradorGuardado(true);
          return;
        }
        // Al visor del tipo, donde ya aparece. Si estaba debajo se vuelve a
        // el en vez de apilar otro.
        router.dismissTo(
          `/${PRESENTACION_SECCION.BOLETINES.slug}/${borrador.categoriaContenidoId}` as Href,
        );
      },
    });
  }

  const etiquetaPublicar =
    crear.fase === 'subiendo'
      ? 'Subiendo foto y PDF...'
      : crear.fase === 'publicando'
        ? 'Guardando...'
        : borrador.borrador
          ? 'Guardar borrador'
          : 'Publicar boletín';

  const emision = formatDateTime(borrador.fechaEmision ?? new Date());

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-5 pb-28">
      <View className="gap-1">
        <Text variant="title" className="text-2xl">
          Nuevo boletín
        </Text>
        <Text variant="subtitle">
          Publica un boletín informativo o preventivo con su documento para descargar.
        </Text>
      </View>

      {/* Tipo de boletin ------------------------------------------------- */}
      <Card className="gap-4">
        <Campo icono={Layers} titulo="Tipo de boletín" requerido error={errores.categoriaContenidoId}>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {tipos.map((opcion) => (
              <OpcionMosaico
                key={opcion.id}
                nombre={opcion.nombre}
                icono={iconoDeCategoria(opcion, PRESENTACION_SECCION.BOLETINES.icono)}
                seleccionado={borrador.categoriaContenidoId === opcion.id}
                deshabilitado={enviando}
                onPress={() => actualizar({ categoriaContenidoId: opcion.id })}
              />
            ))}
          </View>
        </Campo>
      </Card>

      {/* 1. Contenido ----------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Contenido" />

        <Campo icono={FileText} titulo="Título de la publicación" requerido>
          <Input
            placeholder="Ingrese el título del boletín"
            maxLength={TITULO.max}
            value={borrador.titulo}
            onChangeText={(titulo) => actualizar({ titulo })}
            error={errores.titulo}
            hint={`${borrador.titulo.length} / ${TITULO.max}`}
            editable={!enviando}
          />
        </Campo>

        <Campo
          icono={TextAlignStart}
          titulo="Texto resumen de la publicación"
          requerido
          ayuda="Lo que se lee en el visor. El detalle completo va en el PDF."
        >
          <Input
            placeholder="Ingrese un resumen o descripción breve del boletín"
            multiline
            maxLength={RESUMEN.max}
            value={borrador.descripcion}
            onChangeText={(descripcion) => actualizar({ descripcion })}
            error={errores.descripcion}
            hint={`${formatNumber(borrador.descripcion.length)} / ${formatNumber(RESUMEN.max)}`}
            editable={!enviando}
          />
        </Campo>

        <Campo
          icono={Camera}
          titulo="Fotografía"
          requerido
          ayuda={`Una sola foto: es la portada del boletín en el visor. JPG, JPEG o PNG, hasta ${MAX_MB_IMAGEN} MB.`}
          error={errores.imagen}
        >
          <ZonaSeleccion
            maximo={1}
            cantidad={borrador.imagen ? 1 : 0}
            procesando={procesando}
            deshabilitado={enviando}
            onSeleccionar={() => void seleccionarFoto()}
          />
          {avisoImagen && <MensajeError texto={avisoImagen} />}
          {borrador.imagen && (
            <Miniaturas
              imagenes={[borrador.imagen]}
              deshabilitado={enviando}
              onQuitar={() => actualizar({ imagen: null })}
            />
          )}
        </Campo>

        <Campo
          icono={Paperclip}
          titulo="Subir PDF"
          requerido
          ayuda="El documento completo. La población lo descarga desde el visor."
          error={errores.documento}
        >
          <ZonaDocumento
            documento={borrador.documento}
            maximoMb={MAX_MB_DOCUMENTO}
            deshabilitado={ocupado}
            onSeleccionar={() => void seleccionarPdf()}
            onQuitar={() => actualizar({ documento: null })}
          />
          {avisoDocumento && <MensajeError texto={avisoDocumento} />}
        </Campo>

        <Campo
          icono={CalendarDays}
          titulo="Fecha de emitido"
          requerido
          ayuda="Si no la cambias, se toma el momento de publicar."
          error={errores.fechaEmision}
        >
          <SelectorFecha
            valor={borrador.fechaEmision}
            maximo={new Date()}
            placeholder="Hoy, al publicar"
            deshabilitado={enviando}
            onCambiar={(fechaEmision) => actualizar({ fechaEmision })}
          />
        </Campo>
      </Card>

      {/* 2. Detalles ------------------------------------------------------ */}
      <Card className="gap-6">
        <TituloBloque titulo="Detalles" descripcion="Opcionales. Ayudan a saber de dónde viene la información." />

        <Campo icono={Building} titulo="Emitido por" ayuda="Institución o fuente oficial que respalda el boletín.">
          <Input
            placeholder="Ej: COMRED, CONRED, Ministerio de Salud"
            maxLength={TEXTO_CORTO}
            value={borrador.dependencia}
            onChangeText={(dependencia) => actualizar({ dependencia })}
            error={errores.dependencia}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={MapPin} titulo="Comunidad" ayuda="Si el boletín es para un lugar concreto.">
          <Input
            placeholder="Ej: Aldea Las Majadas"
            maxLength={TEXTO_CORTO}
            value={borrador.comunidad}
            onChangeText={(comunidad) => actualizar({ comunidad })}
            error={errores.comunidad}
            editable={!enviando}
          />
        </Campo>
      </Card>

      {/* 3. Opciones de publicacion -------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Opciones de publicación" />

        <Interruptor
          icono={House}
          etiqueta="Mostrar en la página principal"
          descripcion="Además de en Boletines, sale en el inicio (las 5 más recientes)."
          activo={borrador.paginaPrincipal}
          deshabilitado={enviando}
          onCambiar={(paginaPrincipal) => actualizar({ paginaPrincipal })}
        />

        <Campo icono={CalendarClock} titulo="¿Cuándo se publica?">
          <View className="gap-2">
            {MOMENTOS.map((momento) => (
              <OpcionRadio
                key={momento.etiqueta}
                icono={momento.icono}
                etiqueta={momento.etiqueta}
                descripcion={momento.descripcion}
                seleccionada={borrador.borrador === momento.borrador}
                deshabilitado={enviando}
                onPress={() => actualizar({ borrador: momento.borrador })}
              />
            ))}
          </View>
        </Campo>

        <Campo icono={CalendarX} titulo="Vencimiento" error={errores.fechaExpiracion}>
          <Interruptor
            etiqueta="Retirar automáticamente"
            descripcion="Deja de verse solo en una fecha. Útil para avisos de temporada."
            activo={borrador.fechaExpiracion !== null}
            deshabilitado={enviando}
            onCambiar={(activo) =>
              actualizar({ fechaExpiracion: activo ? sumarDias(null, DIAS_VIGENCIA_SUGERIDA) : null })
            }
          />
          {borrador.fechaExpiracion && (
            <SelectorFecha
              valor={borrador.fechaExpiracion}
              minimo={new Date()}
              placeholder="Elige hasta cuándo se verá"
              deshabilitado={enviando}
              onCambiar={(fechaExpiracion) => actualizar({ fechaExpiracion })}
            />
          )}
        </Campo>

        <Campo icono={Flag} titulo="Prioridad" ayuda="Ordena el boletín dentro de su tipo.">
          <View className="gap-2">
            {PRIORIDADES.map((prioridad) => (
              <OpcionRadio
                key={prioridad.valor}
                icono={prioridad.icono}
                etiqueta={prioridad.etiqueta}
                descripcion={prioridad.descripcion}
                seleccionada={borrador.prioridad === prioridad.valor}
                deshabilitado={enviando}
                onPress={() => actualizar({ prioridad: prioridad.valor })}
              />
            ))}
          </View>
        </Campo>

        <SelectorVisibilidad
          visibilidad={borrador.visibilidad}
          grupo={borrador.grupo}
          error={errores.grupo}
          deshabilitado={enviando}
          onCambiar={(cambios) => actualizar(cambios)}
        />
      </Card>

      {/* Vista previa ----------------------------------------------------- */}
      <View className="flex-row items-center gap-3 rounded-card border border-secondary-300 bg-secondary-500 px-4 py-3">
        <Icon as={ArrowDown} size={20} className="text-secondary-foreground dark:text-secondary-foreground" />
        <Text variant="plain" className="flex-1 text-base font-semibold text-secondary-foreground">
          La vista previa del boletín se muestra abajo
        </Text>
      </View>

      <Card className="gap-4">
        <View className="gap-0.5">
          <View className="flex-row items-center gap-2">
            <Icon as={Eye} size={22} />
            <Text variant="heading">Vista previa del boletín</Text>
          </View>
          <Text variant="caption">
            Así se verá en {['Boletines', tipo?.nombre].filter(Boolean).join(' › ')}.
          </Text>
        </View>
        <TarjetaPublicacion
          imagenes={borrador.imagen ? [borrador.imagen] : []}
          titulo={borrador.titulo.trim()}
          descripcion={borrador.descripcion.trim()}
          detalle={[`Emitido ${emision}`, borrador.dependencia.trim()].filter(Boolean).join(' · ')}
          placeholderTitulo="Título del boletín"
          placeholderDescripcion="Aquí se mostrará el resumen del boletín para la población."
        />
        <View className="flex-row items-center gap-2 rounded-field border border-line p-3 dark:border-line-dark">
          <Icon as={Paperclip} size={18} className="text-primary-500 dark:text-primary-500" />
          <Text variant="caption" className="flex-1" numberOfLines={2}>
            {borrador.documento
              ? `${borrador.documento.nombre} · se podrá descargar desde el visor`
              : 'Sin PDF adjunto todavía'}
          </Text>
        </View>
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
          icon={borrador.borrador ? FileClock : Send}
          size="lg"
          fullWidth
          loading={enviando}
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
