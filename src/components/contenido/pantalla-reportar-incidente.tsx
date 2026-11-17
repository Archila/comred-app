import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Building,
  CalendarClock,
  ClipboardList,
  Crosshair,
  House,
  Images,
  LayoutGrid,
  Lock,
  MapPin,
  Megaphone,
  ShieldCheck,
  Siren,
  TextAlignStart,
  Trash,
  TriangleAlert,
  Type,
} from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import {
  ESTADO_INCIDENTE,
  PRESENTACION_SECCION,
  VERIFICACION_INCIDENTE,
  iconoDeCategoria,
} from '@/constants';
import {
  leerCoordenada,
  useCategoriasContenido,
  useReportarIncidente,
  type BorradorIncidente,
} from '@/hooks';
import { useMiUbicacion } from '@/hooks/use-mi-ubicacion';
import {
  MAX_IMAGENES_PUBLICACION,
  MAX_MB_IMAGEN,
  comprimirImagen,
  elegirImagenes,
  formatNumber,
  motivoDeRechazo,
} from '@/lib';
import type {
  CategoriaContenido,
  EstadoIncidente,
  ImagenComprimida,
  VerificacionIncidente,
} from '@/models';
import { usePuedeCrearContenido } from '@/store';

import { EmptyState } from '../feedback/empty-state';
import { ErrorState } from '../feedback/error-state';
import { LoadingScreen } from '../feedback/loading-screen';
import { Screen } from '../layout/screen';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { SelectorFecha } from '../ui/selector-fecha';
import { Text } from '../ui/text';
import {
  Campo,
  Chip,
  Interruptor,
  MensajeError,
  Miniaturas,
  OpcionMosaico,
  OpcionRadio,
  TituloBloque,
  ZonaSeleccion,
} from './piezas-formulario';
import { TarjetaPublicacion } from './tarjeta-publicacion';

/**
 * Registro de un desastre desde el telefono, para administradores.
 *
 * Pide todo lo que guarda la tabla `incidente` (tipo, nombre, descripcion,
 * fecha, comunidad, coordenadas, estado, verificacion, instituciones,
 * afectaciones y recomendaciones) y, por defecto, crea ademas su primera
 * publicacion con las fotos: el visor muestra publicaciones, y un incidente
 * sin ninguna solo marcaria la tarjeta.
 *
 * Emitir una ALERTA OFICIAL exige el permiso INC_ALERTA; si falta, el API lo
 * rechaza y el mensaje se muestra tal cual.
 */

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// Los mismos limites que `CreateIncidenteDto`.
const NOMBRE = { min: 3, max: 150 };
const TEXTO_LARGO = 5000;
const COMUNIDAD = 150;
const INSTITUCIONES = 500;
/** Margen para el reloj de un telefono un poco adelantado. */
const TOLERANCIA_FUTURO = 5 * 60_000;

const ESTADOS: EstadoIncidente[] = ['REPORTADO', 'EN_EVALUACION', 'EN_ATENCION', 'CONTROLADO', 'CERRADO'];
const VERIFICACIONES: VerificacionIncidente[] = ['REPORTE', 'VERIFICADO', 'ALERTA_OFICIAL'];

type CampoFormulario =
  | 'categoriaContenidoId'
  | 'nombre'
  | 'descripcion'
  | 'comunidad'
  | 'latitud'
  | 'longitud'
  | 'fechaReporte'
  | 'instituciones'
  | 'afectaciones'
  | 'recomendaciones';
type Errores = Partial<Record<CampoFormulario, string>>;

