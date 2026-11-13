import { useRouter } from 'expo-router';
import { Check, Megaphone, Send, TriangleAlert, Users } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, Switch, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  LoadingScreen,
  Screen,
  Text,
} from '@/components';
import { ALCANCE_MENSAJE, ORDEN_ALCANCES, TIPO_MENSAJE, TIPOS_MENSAJE } from '@/constants';
import { useCapacidadesEnvio, useEnviarMensaje, usePreviewMensaje } from '@/hooks';
import { cn, formatNumber } from '@/lib';
import type {
  AlcanceMensaje,
  AlcancePayload,
  CapacidadesEnvio,
  CategoriaDestino,
  CrearMensajePayload,
  PreviewMensaje,
  TipoMensaje,
} from '@/models';
import { useBrandColors } from '@/store';

/**
 * Envio de avisos desde el telefono, para quien tiene permiso de enviar.
 *
 * Dos pasos, y el segundo no se puede saltar:
 *   1. Redactar: tipo, a quien, titulo y mensaje.
 *   2. Confirmar: el API dice a cuantos telefonos llega ANTES de enviar. En
 *      una emergencia, ese numero es lo que evita mandarle una alerta a toda la
 *      municipalidad por error.
 * Al enviar se reemplaza esta pantalla por el detalle del aviso, que sigue el
 * reparto en vivo. Reemplazar y no apilar: volver atras no debe dejar el
 * formulario lleno y listo para mandarlo otra vez.
 *
 * Lo que se ofrece (alcances y grupos) sale de `useCapacidadesEnvio`, pero el
 * API lo vuelve a validar todo: si un permiso cambio mientras tanto, el envio
 * se rechaza con un mensaje que se muestra tal cual.
 */

/* -------------------------------------------------------------------------- */
/* Reglas del formulario                                                       */
/* -------------------------------------------------------------------------- */

// Los mismos limites que `CrearMensajeDto` y `AlcanceMensajeDto` del API, para
// no gastar un viaje de red (ni una de las 30 vistas previas por minuto).
const TITULO = { min: 3, max: 120 };
const CUERPO = { min: 3, max: 1000 };
const MAX_DESTINOS = 50;

function requiereDestinos(alcance: AlcanceMensaje | null): boolean {
  return alcance === 'CATEGORIA' || alcance === 'SUBCATEGORIA';
}

/**
 * Alcances que de verdad se pueden usar. Uno por grupos sin ningun grupo
 * disponible (el operador al que aun no asignaron subcategoria) no se
 * ofrece: seria un camino sin salida.
 */
function alcancesDisponibles(capacidades: CapacidadesEnvio): AlcanceMensaje[] {
  return ORDEN_ALCANCES.filter(
    (alcance) =>
      capacidades.alcances.includes(alcance) &&
      (!requiereDestinos(alcance) || capacidades.categorias.length > 0),
  );
}

interface Borrador {
  /** Sin valor por defecto: el tipo decide si suena, y debe elegirse a conciencia. */
  tipo: TipoMensaje | null;
  /** Prioridad ALTA para alerta e informativo. Una emergencia ya lo es siempre. */
  urgente: boolean;
  alcance: AlcanceMensaje | null;
  destinos: string[];
  titulo: string;
  cuerpo: string;
}

type Errores = Partial<Record<'tipo' | 'alcance' | 'destinos' | 'titulo' | 'cuerpo', string>>;

function borradorVacio(alcances: AlcanceMensaje[]): Borrador {
  return {
    tipo: null,
    urgente: false,
    // Si solo hay una opcion, preguntarla no aporta nada.
    alcance: alcances.length === 1 ? alcances[0] : null,
    destinos: [],
    titulo: '',
    cuerpo: '',
  };
}

