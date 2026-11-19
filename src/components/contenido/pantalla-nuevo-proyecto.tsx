import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ArrowDown,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarX,
  CircleCheck,
  ClipboardList,
  Eye,
  FileClock,
  FileText,
  Flag,
  Gauge,
  House,
  Images,
  LayoutGrid,
  Layers,
  Lock,
  Map as IconoMapa,
  MapPinned,
  NotebookText,
  Send,
  TextAlignStart,
  Trash,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ESTADO_PROYECTO, PRESENTACION_SECCION, iconoDeCategoria } from '@/constants';
import { avanceDe, useCategoriasContenido, useCrearProyecto, type BorradorProyecto } from '@/hooks';
import {
  MAX_IMAGENES_PUBLICACION,
  MAX_MB_IMAGEN,
  comprimirImagen,
  elegirImagenes,
  fechaSinHora,
  formatDateOnly,
  formatNumber,
  motivoDeRechazo,
} from '@/lib';
import type { CategoriaContenido, EstadoProyecto, ImagenComprimida } from '@/models';
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
import { BarraAvance } from './barra-avance';
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
 * Nuevo proyecto desde el telefono, para administradores.
 *
 * Pide todo lo que guarda la tabla `proyecto` (tipo, nombre, descripcion,
 * comunidad, dependencia, fecha de inicio, fecha prevista de finalizacion,
 * estado, avance y ubicacion) y crea a la vez su primera publicacion con las
 * fotos: el visor muestra publicaciones, y un proyecto sin ninguna solo
 * marcaria la tarjeta. Es el mismo esquema que Nueva jornada.
 *
 * El titulo es el nombre del proyecto y el de la publicacion. La descripcion
 * corta es la de la publicacion; el detalle de la obra, si se escribe, es la
 * del proyecto ("Sobre el proyecto" en el detalle).
 */

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// Los mismos limites que `CreateProyectoDto`, salvo la descripcion corta: el
// API admite 5000, aqui se pide algo que se lea de un vistazo en el visor.
const TITULO = { min: 3, max: 150 };
const DESCRIPCION = { min: 3, max: 1000 };
const TEXTO_LARGO = 5000;
const TEXTO_CORTO = 150;
/** Vencimiento sugerido: un mes despues del fin previsto de la obra. */
const DIAS_TRAS_PROYECTO = 30;
/** Sin fecha prevista, el vencimiento que se sugiere. */
const DIAS_VIGENCIA_SUGERIDA = 30;

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

const ESTADOS: EstadoProyecto[] = ['PLANIFICADO', 'EN_EJECUCION', 'SUSPENDIDO', 'FINALIZADO'];
/** Atajos del avance; se puede escribir cualquier entero de 0 a 100. */
const AVANCES_RAPIDOS = [0, 25, 50, 75, 100];

type CampoFormulario =
  | 'categoriaContenidoId'
  | 'titulo'
  | 'comunidad'
  | 'dependencia'
  | 'fechaInicio'
  | 'fechaFinPrevista'
  | 'avance'
  | 'descripcion'
  | 'detalle'
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

function validar(borrador: BorradorProyecto): Errores {
  const errores: Errores = {};
  const titulo = borrador.titulo.trim().length;
  const descripcion = borrador.descripcion.trim().length;

  if (!borrador.categoriaContenidoId) errores.categoriaContenidoId = 'Elige el tipo de proyecto.';
  if (titulo < TITULO.min || titulo > TITULO.max) {
    errores.titulo = `El nombre debe tener entre ${TITULO.min} y ${TITULO.max} caracteres.`;
  }

  errores.comunidad = textoRequerido(borrador.comunidad, TEXTO_CORTO, 'Indica la comunidad beneficiada.');
  errores.dependencia = textoRequerido(borrador.dependencia, TEXTO_CORTO, 'Indica la dependencia responsable.');

  if (!borrador.fechaInicio) errores.fechaInicio = 'Elige cuándo inicia (o iniciará) la obra.';
  // 'AAAA-MM-DD': el orden alfabetico es el cronologico, y solo cuenta el dia.
  if (
    borrador.fechaInicio &&
    borrador.fechaFinPrevista &&
    fechaSinHora(borrador.fechaFinPrevista) < fechaSinHora(borrador.fechaInicio)
  ) {
    errores.fechaFinPrevista = 'La finalización prevista no puede ser anterior al inicio.';
  }

  const avance = borrador.avance.trim();
  if (avance !== '' && (!/^\d{1,3}$/.test(avance) || Number(avance) > 100)) {
    errores.avance = 'Escribe un número entero de 0 a 100, o déjalo vacío.';
  }

  if (descripcion < DESCRIPCION.min || descripcion > DESCRIPCION.max) {
    errores.descripcion = `La descripción debe tener entre ${DESCRIPCION.min} y ${formatNumber(DESCRIPCION.max)} caracteres.`;
  }
  if (borrador.detalle.trim().length > TEXTO_LARGO) {
    errores.detalle = `Máximo ${formatNumber(TEXTO_LARGO)} caracteres.`;
  }
  if (!borrador.ubicacion) errores.ubicacion = 'Marca en el mapa dónde está la obra.';

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

export function PantallaNuevoProyecto() {
  const puedeCrear = usePuedeCrearContenido();
  const tipos = useCategoriasContenido('PROYECTOS', puedeCrear);

  // La ruta ya va protegida; esto cubre el instante en que la sesion cambia
  // con la pantalla abierta.
  if (!puedeCrear) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={Lock}
          title="Solo administradores"
          description="Para registrar proyectos inicia sesión con una cuenta de administrador."
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
          title="Sin tipos de proyecto"
          description="Esta organización aún no tiene tipos de proyecto. Configúralos desde el panel para poder registrar."
        />
      </Screen>
    );
  }

  return <Formulario tipos={tipos.data} />;
}

