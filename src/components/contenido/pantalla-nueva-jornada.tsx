import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ArrowDown,
  BriefcaseMedical,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CircleCheck,
  ClipboardList,
  Clock,
  Eye,
  FileClock,
  FileText,
  Flag,
  House,
  Images,
  LayoutGrid,
  Layers,
  ListChecks,
  Lock,
  Map as IconoMapa,
  MapPin,
  MapPinned,
  Phone,
  Send,
  TextAlignStart,
  Trash,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ESTADO_JORNADA, PRESENTACION_SECCION, iconoDeCategoria } from '@/constants';
import { horarioDe, useCategoriasContenido, useCrearJornada, type BorradorJornada } from '@/hooks';
import {
  MAX_IMAGENES_PUBLICACION,
  MAX_MB_IMAGEN,
  comprimirImagen,
  elegirImagenes,
  formatDate,
  formatNumber,
  motivoDeRechazo,
} from '@/lib';
import type { CategoriaContenido, EstadoJornada, ImagenComprimida } from '@/models';
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
  Chip,
  Interruptor,
  MensajeError,
  MensajeExito,
  Miniaturas,
  OpcionMosaico,
  OpcionRadio,
  TituloBloque,
  ZonaSeleccion,
} from './piezas-formulario';
import { SelectorUbicacion } from './selector-ubicacion';
import { TarjetaPublicacion } from './tarjeta-publicacion';

/**
 * Nueva jornada desde el telefono, para administradores.
 *
 * Pide todo lo que guarda la tabla `jornada` (tipo, nombre, fechas, horario,
 * lugar, institucion, contacto, comunidad, descripcion, servicios,
 * requisitos, ubicacion y estado) y crea a la vez su publicacion con las
 * fotos: el visor muestra publicaciones, y una jornada sin ninguna solo
 * marcaria la tarjeta. Es el mismo esquema que Reportar desastre.
 *
 * Los textos se piden una vez y sirven a las dos: el titulo es el nombre de
 * la jornada y el de la publicacion, y la descripcion corta, la de ambas.
 */

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// Los mismos limites que `CreateJornadaDto`, salvo la descripcion corta: el
// API admite 5000, aqui se pide algo que se lea de un vistazo en el visor.
const TITULO = { min: 3, max: 150 };
const DESCRIPCION = { min: 3, max: 1000 };
const TEXTO_LARGO = 5000;
const TEXTO_CORTO = 150;
const LUGAR = 200;
const HORARIO = 120;
/** Vencimiento sugerido: el dia siguiente al final de la jornada. */
const DIAS_TRAS_JORNADA = 1;
/** Sin fechas aun, el vencimiento que se sugiere. */
const DIAS_VIGENCIA_SUGERIDA = 7;

const MOMENTOS: { borrador: boolean; etiqueta: string; descripcion: string; icono: LucideIcon }[] = [
  {
    borrador: false,
    etiqueta: 'Publicar',
    descripcion: 'Se ve en la fecha de publicación (si no la eliges, en cuanto la publiques).',
    icono: Send,
  },
  {
    borrador: true,
    etiqueta: 'Guardar como borrador',
    descripcion: 'La publicación no se ve en la app. Se termina y publica desde el panel.',
    icono: FileClock,
  },
];

const ESTADOS: EstadoJornada[] = ['PROXIMA', 'EN_DESARROLLO', 'FINALIZADA', 'CANCELADA'];

type CampoFormulario =
  | 'categoriaContenidoId'
  | 'titulo'
  | 'fechaInicio'
  | 'fechaFin'
  | 'horario'
  | 'lugar'
  | 'institucion'
  | 'contacto'
  | 'comunidad'
  | 'descripcion'
  | 'servicios'
  | 'requisitos'
  | 'ubicacion'
  | 'fechaPublicacion'
  | 'fechaExpiracion'
  | 'grupo';
type Errores = Partial<Record<CampoFormulario, string>>;

