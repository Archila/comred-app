import { useLocalSearchParams } from 'expo-router';
import { CircleCheck, Eye, Lock, RotateCcw, Smartphone, UserRound } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Insignia,
  LoadingScreen,
  Screen,
  Text,
} from '@/components';
import { ALCANCE_MENSAJE, ESTADO_ENVIO, ESTADO_MENSAJE, TIPO_MENSAJE } from '@/constants';
import {
  enCurso,
  useCapacidadesEnvio,
  useEnviosMensaje,
  useMensaje,
  useReintentarMensaje,
} from '@/hooks';
import { cn, formatDateTime, formatNumber, parseApiDate } from '@/lib';
import type { CapacidadesEnvio, EnvioMensaje, MensajeDetalle } from '@/models';
import { useBrandColors } from '@/store';

/**
 * Detalle de un aviso enviado: si llego, a cuantos les sono y quien lo leyo.
 *
 * Se actualiza solo mientras el aviso se reparte (ver `useMensaje`) y al
 * volver a primer plano: los acuses llegan cuando la gente abre la app, asi
 * que este numero sigue creciendo despues de cerrado el envio.
 *
 * La lista de quien leyo exige `MSG_AUDITORIA`, aparte del `MSG_LEER` que
 * pide el resto de la pantalla: expone quien tenia sesion en cada telefono.
 */
export default function DetalleAvisoScreen() {
  const { id, recien } = useLocalSearchParams<{ id: string; recien?: string }>();
  const { data: capacidades } = useCapacidadesEnvio();
  const { data: mensaje, isLoading, isError, error, refetch, dataUpdatedAt } = useMensaje(id);

  if (isLoading || !capacidades) return <LoadingScreen message="Cargando aviso..." />;
  if (isError || !mensaje) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <Detalle
      mensaje={mensaje}
      capacidades={capacidades}
      recienEnviado={recien === '1'}
      consultadoEn={dataUpdatedAt}
      onRefrescar={() => refetch()}
    />
  );
}

type Filtro = 'leyeron' | 'pendientes';