function borradorVacio(tipos: CategoriaContenido[], sugerido?: string): BorradorProyecto {
  return {
    // Desde el visor llega el tipo que se estaba viendo.
    categoriaContenidoId: tipos.find((t) => t.id === sugerido)?.id ?? '',
    titulo: '',
    descripcion: '',
    detalle: '',
    comunidad: '',
    dependencia: '',
    fechaInicio: null,
    fechaFinPrevista: null,
    // El mismo por defecto que el API.
    estado: 'EN_EJECUCION',
    avance: '',
    ubicacion: null,
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

  const crear = useCrearProyecto();
  const enviando = crear.isPending;
  const ocupado = procesando || enviando;
  // Ya registrado, el proyecto no cambia de tipo: solo falta su publicacion.
  const tipoBloqueado = enviando || crear.proyectoRegistrado;
  const tipo = tipos.find((t) => t.id === borrador.categoriaContenidoId);

  function actualizar(cambios: Partial<BorradorProyecto>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setBorradorGuardado(false);
    // El error de un campo desaparece en cuanto se toca.
    setErrores((actuales) => {
      const siguientes = { ...actuales };
      for (const campo of Object.keys(cambios) as CampoFormulario[]) delete siguientes[campo];
      return siguientes;
    });
  }

  function cambiarEstado(estado: EstadoProyecto) {
    // Una obra finalizada sin avance escrito esta al 100 %; si ya habia un
    // numero, se respeta: quien lo escribio sabra por que.
    if (estado === 'FINALIZADO' && borrador.avance.trim() === '') {
      actualizar({ estado, avance: '100' });
      return;
    }
    actualizar({ estado });
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
    // antes de que React vuelva a pintar. Dos toques serian dos proyectos.
    if (enviando) return;

    const encontrados = validar(borrador);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    crear.mutate(borrador, {
      onSuccess: ({ categoriaContenidoId }) => {
        // Un borrador no se ve en la app: se confirma aqui y se deja el
        // formulario limpio para el siguiente.
        if (borrador.borrador) {
          limpiar();
          setBorradorGuardado(true);
          return;
        }
        // Al visor del tipo, donde ya aparece. Si estaba debajo se vuelve a
        // el en vez de apilar otro.
        router.dismissTo(`/${PRESENTACION_SECCION.PROYECTOS.slug}/${categoriaContenidoId}` as Href);
      },
    });
  }

  const etiquetaPublicar =
    crear.fase === 'subiendo'
      ? 'Subiendo imágenes...'
      : crear.fase === 'registrando'
        ? 'Registrando proyecto...'
        : crear.fase === 'publicando'
          ? 'Publicando...'
          : crear.proyectoRegistrado
            ? 'Reintentar la publicación'
            : borrador.borrador
              ? 'Guardar borrador'
              : 'Registrar proyecto';

  // Lo que la poblacion leera bajo el titulo: donde, quien y cuando.
  const inicio = borrador.fechaInicio ? formatDateOnly(fechaSinHora(borrador.fechaInicio)) : '';
  const fin = borrador.fechaFinPrevista ? formatDateOnly(fechaSinHora(borrador.fechaFinPrevista)) : '';
  const cuando = [inicio && `Inicio: ${inicio}`, fin && `Fin previsto: ${fin}`].filter(Boolean).join(' · ');
  const donde = [borrador.comunidad.trim(), borrador.dependencia.trim()].filter(Boolean).join(' · ');
  const estado = ESTADO_PROYECTO[borrador.estado].etiqueta;
  // Solo si es valido: la vista previa no pinta una barra con 250.
  const avance = avanceDe(borrador);
  const avanceValido = avance !== undefined && Number.isInteger(avance) && avance >= 0 && avance <= 100;

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-5 pb-28">
      <View className="gap-1">
        <Text variant="title" className="text-2xl">
          Nuevo proyecto
        </Text>
        <Text variant="subtitle">
          Registra una obra municipal con su avance para que la población le dé seguimiento.
        </Text>
      </View>

      {/* Tipo de proyecto ----------------------------------------------- */}
      <Card className="gap-4">
        <Campo icono={Layers} titulo="Tipo de proyecto" requerido error={errores.categoriaContenidoId}>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {tipos.map((opcion) => (
              <OpcionMosaico
                key={opcion.id}
                nombre={opcion.nombre}
                icono={iconoDeCategoria(opcion, PRESENTACION_SECCION.PROYECTOS.icono)}
                seleccionado={borrador.categoriaContenidoId === opcion.id}
                deshabilitado={tipoBloqueado}
                lineas={4}
                onPress={() => actualizar({ categoriaContenidoId: opcion.id })}
              />
            ))}
          </View>
        </Campo>
      </Card>

      {/* Datos del proyecto --------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Datos del proyecto" />

        <Campo
          icono={FileText}
          titulo="Nombre del proyecto"
          requerido
          ayuda="Es también el título de la publicación."
        >
          <Input
            placeholder="Ej. Mejoramiento de camino rural a Chuicavioc"
            maxLength={TITULO.max}
            value={borrador.titulo}
            onChangeText={(titulo) => actualizar({ titulo })}
            error={errores.titulo}
            hint={`${borrador.titulo.length} / ${TITULO.max}`}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={MapPinned} titulo="Comunidad beneficiada" requerido>
          <Input
            placeholder="Ej. Aldea Las Majadas"
            maxLength={TEXTO_CORTO}
            value={borrador.comunidad}
            onChangeText={(comunidad) => actualizar({ comunidad })}
            error={errores.comunidad}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={Building2} titulo="Dependencia responsable" requerido>
          <Input
            placeholder="Ej. Dirección Municipal de Planificación"
            maxLength={TEXTO_CORTO}
            value={borrador.dependencia}
            onChangeText={(dependencia) => actualizar({ dependencia })}
            error={errores.dependencia}
            editable={!enviando}
          />
        </Campo>

        <Campo
          icono={CalendarDays}
          titulo="Fechas de la obra"
          requerido
          ayuda="Si aún no hay fecha de finalización prevista, déjala vacía."
        >
          <View className="gap-1.5">
            <Text variant="label">Inicio</Text>
            <SelectorFecha
              soloFecha
              valor={borrador.fechaInicio}
              placeholder="Fecha de inicio"
              error={errores.fechaInicio}
              deshabilitado={enviando}
              onCambiar={(fechaInicio) => actualizar({ fechaInicio })}
            />
          </View>
          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <Text variant="label">Finalización prevista (opcional)</Text>
              {borrador.fechaFinPrevista && (
                <Button
                  label="Quitar"
                  variant="ghost"
                  size="sm"
                  disabled={enviando}
                  onPress={() => actualizar({ fechaFinPrevista: null })}
                />
              )}
            </View>
            <SelectorFecha
              soloFecha
              valor={borrador.fechaFinPrevista}
              minimo={borrador.fechaInicio ?? undefined}
              placeholder="Fecha prevista de finalización"
              error={errores.fechaFinPrevista}
              deshabilitado={enviando}
              onCambiar={(fechaFinPrevista) => actualizar({ fechaFinPrevista })}
            />
          </View>
        </Campo>

        <Campo icono={ClipboardList} titulo="Estado del proyecto" requerido>
          <View className="flex-row flex-wrap gap-2">
            {ESTADOS.map((opcion) => (
              <Chip
                key={opcion}
                etiqueta={ESTADO_PROYECTO[opcion].etiqueta}
                seleccionado={borrador.estado === opcion}
                deshabilitado={enviando}
                onPress={() => cambiarEstado(opcion)}
              />
            ))}
          </View>
        </Campo>

        <Campo
          icono={Gauge}
          titulo="Avance de la obra (%)"
          ayuda="Solo si está comprobado. Vacío significa “sin dato”, que no es lo mismo que 0 %."
        >
          <Input
            placeholder="Ej. 45"
            keyboardType="number-pad"
            maxLength={3}
            value={borrador.avance}
            onChangeText={(texto) => actualizar({ avance: texto.replace(/\D/g, '') })}
            error={errores.avance}
            editable={!enviando}
          />
          <View className="flex-row flex-wrap gap-2">
            {AVANCES_RAPIDOS.map((valor) => (
              <Chip
                key={valor}
                etiqueta={`${valor}%`}
                seleccionado={borrador.avance.trim() === String(valor)}
                deshabilitado={enviando}
                onPress={() => actualizar({ avance: String(valor) })}
              />
            ))}
            {borrador.avance.trim() !== '' && (
              <Chip
                etiqueta="Sin dato"
                seleccionado={false}
                deshabilitado={enviando}
                onPress={() => actualizar({ avance: '' })}
              />
            )}
          </View>
          {avanceValido && <BarraAvance avance={avance} />}
        </Campo>
      </Card>

      {/* Descripcion ----------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Descripción" descripcion="Qué se construye y a quién beneficia." />

        <Campo
          icono={TextAlignStart}
          titulo="Descripción general corta"
          requerido
          ayuda="Es lo que se lee en el visor, bajo la foto."
        >
          <Input
            placeholder="Ej. Balastado, cunetas y drenajes en 2.4 km del camino rural que comunica con la cabecera."
            multiline
            maxLength={DESCRIPCION.max}
            value={borrador.descripcion}
            onChangeText={(descripcion) => actualizar({ descripcion })}
            error={errores.descripcion}
            hint={`${formatNumber(borrador.descripcion.length)} / ${formatNumber(DESCRIPCION.max)}`}
            editable={!enviando}
          />
        </Campo>

        <Campo
          icono={NotebookText}
          titulo="Detalle de la obra"
          ayuda="Opcional: alcance, metas, inversión o fuente de financiamiento. Se lee en “Sobre el proyecto”."
        >
          <Input
            placeholder="Ej. Incluye 12 drenajes transversales y muros de contención en el tramo del kilómetro 3. Inversión: Q 850,000 (fondos municipales)."
            multiline
            maxLength={TEXTO_LARGO}
            value={borrador.detalle}
            onChangeText={(detalle) => actualizar({ detalle })}
            error={errores.detalle}
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
          ayuda="Dónde está la obra. La población la abre con su app de mapas."
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
          ayuda={`Opcionales: el lugar antes de la obra, el rótulo, los trabajos (máx. ${MAX_IMAGENES_PUBLICACION}). JPG, JPEG o PNG, hasta ${MAX_MB_IMAGEN} MB cada una. La primera es la portada.`}
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
          descripcion="Además de en Proyectos, sale en el inicio (las 5 más recientes)."
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
            descripcion="Deja de verse sola en una fecha. Se sugiere un mes después del fin previsto."
            activo={borrador.fechaExpiracion !== null}
            deshabilitado={enviando}
            onCambiar={(activo) => {
              actualizar({
                fechaExpiracion: !activo
                  ? null
                  : borrador.fechaFinPrevista
                    ? sumarDias(borrador.fechaFinPrevista, DIAS_TRAS_PROYECTO)
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

        <Campo icono={Flag} titulo="Prioridad" ayuda="Ordena el proyecto dentro de su tipo.">
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
          La vista previa del proyecto se muestra abajo
        </Text>
      </View>

      <Card className="gap-4">
        <View className="gap-0.5">
          <View className="flex-row items-center gap-2">
            <Icon as={Eye} size={22} />
            <Text variant="heading">Vista previa del proyecto</Text>
          </View>
          <Text variant="caption">
            Así se verá en {['Proyectos', tipo?.nombre].filter(Boolean).join(' › ')}.
          </Text>
        </View>
        <TarjetaPublicacion
          imagenes={borrador.imagenes}
          titulo={borrador.titulo.trim()}
          descripcion={borrador.descripcion.trim()}
          detalle={[`Estado: ${estado}`, cuando, donde].filter(Boolean).join('\n')}
          placeholderTitulo="Nombre del proyecto"
          placeholderDescripcion="Aquí se mostrará la descripción corta del proyecto para la población."
        />
        {avanceValido && <BarraAvance avance={avance} compacta />}
      </Card>

      {crear.errorMessage && (
        <MensajeError
          texto={
            crear.proyectoRegistrado
              ? `El proyecto ya quedó registrado, pero no se pudo publicar: ${crear.errorMessage}`
              : crear.errorMessage
          }
        />
      )}
      {borradorGuardado && (
        <MensajeExito
          icono={CircleCheck}
          texto="Proyecto registrado y publicación guardada como borrador. No se verá en la app hasta que la publiques desde el panel."
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