function validar(borrador: Borrador): Errores {
  const errores: Errores = {};
  const titulo = borrador.titulo.trim().length;
  const cuerpo = borrador.cuerpo.trim().length;

  if (!borrador.tipo) errores.tipo = 'Elige el tipo de aviso.';
  if (!borrador.alcance) errores.alcance = 'Elige a quien va dirigido.';
  if (requiereDestinos(borrador.alcance)) {
    if (borrador.destinos.length === 0) errores.destinos = 'Elige al menos un destino.';
    if (borrador.destinos.length > MAX_DESTINOS) {
      errores.destinos = `Puedes elegir como maximo ${MAX_DESTINOS}.`;
    }
  }
  if (titulo < TITULO.min || titulo > TITULO.max) {
    errores.titulo = `El titulo debe tener entre ${TITULO.min} y ${TITULO.max} caracteres.`;
  }
  if (cuerpo < CUERPO.min || cuerpo > CUERPO.max) {
    errores.cuerpo = `El mensaje debe tener entre ${CUERPO.min} y ${CUERPO.max} caracteres.`;
  }

  return errores;
}

/** Solo se llama con un borrador ya validado. */
function alcanceDe(borrador: Borrador): AlcancePayload {
  const alcance = borrador.alcance!;
  return requiereDestinos(alcance) ? { alcance, destinos: borrador.destinos } : { alcance };
}

function mensajeDe(borrador: Borrador): CrearMensajePayload {
  const tipo = borrador.tipo!;
  return {
    ...alcanceDe(borrador),
    tipo,
    titulo: borrador.titulo.trim(),
    cuerpo: borrador.cuerpo.trim(),
    prioridad: tipo === 'EMERGENCIA' || borrador.urgente ? 'ALTA' : 'NORMAL',
  };
}

/** Nombres de lo elegido, para que la confirmacion diga a quien va. */
function nombresDestinos(borrador: Borrador, categorias: CategoriaDestino[]): string[] {
  if (borrador.alcance === 'CATEGORIA') {
    return categorias.filter((c) => borrador.destinos.includes(c.id)).map((c) => c.nombre);
  }
  if (borrador.alcance === 'SUBCATEGORIA') {
    return categorias
      .flatMap((c) => c.subcategorias)
      .filter((s) => borrador.destinos.includes(s.id))
      .map((s) => s.nombre);
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/* Pantalla                                                                    */
/* -------------------------------------------------------------------------- */

export default function NuevoAvisoScreen() {
  const { data: capacidades, isLoading, isError, error, refetch } = useCapacidadesEnvio();

  if (isLoading) return <LoadingScreen message="Cargando..." />;
  if (isError || !capacidades) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  // La pestana solo se monta con `puedeEnviar`, pero los permisos pueden
  // cambiar mientras la pantalla esta abierta.
  const alcances = alcancesDisponibles(capacidades);
  if (!capacidades.puedeEnviar || alcances.length === 0) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={Megaphone}
          title="No puedes enviar avisos"
          description={
            capacidades.puedeEnviar
              ? 'Aun no tienes grupos asignados. Pide a un administrador que te asigne a uno.'
              : 'Tu rol no permite enviar avisos. Si lo necesitas, pidelo a un administrador.'
          }
        />
      </Screen>
    );
  }

  return <EnvioAviso capacidades={capacidades} alcances={alcances} />;
}

type Paso = 'redactar' | 'confirmar';

