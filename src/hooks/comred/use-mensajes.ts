import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { mensajesActions } from '@/actions';
import { getErrorMessage } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { useIsAuthenticated } from '@/store';
import type {
  AlcancePayload,
  CapacidadesEnvio,
  CrearMensajePayload,
  EnviosParams,
  EstadoMensaje,
  HistorialParams,
  MensajeDetalle,
} from '@/models';

/** Mientras el despacho no cierra, los contadores todavia no valen. */
export function enCurso(estado: EstadoMensaje): boolean {
  return estado === 'PENDIENTE' || estado === 'ENVIANDO';
}

/**
 * Cada cuanto se repregunta un aviso que se esta repartiendo. El reparto de
 * unos miles de telefonos tarda segundos; el API admite 300 llamadas por
 * minuto, asi que 3 s sobra y no se nota.
 */
const SONDEO_EN_CURSO = 3_000;

/**
 * Que puede enviar el usuario. Decide si aparece la pestana de envio y que
 * alcances y grupos se ofrecen en ella.
 *
 * Cinco minutos de cache: los permisos y las subcategorias cambian cuando un
 * administrador reasigna a alguien, que no es cosa de cada minuto. Si se
 * queda desfasado, el envio lo rechaza el API con un mensaje claro.
 */
export function useCapacidadesEnvio() {
  const isAuthenticated = useIsAuthenticated();

  return useQuery<CapacidadesEnvio>({
    queryKey: QUERY_KEYS.mensajes.capacidades(),
    queryFn: () => mensajesActions.capacidades(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

/**
 * Vista previa: cuantos telefonos alcanzaria el aviso.
 *
 * Es una mutacion y no una consulta aunque no cambie nada: se dispara cuando
 * el emisor pulsa "Revisar", con el alcance de ese momento, y no debe
 * reintentarse sola ni quedarse cacheada para otro envio.
 */
export function usePreviewMensaje() {
  const mutation = useMutation({
    mutationFn: (payload: AlcancePayload) => mensajesActions.preview(payload),
  });

  return {
    ...mutation,
    /** Mensaje ya normalizado, listo para pintar bajo el formulario. */
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}

/**
 * Avisos enviados por la organizacion.
 *
 * Se refresca al volver a primer plano —los acuses llegan cuando la gente abre
 * la app, no cuando el emisor mira— y sondea solo mientras algun aviso de la
 * lista siga repartiendose.
 */
export function useHistorialMensajes(params: Omit<HistorialParams, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.mensajes.historial(params),
    queryFn: ({ pageParam }) => mensajesActions.historial({ ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.hasNextPage ? ultima.page + 1 : undefined),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data?.pages.some((pagina) => pagina.items.some((m) => enCurso(m.estado)))
        ? SONDEO_EN_CURSO
        : false,
  });
}

/** Un aviso con su resumen de entrega. Sondea mientras se reparte. */
export function useMensaje(id: string | undefined) {
  return useQuery<MensajeDetalle>({
    queryKey: QUERY_KEYS.mensajes.detalle(id ?? ''),
    queryFn: () => mensajesActions.detalle(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchInterval: (query) =>
      query.state.data && enCurso(query.state.data.estado) ? SONDEO_EN_CURSO : false,
  });
}

/**
 * Quien leyo (o no) un aviso, telefono por telefono. Exige `MSG_AUDITORIA`:
 * sin el responde 403, asi que se pasa `enabled` con
 * `capacidades.puedeVerAuditoria` en vez de pedirlo y pintar el error.
 */
export function useEnviosMensaje(
  id: string,
  params: Omit<EnviosParams, 'page'> = {},
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: QUERY_KEYS.mensajes.envios(id, params),
    queryFn: ({ pageParam }) =>
      mensajesActions.envios(id, { limit: 50, ...params, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (ultima) => (ultima.hasNextPage ? ultima.page + 1 : undefined),
    enabled: enabled && Boolean(id),
    staleTime: 15_000,
  });
}

/** Reanuda un envio que quedo a medias. */
export function useReintentarMensaje() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => mensajesActions.reintentar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mensajes.all });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}

/**
 * Envio del aviso.
 *
 * Se declara `retry: false` aunque ya sea el valor global de las mutaciones,
 * para que nadie lo cambie aqui sin pensarlo: si la respuesta se pierde por
 * la red, el aviso puede haber salido igual, y repetirlo haria sonar dos
 * veces cada telefono de la municipalidad. Ante la duda, decide la persona.
 */
export function useEnviarMensaje() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: CrearMensajePayload) => mensajesActions.crear(payload),
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mensajes.all });
    },
  });

  return {
    ...mutation,
    errorMessage: mutation.error ? getErrorMessage(mutation.error) : null,
  };
}