/** Obligatorio y con tope: el mensaje que toca, o nada. */
function textoRequerido(texto: string, maximo: number, falta: string): string | undefined {
  const largo = texto.trim().length;
  if (largo === 0) return falta;
  if (largo > maximo) return `Máximo ${formatNumber(maximo)} caracteres.`;
  return undefined;
}

function validar(borrador: BorradorJornada): Errores {
  const errores: Errores = {};
  const titulo = borrador.titulo.trim().length;
  const descripcion = borrador.descripcion.trim().length;

  if (!borrador.categoriaContenidoId) errores.categoriaContenidoId = 'Elige el tipo de jornada.';
  if (titulo < TITULO.min || titulo > TITULO.max) {
    errores.titulo = `El título debe tener entre ${TITULO.min} y ${TITULO.max} caracteres.`;
  }

  if (!borrador.fechaInicio) errores.fechaInicio = 'Elige cuándo empieza la jornada.';
  if (borrador.fechaInicio && borrador.fechaFin && borrador.fechaFin < borrador.fechaInicio) {
    errores.fechaFin = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
  if (borrador.horario.trim().length > HORARIO) errores.horario = `Máximo ${HORARIO} caracteres.`;

  errores.lugar = textoRequerido(borrador.lugar, LUGAR, 'Indica dónde será la jornada.');
  errores.institucion = textoRequerido(borrador.institucion, TEXTO_CORTO, 'Indica quién organiza.');
  errores.contacto = textoRequerido(borrador.contacto, TEXTO_CORTO, 'Indica un teléfono o contacto.');
  errores.comunidad = textoRequerido(borrador.comunidad, TEXTO_CORTO, 'Indica la comunidad beneficiada.');

  if (descripcion < DESCRIPCION.min || descripcion > DESCRIPCION.max) {
    errores.descripcion = `La descripción debe tener entre ${DESCRIPCION.min} y ${formatNumber(DESCRIPCION.max)} caracteres.`;
  }
  errores.servicios = textoRequerido(borrador.servicios, TEXTO_LARGO, 'Describe los servicios de la jornada.');
  errores.requisitos = textoRequerido(borrador.requisitos, TEXTO_LARGO, 'Indica los requisitos para asistir.');
  if (!borrador.ubicacion) errores.ubicacion = 'Marca en el mapa dónde será la jornada.';

  // La publicacion: sale en su fecha (o ahora) y, si vence, despues.
  const inicioPublicacion = borrador.fechaPublicacion ?? new Date();
  if (borrador.fechaExpiracion && borrador.fechaExpiracion <= inicioPublicacion) {
    errores.fechaExpiracion = 'Debe ser posterior a la publicación; si no, nunca se vería.';
  }
  if (borrador.visibilidad === 'GRUPO' && !borrador.grupo) {
    errores.grupo = 'Elige qué grupo la verá.';
  }

  // `textoRequerido` deja llaves con `undefined`: fuera, para poder contarlas.
  for (const campo of Object.keys(errores) as CampoFormulario[]) {
    if (!errores[campo]) delete errores[campo];
  }
  return errores;
}

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export function PantallaNuevaJornada() {
  const puedeCrear = usePuedeCrearContenido();
  const tipos = useCategoriasContenido('JORNADAS', puedeCrear);

  // La ruta ya va protegida; esto cubre el instante en que la sesion cambia
  // con la pantalla abierta.
  if (!puedeCrear) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={Lock}
          title="Solo administradores"
          description="Para publicar jornadas inicia sesión con una cuenta de administrador."
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
          title="Sin tipos de jornada"
          description="Esta organización aún no tiene tipos de jornada. Configúralos desde el panel para poder publicar."
        />
      </Screen>
    );
  }

  return <Formulario tipos={tipos.data} />;
}