function validar(borrador: BorradorIncidente): Errores {
  const errores: Errores = {};
  const nombre = borrador.nombre.trim().length;

  if (!borrador.categoriaContenidoId) errores.categoriaContenidoId = 'Elige el tipo de desastre.';
  if (nombre < NOMBRE.min || nombre > NOMBRE.max) {
    errores.nombre = `El nombre debe tener entre ${NOMBRE.min} y ${NOMBRE.max} caracteres.`;
  }
  if (borrador.descripcion.trim().length > TEXTO_LARGO) errores.descripcion = 'La descripción es demasiado larga.';
  if (borrador.comunidad.trim().length > COMUNIDAD) errores.comunidad = `Máximo ${COMUNIDAD} caracteres.`;
  if (borrador.instituciones.trim().length > INSTITUCIONES) {
    errores.instituciones = `Máximo ${INSTITUCIONES} caracteres.`;
  }
  if (borrador.afectaciones.trim().length > TEXTO_LARGO) errores.afectaciones = 'Es demasiado largo.';
  if (borrador.recomendaciones.trim().length > TEXTO_LARGO) errores.recomendaciones = 'Es demasiado largo.';

  if (borrador.fechaReporte.getTime() > Date.now() + TOLERANCIA_FUTURO) {
    errores.fechaReporte = 'La fecha del reporte no puede estar en el futuro.';
  }

  // Un punto en el mapa necesita las dos coordenadas, o ninguna.
  const latitud = leerCoordenada(borrador.latitud);
  const longitud = leerCoordenada(borrador.longitud);
  if ((latitud === undefined) !== (longitud === undefined)) {
    errores[latitud === undefined ? 'latitud' : 'longitud'] = 'Escribe las dos coordenadas, o ninguna.';
  }
  if (latitud !== undefined && !(latitud >= -90 && latitud <= 90)) {
    errores.latitud = 'La latitud va de -90 a 90 (en Guatemala, unos 14).';
  }
  if (longitud !== undefined && !(longitud >= -180 && longitud <= 180)) {
    errores.longitud = 'La longitud va de -180 a 180 (en Guatemala, unos -91).';
  }

  return errores;
}

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export function PantallaReportarIncidente() {
  const puedeCrear = usePuedeCrearContenido();
  const tipos = useCategoriasContenido('REPORTES', puedeCrear);

  if (!puedeCrear) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={Lock}
          title="Solo administradores"
          description="Para reportar desastres inicia sesión con una cuenta de administrador."
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
          title="Sin tipos de desastre"
          description="Configura los tipos de desastre desde el panel para poder reportar."
        />
      </Screen>
    );
  }

  return <Formulario tipos={tipos.data} />;
}

function borradorVacio(tipos: CategoriaContenido[], sugerido?: string): BorradorIncidente {
  return {
    categoriaContenidoId: tipos.find((t) => t.id === sugerido)?.id ?? '',
    nombre: '',
    descripcion: '',
    comunidad: '',
    latitud: '',
    longitud: '',
    fechaReporte: new Date(),
    estado: 'REPORTADO',
    verificacion: 'REPORTE',
    instituciones: '',
    afectaciones: '',
    recomendaciones: '',
    publicar: true,
    paginaPrincipal: false,
    imagenes: [],
  };
}