function EnvioAviso({
  capacidades,
  alcances,
}: {
  capacidades: CapacidadesEnvio;
  alcances: AlcanceMensaje[];
}) {
  const router = useRouter();
  const [borrador, setBorrador] = useState<Borrador>(() => borradorVacio(alcances));
  const [errores, setErrores] = useState<Errores>({});
  const [paso, setPaso] = useState<Paso>('redactar');
  const [conteo, setConteo] = useState<PreviewMensaje | null>(null);

  const preview = usePreviewMensaje();
  const enviar = useEnviarMensaje();

  function actualizar(cambios: Partial<Borrador>) {
    setBorrador((actual) => ({ ...actual, ...cambios }));
    // El error de un campo desaparece en cuanto se toca: seguir viendolo
    // despues de corregirlo hace pensar que la correccion no sirvio.
    setErrores((actuales) => {
      const siguientes = { ...actuales };
      for (const campo of Object.keys(cambios) as (keyof Errores)[]) delete siguientes[campo];
      return siguientes;
    });
  }

  function revisar() {
    const encontrados = validar(borrador);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    preview.mutate(alcanceDe(borrador), {
      onSuccess: (resultado) => {
        setConteo(resultado);
        setPaso('confirmar');
      },
    });
  }

  function confirmar() {
    // `isPending` ya deshabilita el boton; esto cubre el doble toque que llega
    // antes de que React vuelva a pintar. Dos toques serian dos avisos.
    if (enviar.isPending) return;
    enviar.mutate(mensajeDe(borrador), {
      onSuccess: ({ id }) =>
        router.replace({ pathname: '/mensajes/[id]', params: { id, recien: '1' } }),
    });
  }

  function volverAEditar() {
    enviar.reset();
    setPaso('redactar');
  }

  if (paso === 'confirmar' && conteo) {
    return (
      <Confirmacion
        borrador={borrador}
        categorias={capacidades.categorias}
        conteo={conteo}
        enviando={enviar.isPending}
        errorMessage={enviar.errorMessage}
        onConfirmar={confirmar}
        onEditar={volverAEditar}
      />
    );
  }

  return (
    <Screen scrollable avoidKeyboard edges={['bottom']} contentClassName="gap-6 pb-8">
      <Seccion titulo="Tipo de aviso" error={errores.tipo}>
        {TIPOS_MENSAJE.map((tipo) => (
          <OpcionTipo
            key={tipo}
            tipo={tipo}
            seleccionado={borrador.tipo === tipo}
            onPress={() => actualizar({ tipo })}
          />
        ))}

        {borrador.tipo && borrador.tipo !== 'EMERGENCIA' && (
          <EntregaInmediata
            activa={borrador.urgente}
            onCambiar={(urgente) => actualizar({ urgente })}
          />
        )}
      </Seccion>

      <Seccion titulo="Para quien" error={errores.alcance}>
        {alcances.map((alcance) => (
          <Opcion
            key={alcance}
            etiqueta={ALCANCE_MENSAJE[alcance].etiqueta}
            descripcion={ALCANCE_MENSAJE[alcance].descripcion}
            seleccionada={borrador.alcance === alcance}
            // Los ids de categoria no sirven como subcategoria ni al reves.
            onPress={() => actualizar({ alcance, destinos: [] })}
          />
        ))}
      </Seccion>

      {requiereDestinos(borrador.alcance) && (
        <SelectorDestinos
          alcance={borrador.alcance!}
          categorias={capacidades.categorias}
          puedeTodas={capacidades.puedeTodas}
          seleccion={borrador.destinos}
          error={errores.destinos}
          onCambiar={(destinos) => actualizar({ destinos })}
        />
      )}

      <Seccion titulo="Mensaje">
        <Input
          label="Titulo"
          placeholder="Ej: Corte de agua en zona 1"
          maxLength={TITULO.max}
          value={borrador.titulo}
          onChangeText={(titulo) => actualizar({ titulo })}
          error={errores.titulo}
          hint={`${borrador.titulo.length}/${TITULO.max}`}
          editable={!preview.isPending}
        />
        <Input
          label="Texto del aviso"
          placeholder="Que paso, que debe hacer la poblacion y donde informarse."
          multiline
          maxLength={CUERPO.max}
          value={borrador.cuerpo}
          onChangeText={(cuerpo) => actualizar({ cuerpo })}
          error={errores.cuerpo}
          hint={`${borrador.cuerpo.length}/${CUERPO.max}`}
          editable={!preview.isPending}
        />
      </Seccion>

      {preview.errorMessage && <MensajeError texto={preview.errorMessage} />}

      <Button
        label="Revisar envio"
        icon={Users}
        fullWidth
        size="lg"
        loading={preview.isPending}
        onPress={revisar}
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Paso 2                                                                      */
/* -------------------------------------------------------------------------- */

function Confirmacion({
  borrador,
  categorias,
  conteo,
  enviando,
  errorMessage,
  onConfirmar,
  onEditar,
}: {
  borrador: Borrador;
  categorias: CategoriaDestino[];
  conteo: PreviewMensaje;
  enviando: boolean;
  errorMessage: string | null;
  onConfirmar: () => void;
  onEditar: () => void;
}) {
  const tipo = borrador.tipo!;
  const estilo = TIPO_MENSAJE[tipo];
  const destinos = nombresDestinos(borrador, categorias);
  const esEmergencia = tipo === 'EMERGENCIA';
  const sinDestinatarios = conteo.total === 0;

  return (
    <Screen scrollable edges={['bottom']} contentClassName="gap-4 pb-8">
      <Text variant="title">Revisa antes de enviar</Text>

      {/* Asi lo vera quien lo reciba en su bandeja. */}
      <Card className={cn('gap-2 border-l-4', estilo.borde)}>
        <View className="flex-row items-center gap-2">
          <Icon as={estilo.icono} size={16} className={estilo.texto} />
          <Text variant="caption" className={cn('font-semibold uppercase', estilo.texto)}>
            {estilo.etiqueta}
            {tipo !== 'EMERGENCIA' && borrador.urgente ? ' - entrega inmediata' : ''}
          </Text>
        </View>
        <Text variant="heading">{borrador.titulo.trim()}</Text>
        <Text variant="body">{borrador.cuerpo.trim()}</Text>
      </Card>

      <Card className="gap-1">
        <Text variant="label">Para</Text>
        <Text variant="body">{ALCANCE_MENSAJE[borrador.alcance!].etiqueta}</Text>
        {destinos.length > 0 && <Text variant="caption">{destinos.join(', ')}</Text>}
      </Card>

      <Card className="gap-2">
        <View className="flex-row items-center gap-2">
          <Icon as={Users} size={20} className="text-primary-600 dark:text-primary-400" />
          <Text variant="heading" className="flex-1">
            Llega a {formatNumber(conteo.total)} {conteo.total === 1 ? 'telefono' : 'telefonos'}
          </Text>
        </View>
        {!sinDestinatarios && (
          <Text variant="body">
            A {formatNumber(conteo.conPush)} les sonara la notificacion.
          </Text>
        )}
        {conteo.sinPush > 0 && (
          <Text variant="body">
            {formatNumber(conteo.sinPush)} solo lo {conteo.sinPush === 1 ? 'vera' : 'veran'} al
            abrir la app: tienen las notificaciones desactivadas.
          </Text>
        )}
      </Card>

      {sinDestinatarios && (
        <MensajeError texto="Este aviso no llegaria a nadie: no hay telefonos registrados para ese destino. Vuelve a editar y elige otro." />
      )}

      {errorMessage && <MensajeError texto={errorMessage} />}

      <Button
        label={esEmergencia ? 'Enviar emergencia' : 'Confirmar y enviar'}
        variant={esEmergencia ? 'danger' : 'primary'}
        icon={Send}
        size="lg"
        fullWidth
        loading={enviando}
        disabled={sinDestinatarios}
        onPress={onConfirmar}
      />
      <Button
        label="Volver a editar"
        variant="outline"
        fullWidth
        disabled={enviando}
        onPress={onEditar}
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Piezas del formulario                                                       */
/* -------------------------------------------------------------------------- */

function Seccion({
  titulo,
  ayuda,
  error,
  children,
}: {
  titulo: string;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <View className="gap-0.5">
        <Text variant="heading">{titulo}</Text>
        {ayuda && <Text variant="caption">{ayuda}</Text>}
      </View>
      {children}
      {error && <Text variant="error">{error}</Text>}
    </View>
  );
}

// Las opciones no usan `Card`: su borde de seleccion chocaria con el borde
// base de la tarjeta, y `cn` no resuelve ese conflicto.
const OPCION_BASE = 'flex-row items-center gap-3 rounded-card border-2 p-4';
const OPCION_NORMAL = 'border-line bg-surface dark:border-line-dark dark:bg-surface-dark-muted';

function OpcionTipo({
  tipo,
  seleccionado,
  onPress,
}: {
  tipo: TipoMensaje;
  seleccionado: boolean;
  onPress: () => void;
}) {
  const estilo = TIPO_MENSAJE[tipo];

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionado }}
      onPress={onPress}
      className={cn(OPCION_BASE, seleccionado ? estilo.seleccion : OPCION_NORMAL)}
    >
      <Icon as={estilo.icono} size={24} className={estilo.texto} />
      <View className="flex-1 gap-0.5">
        <Text variant="heading" className={estilo.texto}>
          {estilo.etiqueta}
        </Text>
        <Text variant="caption">{estilo.descripcion}</Text>
      </View>
      <Marca forma="radio" marcada={seleccionado} />
    </Pressable>
  );
}

function Opcion({
  etiqueta,
  descripcion,
  seleccionada,
  onPress,
}: {
  etiqueta: string;
  descripcion: string;
  seleccionada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: seleccionada }}
      onPress={onPress}
      className={cn(
        OPCION_BASE,
        seleccionada
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
          : OPCION_NORMAL,
      )}
    >
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="font-semibold">
          {etiqueta}
        </Text>
        <Text variant="caption">{descripcion}</Text>
      </View>
      <Marca forma="radio" marcada={seleccionada} />
    </Pressable>
  );
}