function Detalle({
  mensaje,
  capacidades,
  recienEnviado,
  consultadoEn,
  onRefrescar,
}: {
  mensaje: MensajeDetalle;
  capacidades: CapacidadesEnvio;
  recienEnviado: boolean;
  /** Cuando se trajo el detalle: hace de "ahora" sin llamar a `Date.now()` al pintar. */
  consultadoEn: number;
  onRefrescar: () => void;
}) {
  const brand = useBrandColors();
  const [filtro, setFiltro] = useState<Filtro>('leyeron');
  const auditoria = capacidades.puedeVerAuditoria;

  const envios = useEnviosMensaje(mensaje.id, { leido: filtro === 'leyeron' }, auditoria);
  const filas = useMemo(
    () => envios.data?.pages.flatMap((pagina) => pagina.items) ?? [],
    [envios.data],
  );

  // Al cerrar el reparto aparecen de golpe todas las filas de entrega: la
  // lista se pidio mientras aun estaba a medias.
  const { refetch: refetchEnvios } = envios;
  const repartiendo = enCurso(mensaje.estado);
  const estabaRepartiendo = useRef(repartiendo);
  useEffect(() => {
    if (estabaRepartiendo.current && !repartiendo && auditoria) void refetchEnvios();
    estabaRepartiendo.current = repartiendo;
  }, [repartiendo, auditoria, refetchEnvios]);

  const [refrescando, setRefrescando] = useState(false);
  async function refrescar() {
    setRefrescando(true);
    try {
      await Promise.all([onRefrescar(), auditoria ? envios.refetch() : null]);
    } finally {
      setRefrescando(false);
    }
  }

  return (
    <Screen edges={['bottom']} contentClassName="p-0">
      <FlatList
        data={auditoria ? filas : []}
        keyExtractor={(envio) => envio.id}
        contentContainerClassName="grow gap-3 p-4"
        ListHeaderComponent={
          <View className="gap-4 pb-1">
            {recienEnviado && (
              <View className="flex-row items-center gap-2 rounded-field border border-success-500 bg-success-50 p-3 dark:bg-success-500/10">
                <Icon as={CircleCheck} size={18} className="text-success-700 dark:text-success-500" />
                <Text variant="body" className="flex-1">
                  Aviso enviado. Esta pantalla se actualiza sola mientras se reparte.
                </Text>
              </View>
            )}

            <Encabezado mensaje={mensaje} />
            <Resumen mensaje={mensaje} />
            {capacidades.puedeEnviar && <Reintento mensaje={mensaje} ahora={consultadoEn} />}

            {auditoria ? (
              <Segmento
                filtro={filtro}
                onCambiar={setFiltro}
                leyeron={mensaje.resumen.leidos}
                pendientes={mensaje.resumen.total - mensaje.resumen.leidos}
              />
            ) : (
              <Card className="flex-row items-center gap-3">
                <Icon as={Lock} size={18} className="text-content-muted dark:text-content-dark-muted" />
                <Text variant="caption" className="flex-1">
                  Tu rol permite ver cuantos lo leyeron, pero no quienes. Si lo necesitas, pidelo a
                  un administrador.
                </Text>
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          !auditoria || repartiendo ? null : envios.isLoading ? (
            <ActivityIndicator color={brand.primary} />
          ) : envios.isError ? (
            <ErrorState error={envios.error} onRetry={() => envios.refetch()} />
          ) : (
            <EmptyState
              icon={filtro === 'leyeron' ? Eye : CircleCheck}
              title={filtro === 'leyeron' ? 'Nadie lo ha leido todavia' : 'Todos lo leyeron'}
              description={
                filtro === 'leyeron'
                  ? 'Cada persona aparece aqui al abrir el aviso en su telefono.'
                  : undefined
              }
            />
          )
        }
        renderItem={({ item }) => <FilaEnvio envio={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => void refrescar()}
            colors={[brand.primary]}
            tintColor={brand.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (envios.hasNextPage && !envios.isFetchingNextPage) void envios.fetchNextPage();
        }}
        ListFooterComponent={
          envios.isFetchingNextPage ? <ActivityIndicator color={brand.primary} /> : null
        }
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Cabecera                                                                    */
/* -------------------------------------------------------------------------- */

function Encabezado({ mensaje }: { mensaje: MensajeDetalle }) {
  const tipo = TIPO_MENSAJE[mensaje.tipo];
  const estado = ESTADO_MENSAJE[mensaje.estado];

  // Para ORGANIZACION y DISPOSITIVOS el destino guardado es la propia
  // organizacion: repetir su nombre no dice nada que no diga el alcance.
  const destinos =
    mensaje.alcance === 'CATEGORIA' || mensaje.alcance === 'SUBCATEGORIA'
      ? mensaje.destinos.map((d) => d.destinoNombre).filter(Boolean)
      : [];

  return (
    <>
      <Card className={cn('gap-2 border-l-4', tipo.borde)}>
        <View className="flex-row items-center gap-2">
          <Icon as={tipo.icono} size={16} className={tipo.texto} />
          <Text variant="caption" className={cn('flex-1 font-semibold uppercase', tipo.texto)}>
            {tipo.etiqueta}
            {mensaje.tipo !== 'EMERGENCIA' && mensaje.prioridad === 'ALTA'
              ? ' - entrega inmediata'
              : ''}
          </Text>
          <Insignia etiqueta={estado.etiqueta} fondo={estado.fondo} texto={estado.texto} />
        </View>
        <Text variant="heading">{mensaje.titulo}</Text>
        <Text variant="body">{mensaje.cuerpo}</Text>
        <Text variant="caption">
          {formatDateTime(mensaje.fechaEnvio ?? mensaje.created_at)}
          {mensaje.enviadoPor ? ` - ${mensaje.enviadoPor.nombreCompleto}` : ''}
        </Text>
      </Card>

      <Card className="gap-1">
        <Text variant="label">Para</Text>
        <Text variant="body">{ALCANCE_MENSAJE[mensaje.alcance].etiqueta}</Text>
        {destinos.length > 0 && <Text variant="caption">{destinos.join(', ')}</Text>}
      </Card>
    </>
  );
}

function Resumen({ mensaje }: { mensaje: MensajeDetalle }) {
  const { resumen } = mensaje;

  if (enCurso(mensaje.estado)) {
    return (
      <Card className="flex-row items-center gap-3">
        <ActivityIndicator />
        <Text variant="body" className="flex-1">
          Repartiendo el aviso a los telefonos...
        </Text>
      </Card>
    );
  }

  if (resumen.total === 0) {
    return (
      <Card>
        <Text variant="body">No habia telefonos registrados para este destino.</Text>
      </Card>
    );
  }

  const porcentaje = Math.round((resumen.leidos / resumen.total) * 100);

  return (
    <Card className="gap-3">
      <View className="gap-1">
        <Text variant="heading">
          {formatNumber(resumen.leidos)} de {formatNumber(resumen.total)} lo leyeron
        </Text>
        <View className="h-2 overflow-hidden rounded-full bg-surface-sunken dark:bg-surface-dark-sunken">
          {/* Ancho calculado: no hay clase de Tailwind para un porcentaje dinamico. */}
          <View className="h-full rounded-full bg-primary-500" style={{ width: `${porcentaje}%` }} />
        </View>
        <Text variant="caption">{porcentaje}% de los telefonos a los que se envio</Text>
      </View>

      <View className="gap-1.5">
        <Linea etiqueta="Les sono la notificacion" valor={resumen.enviados} siempre />
        <Linea etiqueta="Registrados sin notificar (push apagado en el servidor)" valor={resumen.simulados} />
        <Linea etiqueta="Sin notificaciones: lo veran al abrir la app" valor={resumen.sinToken} />
        <Linea etiqueta="No les llego la notificacion" valor={resumen.fallidos} alerta />
      </View>
    </Card>
  );
}

function Linea({
  etiqueta,
  valor,
  siempre = false,
  alerta = false,
}: {
  etiqueta: string;
  valor: number;
  /** Se muestra aunque valga 0. Las demas lineas solo si aportan algo. */
  siempre?: boolean;
  alerta?: boolean;
}) {
  if (!siempre && valor === 0) return null;

  return (
    <View className="flex-row items-center gap-3">
      <Text variant="body" className="flex-1 text-content-muted dark:text-content-dark-muted">
        {etiqueta}
      </Text>
      <Text
        variant="body"
        className={cn('font-semibold', alerta && 'text-danger-600 dark:text-danger-500')}
      >
        {formatNumber(valor)}
      </Text>
    </View>
  );
}

/** Tras este tiempo en ENVIANDO se da por interrumpido (p. ej. un reinicio del servidor). */
const ENVIANDO_ATASCADO_MS = 5 * 60_000;

/**
 * Reanudar un envio que no llego a todos. El API no se lo repite a quien ya
 * lo recibio, asi que no hay riesgo de doble alerta; aun asi se confirma,
 * porque si suena en algunos telefonos.
 */
function Reintento({ mensaje, ahora }: { mensaje: MensajeDetalle; ahora: number }) {
  const reintentar = useReintentarMensaje();

  // `ahora` es la hora de la ultima consulta, que avanza cada 3 s mientras
  // el aviso sigue en ENVIANDO: suficiente para notar que se detuvo.
  const creado = parseApiDate(mensaje.created_at)?.getTime() ?? ahora;
  const atascado = mensaje.estado === 'ENVIANDO' && ahora - creado > ENVIANDO_ATASCADO_MS;
  const incompleto = mensaje.estado === 'PARCIAL' || mensaje.estado === 'FALLIDO';
  if (!atascado && !incompleto) return null;

  const faltan = mensaje.resumen.sinToken + mensaje.resumen.fallidos;

  function confirmar() {
    Alert.alert(
      'Reintentar envio',
      'Se volvera a intentar con los telefonos a los que no les llego. Quienes ya lo recibieron no lo recibiran de nuevo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reintentar', onPress: () => reintentar.mutate(mensaje.id) },
      ],
    );
  }

  return (
    <View className="gap-2">
      <Button
        label={
          atascado
            ? 'El envio parece detenido: reintentar'
            : `Reintentar con ${formatNumber(faltan)} ${faltan === 1 ? 'telefono' : 'telefonos'}`
        }
        variant="outline"
        icon={RotateCcw}
        fullWidth
        loading={reintentar.isPending}
        onPress={confirmar}
      />
      {incompleto && mensaje.resumen.sinToken > 0 && (
        <Text variant="caption">
          Solo servira con quienes hayan activado las notificaciones desde el envio.
        </Text>
      )}
      {reintentar.errorMessage && <Text variant="error">{reintentar.errorMessage}</Text>}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Quien lo leyo                                                               */
/* -------------------------------------------------------------------------- */

function Segmento({
  filtro,
  onCambiar,
  leyeron,
  pendientes,
}: {
  filtro: Filtro;
  onCambiar: (filtro: Filtro) => void;
  leyeron: number;
  pendientes: number;
}) {
  const opciones: { valor: Filtro; etiqueta: string }[] = [
    { valor: 'leyeron', etiqueta: `Lo leyeron (${formatNumber(leyeron)})` },
    { valor: 'pendientes', etiqueta: `No lo han leido (${formatNumber(pendientes)})` },
  ];

  return (
    <View className="flex-row gap-1 rounded-field bg-surface-sunken p-1 dark:bg-surface-dark-sunken">
      {opciones.map(({ valor, etiqueta }) => {
        const activo = filtro === valor;
        return (
          <Pressable
            key={valor}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            onPress={() => onCambiar(valor)}
            className={cn(
              'h-10 flex-1 items-center justify-center rounded-field px-2',
              activo && 'bg-surface dark:bg-surface-dark-muted',
            )}
          >
            <Text
              variant="caption"
              numberOfLines={1}
              className={cn(
                'font-semibold',
                activo ? 'text-content dark:text-content-dark-default' : undefined,
              )}
            >
              {etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FilaEnvio({ envio }: { envio: EnvioMensaje }) {
  const conCuenta = Boolean(envio.usuarioId);
  const detalle = [envio.usuario ? `@${envio.usuario}` : null, envio.modelo]
    .filter(Boolean)
    .join(' - ');

  return (
    <Card className="flex-row items-center gap-3 py-3">
      <Icon
        as={conCuenta ? UserRound : Smartphone}
        size={20}
        className="text-content-muted dark:text-content-dark-muted"
      />
      <View className="flex-1 gap-0.5">
        <Text variant="body" className="font-semibold">
          {envio.nombreUsuario ?? 'Telefono sin cuenta'}
        </Text>
        {detalle.length > 0 && <Text variant="caption">{detalle}</Text>}
        <Text
          variant="caption"
          className={cn(
            envio.leido
              ? 'text-success-700 dark:text-success-500'
              : envio.estado === 'FALLIDO' && 'text-danger-600 dark:text-danger-500',
          )}
        >
          {envio.leido ? `Leido el ${formatDateTime(envio.fechaLectura)}` : ESTADO_ENVIO[envio.estado]}
        </Text>
      </View>
    </Card>
  );
}