function Formulario({ tipos }: { tipos: CategoriaContenido[] }) {
  const router = useRouter();
  const { categoriaId } = useLocalSearchParams<{ categoriaId?: string }>();
  const ubicacion = useMiUbicacion();

  const [borrador, setBorrador] = useState(() => borradorVacio(tipos, categoriaId));
  const [errores, setErrores] = useState<Errores>({});
  const [procesando, setProcesando] = useState(false);
  const [avisoImagenes, setAvisoImagenes] = useState<string | null>(null);

  const reportar = useReportarIncidente();
  const enviando = reportar.isPending;
  const tipo = tipos.find((t) => t.id === borrador.categoriaContenidoId);

  function actualizar(cambios: Partial<BorradorIncidente>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    setErrores((actuales) => {
      const siguientes = { ...actuales };
      for (const campo of Object.keys(cambios) as CampoFormulario[]) delete siguientes[campo];
      return siguientes;
    });
  }

  async function usarMiUbicacion() {
    const coordenadas = await ubicacion.ubicar();
    if (!coordenadas) return;
    // Seis decimales: unos 10 cm, lo mismo que guarda el API.
    actualizar({
      latitud: coordenadas.latitud.toFixed(6),
      longitud: coordenadas.longitud.toFixed(6),
    });
  }

  async function seleccionarImagenes() {
    const restantes = MAX_IMAGENES_PUBLICACION - borrador.imagenes.length;
    if (restantes <= 0 || procesando || enviando) return;

    setAvisoImagenes(null);
    const rechazos: string[] = [];
    try {
      const elegidas = await elegirImagenes(restantes);
      if (elegidas.length === 0) return;

      setProcesando(true);
      const nuevas: ImagenComprimida[] = [];
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
    reportar.olvidar();
    setErrores({});
    setAvisoImagenes(null);
    setBorrador(borradorVacio(tipos, categoriaId));
  }

  function registrar() {
    if (enviando) return;

    const encontrados = validar(borrador);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    reportar.mutate(borrador, {
      // Al visor del tipo de desastre, donde ya aparece. Si estaba debajo se
      // vuelve a el en vez de apilar otro.
      onSuccess: ({ categoriaContenidoId }) =>
        router.dismissTo(
          `/${PRESENTACION_SECCION.REPORTES.slug}/${categoriaContenidoId}` as Href,
        ),
    });
  }

  const etiquetaBoton =
    reportar.fase === 'subiendo'
      ? 'Subiendo imágenes...'
      : reportar.fase === 'registrando'
        ? 'Registrando reporte...'
        : reportar.fase === 'publicando'
          ? 'Publicando...'
          : reportar.incidenteRegistrado
            ? 'Reintentar la publicación'
            : 'Registrar reporte';

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-5 pb-28">
      <View className="gap-1">
        <Text variant="title" className="text-2xl">
          Reportar desastre
        </Text>
        <Text variant="subtitle">
          Registra el evento para que la población lo vea en Reportes de desastres.
        </Text>
      </View>

      {/* Tipo de desastre ------------------------------------------------ */}
      <Card className="gap-4">
        <Campo
          icono={TriangleAlert}
          titulo="Tipo de desastre"
          requerido
          error={errores.categoriaContenidoId}
        >
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {tipos.map((opcion) => (
              <OpcionMosaico
                key={opcion.id}
                nombre={opcion.nombre}
                icono={iconoDeCategoria(opcion, PRESENTACION_SECCION.REPORTES.icono)}
                seleccionado={borrador.categoriaContenidoId === opcion.id}
                deshabilitado={enviando || reportar.incidenteRegistrado}
                onPress={() => actualizar({ categoriaContenidoId: opcion.id })}
              />
            ))}
          </View>
        </Campo>
      </Card>

      {/* Que paso ---------------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="¿Qué pasó?" />

        <Campo icono={Type} titulo="Nombre del reporte" requerido ayuda="Lo primero que se lee: qué y dónde.">
          <Input
            placeholder="Ej: Derrumbe en ruta a Llanos del Pinal"
            maxLength={NOMBRE.max}
            value={borrador.nombre}
            onChangeText={(nombre) => actualizar({ nombre })}
            error={errores.nombre}
            hint={`${borrador.nombre.length} / ${NOMBRE.max}`}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={TextAlignStart} titulo="Descripción" ayuda="Qué ocurrió, magnitud y situación actual.">
          <Input
            placeholder="Describe lo ocurrido..."
            multiline
            maxLength={TEXTO_LARGO}
            value={borrador.descripcion}
            onChangeText={(descripcion) => actualizar({ descripcion })}
            error={errores.descripcion}
            hint={`${formatNumber(borrador.descripcion.length)} / ${formatNumber(TEXTO_LARGO)}`}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={CalendarClock} titulo="Fecha y hora del reporte" error={errores.fechaReporte}>
          <SelectorFecha
            valor={borrador.fechaReporte}
            placeholder="Fecha y hora"
            deshabilitado={enviando}
            onCambiar={(fechaReporte) => actualizar({ fechaReporte })}
          />
        </Campo>
      </Card>

      {/* Donde --------------------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="¿Dónde?" descripcion="Con coordenadas, el incidente aparece en el mapa." />

        <Campo icono={MapPin} titulo="Comunidad o lugar">
          <Input
            placeholder="Ej: Aldea Las Majadas, km 12"
            maxLength={COMUNIDAD}
            value={borrador.comunidad}
            onChangeText={(comunidad) => actualizar({ comunidad })}
            error={errores.comunidad}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={Crosshair} titulo="Ubicación exacta" ayuda="Estando en el lugar, usa la del teléfono.">
          <Button
            label={ubicacion.buscando ? 'Buscando ubicación...' : 'Usar mi ubicación'}
            icon={Crosshair}
            variant="outline"
            fullWidth
            loading={ubicacion.buscando}
            disabled={enviando}
            onPress={() => void usarMiUbicacion()}
          />
          {ubicacion.error && <Text variant="error">{ubicacion.error}</Text>}
          <View className="flex-row gap-3">
            <Input
              label="Latitud"
              placeholder="14.9850"
              keyboardType="numbers-and-punctuation"
              value={borrador.latitud}
              onChangeText={(latitud) => actualizar({ latitud })}
              error={errores.latitud}
              editable={!enviando}
              containerClassName="flex-1"
            />
            <Input
              label="Longitud"
              placeholder="-91.5470"
              keyboardType="numbers-and-punctuation"
              value={borrador.longitud}
              onChangeText={(longitud) => actualizar({ longitud })}
              error={errores.longitud}
              editable={!enviando}
              containerClassName="flex-1"
            />
          </View>
        </Campo>
      </Card>

      {/* Situacion ------------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Situación" />

        <Campo icono={ClipboardList} titulo="Estado del incidente">
          <View className="flex-row flex-wrap gap-2">
            {ESTADOS.map((estado) => (
              <Chip
                key={estado}
                etiqueta={ESTADO_INCIDENTE[estado].etiqueta}
                seleccionado={borrador.estado === estado}
                deshabilitado={enviando}
                onPress={() => actualizar({ estado })}
              />
            ))}
          </View>
        </Campo>

        <Campo
          icono={ShieldCheck}
          titulo="Nivel de verificación"
          ayuda="La población lo ve como etiqueta. La alerta oficial exige permiso especial."
        >
          <View className="gap-2">
            {VERIFICACIONES.map((verificacion) => (
              <OpcionRadio
                key={verificacion}
                icono={VERIFICACION_INCIDENTE[verificacion].icono}
                etiqueta={VERIFICACION_INCIDENTE[verificacion].etiqueta}
                descripcion={VERIFICACION_INCIDENTE[verificacion].descripcion}
                seleccionada={borrador.verificacion === verificacion}
                deshabilitado={enviando}
                onPress={() => actualizar({ verificacion })}
              />
            ))}
          </View>
        </Campo>
      </Card>

      {/* Atencion -------------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Atención" descripcion="Opcional. Se muestra en el detalle del incidente." />

        <Campo icono={Building} titulo="Instituciones que atienden">
          <Input
            placeholder="Ej: COMRED, Bomberos Voluntarios, PNC"
            maxLength={INSTITUCIONES}
            value={borrador.instituciones}
            onChangeText={(instituciones) => actualizar({ instituciones })}
            error={errores.instituciones}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={TriangleAlert} titulo="Afectaciones" ayuda="Solo lo ya verificado: viviendas, personas, vías.">
          <Input
            placeholder="Ej: 3 viviendas dañadas, paso cerrado"
            multiline
            maxLength={TEXTO_LARGO}
            value={borrador.afectaciones}
            onChangeText={(afectaciones) => actualizar({ afectaciones })}
            error={errores.afectaciones}
            editable={!enviando}
          />
        </Campo>

        <Campo icono={Megaphone} titulo="Recomendaciones a la población">
          <Input
            placeholder="Ej: Evite transitar por la zona y use rutas alternas"
            multiline
            maxLength={TEXTO_LARGO}
            value={borrador.recomendaciones}
            onChangeText={(recomendaciones) => actualizar({ recomendaciones })}
            error={errores.recomendaciones}
            editable={!enviando}
          />
        </Campo>
      </Card>

      {/* Publicacion ----------------------------------------------------- */}
      <Card className="gap-6">
        <TituloBloque titulo="Publicación en la app" />

        <Interruptor
          icono={Siren}
          etiqueta="Publicar en el visor"
          descripcion="Crea la primera publicación del incidente con su nombre, descripción y fotos. Sin ella, el reporte solo marca la tarjeta."
          activo={borrador.publicar}
          deshabilitado={enviando}
          onCambiar={(publicar) => actualizar({ publicar })}
        />

        {borrador.publicar && (
          <>
            <Interruptor
              icono={House}
              etiqueta="Mostrar en la página principal"
              descripcion="Además de en Reportes, sale en el inicio."
              activo={borrador.paginaPrincipal}
              deshabilitado={enviando}
              onCambiar={(paginaPrincipal) => actualizar({ paginaPrincipal })}
            />

            <Campo
              icono={Images}
              titulo="Fotografías"
              ayuda={`Opcionales, pero ayudan mucho (máx. ${MAX_IMAGENES_PUBLICACION}). JPG, JPEG o PNG, hasta ${MAX_MB_IMAGEN} MB cada una.`}
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

            <View className="gap-2">
              <Text variant="label">Vista previa</Text>
              <TarjetaPublicacion
                imagenes={borrador.imagenes}
                titulo={borrador.nombre.trim()}
                descripcion={borrador.descripcion.trim()}
                detalle={[tipo?.nombre, borrador.comunidad.trim()].filter(Boolean).join(' · ')}
                placeholderTitulo="Nombre del reporte"
                placeholderDescripcion="Aquí se mostrará la descripción del incidente."
              />
            </View>
          </>
        )}
      </Card>

      {reportar.errorMessage && (
        <MensajeError
          texto={
            reportar.incidenteRegistrado
              ? `El reporte ya quedó registrado, pero no se pudo publicar: ${reportar.errorMessage}`
              : reportar.errorMessage
          }
        />
      )}

      <View className="gap-3">
        <Button
          label={etiquetaBoton}
          icon={Siren}
          size="lg"
          fullWidth
          loading={enviando}
          disabled={procesando}
          onPress={registrar}
        />
        <Button
          label="Limpiar formulario"
          icon={Trash}
          variant="outline"
          size="lg"
          fullWidth
          disabled={enviando || procesando}
          onPress={limpiar}
        />
      </View>
    </Screen>
  );
}