function SelectorDestinos({
  alcance,
  categorias,
  puedeTodas,
  seleccion,
  error,
  onCambiar,
}: {
  alcance: AlcanceMensaje;
  categorias: CategoriaDestino[];
  puedeTodas: boolean;
  seleccion: string[];
  error?: string;
  onCambiar: (destinos: string[]) => void;
}) {
  const alternar = (id: string) =>
    onCambiar(seleccion.includes(id) ? seleccion.filter((x) => x !== id) : [...seleccion, id]);

  const porCategoria = alcance === 'CATEGORIA';

  return (
    <Seccion
      titulo={porCategoria ? 'Categorias' : 'Grupos'}
      ayuda={puedeTodas ? undefined : 'Solo puedes avisar a los grupos a los que perteneces.'}
      error={error}
    >
      <Card className="gap-1 py-2">
        {porCategoria
          ? categorias.map((categoria) => (
              <Casilla
                key={categoria.id}
                etiqueta={categoria.nombre}
                marcada={seleccion.includes(categoria.id)}
                onPress={() => alternar(categoria.id)}
              />
            ))
          : categorias.map((categoria) => (
              <View key={categoria.id} className="gap-1 py-1">
                <Text variant="label" className="uppercase">
                  {categoria.nombre}
                </Text>
                {categoria.subcategorias.map((subcategoria) => (
                  <Casilla
                    key={subcategoria.id}
                    etiqueta={subcategoria.nombre}
                    marcada={seleccion.includes(subcategoria.id)}
                    onPress={() => alternar(subcategoria.id)}
                  />
                ))}
              </View>
            ))}
      </Card>
    </Seccion>
  );
}