function borradorVacio(tipos: CategoriaContenido[], sugerido?: string): BorradorJornada {
  return {
    // Desde el visor llega el tipo que se estaba viendo.
    categoriaContenidoId: tipos.find((t) => t.id === sugerido)?.id ?? '',
    titulo: '',
    fechaInicio: null,
    fechaFin: null,
    horario: '',
    lugar: '',
    institucion: '',
    contacto: '',
    comunidad: '',
    descripcion: '',
    servicios: '',
    requisitos: '',
    ubicacion: null,
    estado: null,
    imagenes: [],
    fechaPublicacion: null,
    borrador: false,
    paginaPrincipal: false,
    fechaExpiracion: null,
    prioridad: 0,
    visibilidad: 'PUBLICA',
    grupo: null,
  };
}

function Formulario({ tipos }: { tipos: CategoriaContenido[] }) {
  const router = useRouter();
  const { categoriaId } = useLocalSearchParams<{ categoriaId?: string }>();

  const [borrador, setBorrador] = useState(() => borradorVacio(tipos, categoriaId));
  const [errores, setErrores] = useState<Errores>({});
  const [procesando, setProcesando] = useState(false);
  const [avisoImagenes, setAvisoImagenes] = useState<string | null>(null);
  const [borradorGuardado, setBorradorGuardado] = useState(false);

  const crear = useCrearJornada();
  const enviando = crear.isPending;
  const ocupado = procesando || enviando;
  // Ya registrada, la jornada no cambia de tipo: solo falta su publicacion.
  const tipoBloqueado = enviando || crear.jornadaRegistrada;
  const tipo = tipos.find((t) => t.id === borrador.categoriaContenidoId);

  function actualizar(cambios: Partial<BorradorJornada>) {
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
      // Una a una: varias fotos descomprimidas a la vez tumban a un telefono modesto.
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
      }
    } catch {
      rechazos.push('No se pudo abrir la galería. Revisa los permisos de la app.');
    } finally {
      setProcesando(false);
      if (rechazos.length > 0) setAvisoImagenes(rechazos.join('\n'));
    }
  }

  function limpiar() {
    crear.olvidar();
    setErrores({});
    setAvisoImagenes(null);
    setBorrador(borradorVacio(tipos, categoriaId));
  }

  function publicar() {
    // `isPending` ya deshabilita el boton; esto cubre el doble toque que llega
    // antes de que React vuelva a pintar. Dos toques serian dos jornadas.
    if (enviando) return;

    const encontrados = validar(borrador);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    crear.mutate(borrador, {
      onSuccess: ({ categoriaContenidoId }) => {
        // Un borrador no se ve en la app: se confirma aqui y se deja el
        // formulario limpio para la siguiente.
        if (borrador.borrador) {
          limpiar();
          setBorradorGuardado(true);
          return;
        }
        // Al visor del tipo, donde ya aparece. Si estaba debajo se vuelve a
        // el en vez de apilar otro.
        router.dismissTo(`/${PRESENTACION_SECCION.JORNADAS.slug}/${categoriaContenidoId}` as Href);
      },
    });
  }

  const etiquetaPublicar =
    crear.fase === 'subiendo'
      ? 'Subiendo imágenes...'
      : crear.fase === 'registrando'
        ? 'Registrando jornada...'
        : crear.fase === 'publicando'
          ? 'Publicando...'
          : crear.jornadaRegistrada
            ? 'Reintentar la publicación'
            : borrador.borrador
              ? 'Guardar borrador'
              : 'Publicar jornada';

  // Lo que la poblacion leera bajo el titulo: cuando y donde.
  const dias = borrador.fechaInicio
    ? [formatDate(borrador.fechaInicio), formatDate(borrador.fechaFin)]
        .filter((dia, i, lista) => dia && lista.indexOf(dia) === i)
        .join(' al ')
    : '';
  const cuando = [dias, horarioDe(borrador)].filter(Boolean).join(' · ');
  const donde = [borrador.lugar.trim(), borrador.comunidad.trim()].filter(Boolean).join(' · ');
  const horarioDeducido = borrador.horario.trim() ? undefined : horarioDe(borrador);

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-5 pb-28">
      <View className="gap-1">
        <Text variant="title" className="text-2xl">
          Nueva jornada
        </Text>
        <Text variant="subtitle">
          Anuncia una jornada con su fecha, lugar y requisitos para que la población asista.
        </Text>
      </View>

      {/* Tipo de jornada ------------------------------------------------ */}
      <Card className="gap-4">
        <Campo icono={Layers} titulo="Tipo de jornada" requerido error={errores.categoriaContenidoId}>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {tipos.map((opcion) => (
              <OpcionMosaico
                key={opcion.id}
                nombre={opcion.nombre}
                icono={iconoDeCategoria(opcion, PRESENTACION_SECCION.JORNADAS.icono)}
                seleccionado={borrador.categoriaContenidoId === opcion.id}
                deshabilitado={tipoBloqueado}
                onPress={() => actualizar({ categoriaContenidoId: opcion.id })}
              />
            ))}
          </View>
        </Campo>
      </Card>

      {/* Datos de la jornada ------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Datos de la jornada" />

        <Campo icono={FileText} titulo="Título de la publicación" requerido>
          <Input
            placeholder="Ej. Jornada médica en La Democracia"
            maxLength={TITULO.max}
            value={borrador.titulo}
            onChangeText={(titulo) => actualizar({ titulo })}
            error={errores.titulo}
            hint={`${borrador.titulo.length} / ${TITULO.max}`}
            editable={!enviando}
          />
        </Campo>

        <Campo
          icono={CalendarDays}
          titulo="Fecha de la actividad o rango de fechas"
          requerido
          ayuda="Si dura un solo día, deja vacía la fecha de fin."
        >
          <View className="gap-1.5">
            <Text variant="label">Inicio</Text>
            <SelectorFecha
              valor={borrador.fechaInicio}
              placeholder="Fecha y hora de inicio"
              error={errores.fechaInicio}
              deshabilitado={enviando}
              onCambiar={(fechaInicio) => actualizar({ fechaInicio })}
            />
          </View>
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text variant="label">Fin (opcional)</Text>
              {borrador.fechaFin && (
                <Button
                  label="Quitar"
                  variant="ghost"
                  size="sm"
                  disabled={enviando}
                  onPress={() => actualizar({ fechaFin: null })}
                />
              )}
            </View>
            <SelectorFecha
              valor={borrador.fechaFin}
              minimo={borrador.fechaInicio ?? undefined}
              placeholder="Fecha y hora de fin"
              error={errores.fechaFin}
              deshabilitado={enviando}
              onCambiar={(fechaFin) => actualizar({ fechaFin })}
            />
          </View>
        </Campo>

        <Campo
          icono={Clock}
          titulo="Horario"
          ayuda={
            horarioDeducido
              ? `Si lo dejas vacío se mostrará "${horarioDeducido}".`
              : 'Opcional. Si lo dejas vacío, se toma de las horas de inicio y fin.'
          }
        >
          <Input
            placeholder="Ej. 8:00 a 15:00"
            maxLength={HORARIO}
            value={borrador.horario}
            onChangeText={(horario) => actualizar({ horario })}
            error={errores.horario}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={MapPin} titulo="Lugar" requerido>
          <Input
            placeholder="Ej. Salón comunal de La Democracia"
            maxLength={LUGAR}
            value={borrador.lugar}
            onChangeText={(lugar) => actualizar({ lugar })}
            error={errores.lugar}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={Users} titulo="Organiza" requerido>
          <Input
            placeholder="Ej. Centro de Salud de Quetzaltenango"
            maxLength={TEXTO_CORTO}
            value={borrador.institucion}
            onChangeText={(institucion) => actualizar({ institucion })}
            error={errores.institucion}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={Phone} titulo="Contacto" requerido>
          <Input
            placeholder="Ej. Tel. 7761-0000"
            maxLength={TEXTO_CORTO}
            value={borrador.contacto}
            onChangeText={(contacto) => actualizar({ contacto })}
            error={errores.contacto}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={MapPinned} titulo="Comunidad beneficiada" requerido>
          <Input
            placeholder="Ej. La Democracia"
            maxLength={TEXTO_CORTO}
            value={borrador.comunidad}
            onChangeText={(comunidad) => actualizar({ comunidad })}
            error={errores.comunidad}
            editable={!enviando}
          />
        </Campo>

        <Campo
          icono={ClipboardList}
          titulo="Estado de la jornada"
          ayuda="Por defecto cambia solo con las fechas: próxima, en desarrollo y finalizada."
        >
          <View className="flex-row flex-wrap gap-2">
            <Chip
              etiqueta="Según las fechas"
              seleccionado={borrador.estado === null}
              deshabilitado={enviando}
              onPress={() => actualizar({ estado: null })}
            />
            {ESTADOS.map((estado) => (
              <Chip
                key={estado}
                etiqueta={ESTADO_JORNADA[estado].etiqueta}
                seleccionado={borrador.estado === estado}
                deshabilitado={enviando}
                onPress={() => actualizar({ estado })}
              />
            ))}
          </View>
        </Campo>
      </Card>

      {/* Descripcion ----------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Descripción" descripcion="Lo que la población necesita saber para asistir." />

        <Campo
          icono={TextAlignStart}
          titulo="Descripción general corta"
          requerido
          ayuda="Es lo que se lee en el visor, bajo la foto."
        >
          <Input
            placeholder="Ej. Consulta general gratuita este fin de semana en el salón comunal. Lleve su DPI."
            multiline
            maxLength={DESCRIPCION.max}
            value={borrador.descripcion}
            onChangeText={(descripcion) => actualizar({ descripcion })}
            error={errores.descripcion}
            hint={`${formatNumber(borrador.descripcion.length)} / ${formatNumber(DESCRIPCION.max)}`}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={BriefcaseMedical} titulo="Descripción de servicios durante la jornada" requerido>
          <Input
            placeholder="Ej. Consulta general, toma de presión y glucosa, y entrega de medicamentos básicos."
            multiline
            maxLength={TEXTO_LARGO}
            value={borrador.servicios}
            onChangeText={(servicios) => actualizar({ servicios })}
            error={errores.servicios}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={ListChecks} titulo="Requisitos" requerido>
          <Input
            placeholder="Ej. Presentar DPI, asistir en el horario establecido y, si aplica, llevar expediente médico."
            multiline
            maxLength={TEXTO_LARGO}
            value={borrador.requisitos}
            onChangeText={(requisitos) => actualizar({ requisitos })}
            error={errores.requisitos}
            editable={!enviando}
          />
        </Campo>
      </Card>

      {/* Ubicacion ------------------------------------------------------- */}
      <Card className="gap-4">
        <Campo
          icono={IconoMapa}
          titulo="Ubicación en mapa"
          requerido
          ayuda="La población la abre con su app de mapas para llegar."
          error={errores.ubicacion}
        >
          <SelectorUbicacion
            valor={borrador.ubicacion}
            error={Boolean(errores.ubicacion)}
            deshabilitado={enviando}
            onCambiar={(ubicacion) => actualizar({ ubicacion })}
          />
        </Campo>
      </Card>

      {/* Fotografias ----------------------------------------------------- */}
      <Card className="gap-4">
        <Campo
          icono={Images}
          titulo="Fotografías"
          ayuda={`Opcionales: el anuncio, horarios, el lugar (máx. ${MAX_IMAGENES_PUBLICACION}). JPG, JPEG o PNG, hasta ${MAX_MB_IMAGEN} MB cada una. La primera es la portada.`}
        >
          <ZonaSeleccion
            cantidad={borrador.imagenes.length}
            procesando={procesando}
            deshabilitado={enviando}
            onSeleccionar={() => void seleccionarImagenes()}
          />
          {avisoImagenes && <MensajeError texto={avisoImagenes} />}
          {borrador.imagenes.length > 0 && (
            <Miniaturas
              imagenes={borrador.imagenes}
              deshabilitado={enviando}
              onQuitar={(id) => actualizar({ imagenes: borrador.imagenes.filter((i) => i.id !== id) })}
            />
          )}
        </Campo>
      </Card>

      {/* Opciones de publicacion ----------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Opciones de publicación" />

        <Campo
          icono={CalendarClock}
          titulo="Fecha de publicación"
          requerido
          ayuda="Desde cuándo se ve en la app. Si no la cambias, al publicar; una fecha futura la programa."
          error={errores.fechaPublicacion}
        >
          <SelectorFecha
            valor={borrador.fechaPublicacion}
            placeholder="Hoy, al publicar"
            deshabilitado={enviando}
            onCambiar={(fechaPublicacion) => actualizar({ fechaPublicacion })}
          />
        </Campo>

        <Interruptor
          icono={House}
          etiqueta="Mostrar en la página principal"
          descripcion="Además de en Jornadas, sale en el inicio (las 5 más recientes)."
          activo={borrador.paginaPrincipal}
          deshabilitado={enviando}
          onCambiar={(paginaPrincipal) => actualizar({ paginaPrincipal })}
        />

        <Campo icono={Send} titulo="¿Se publica ya?">
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
            descripcion="Deja de verse sola en una fecha. Se sugiere el día después de la jornada."
            activo={borrador.fechaExpiracion !== null}
            deshabilitado={enviando}
            onCambiar={(activo) => {
              const fin = borrador.fechaFin ?? borrador.fechaInicio;
              actualizar({
                fechaExpiracion: !activo
                  ? null
                  : fin
                    ? sumarDias(fin, DIAS_TRAS_JORNADA)
                    : sumarDias(borrador.fechaPublicacion, DIAS_VIGENCIA_SUGERIDA),
              });
            }}
          />
          {borrador.fechaExpiracion && (
            <SelectorFecha
              valor={borrador.fechaExpiracion}
              minimo={borrador.fechaPublicacion ?? new Date()}
              placeholder="Elige hasta cuándo se verá"
              deshabilitado={enviando}
              onCambiar={(fechaExpiracion) => actualizar({ fechaExpiracion })}
            />
          )}
        </Campo>

        <Campo icono={Flag} titulo="Prioridad" ayuda="Ordena la jornada dentro de su tipo.">
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
          La vista previa de la jornada se muestra abajo
        </Text>
      </View>

      <Card className="gap-4">
        <View className="gap-0.5">
          <View className="flex-row items-center gap-2">
            <Icon as={Eye} size={22} />
            <Text variant="heading">Vista previa de la jornada</Text>
          </View>
          <Text variant="caption">
            Así se verá en {['Jornadas', tipo?.nombre].filter(Boolean).join(' › ')}.
          </Text>
        </View>
        <TarjetaPublicacion
          imagenes={borrador.imagenes}
          titulo={borrador.titulo.trim()}
          descripcion={borrador.descripcion.trim()}
          detalle={[cuando, donde].filter(Boolean).join('\n')}
          placeholderTitulo="Título de la jornada"
          placeholderDescripcion="Aquí se mostrará la descripción corta de la jornada para la población."
        />
      </Card>

      {crear.errorMessage && (
        <MensajeError
          texto={
            crear.jornadaRegistrada
              ? `La jornada ya quedó registrada, pero no se pudo publicar: ${crear.errorMessage}`
              : crear.errorMessage
          }
        />
      )}
      {borradorGuardado && (
        <MensajeExito
          icono={CircleCheck}
          texto="Jornada registrada y publicación guardada como borrador. No se verá en la app hasta que la publiques desde el panel."
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