function Casilla({
  etiqueta,
  marcada,
  onPress,
}: {
  etiqueta: string;
  marcada: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-3"
    >
      <Marca forma="casilla" marcada={marcada} />
      <Text variant="body" className="flex-1">
        {etiqueta}
      </Text>
    </Pressable>
  );
}

function Marca({ forma, marcada }: { forma: 'radio' | 'casilla'; marcada: boolean }) {
  return (
    <View
      className={cn(
        'h-6 w-6 items-center justify-center border-2',
        forma === 'radio' ? 'rounded-full' : 'rounded-md',
        marcada
          ? 'border-primary-500 bg-primary-500'
          : 'border-line-strong dark:border-line-dark-strong',
      )}
    >
      {marcada && <Icon as={Check} size={14} className="text-primary-foreground" />}
    </View>
  );
}

function EntregaInmediata({
  activa,
  onCambiar,
}: {
  activa: boolean;
  onCambiar: (activa: boolean) => void;
}) {
  const brand = useBrandColors();

  return (
    <View className={cn(OPCION_BASE, OPCION_NORMAL)}>
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="font-semibold">
          Entrega inmediata
        </Text>
        <Text variant="caption">
          Despierta al telefono aunque este en reposo. Usala solo si el aviso no puede esperar.
        </Text>
      </View>
      <Switch
        value={activa}
        onValueChange={onCambiar}
        trackColor={{ true: brand.primary }}
        accessibilityLabel="Entrega inmediata"
      />
    </View>
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
