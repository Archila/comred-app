import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { organizacionesActions } from '@/actions';
import { QUERY_KEYS } from '@/constants';
import { abrirActualizacion, evaluarVersion, getVersionCodigo, type EstadoVersion } from '@/lib';
import type { VersionOrganizacion } from '@/models';

import { useOrganizacionId } from './use-organizacion-publica';

// Constante del binario: no cambia mientras la app esta abierta.
const VERSION_INSTALADA = getVersionCodigo();

export interface VersionApp {
  estado: EstadoVersion;
  /** Donde descargar la version nueva. `null` si el API no tiene enlace. */
  urlActualizacion: string | null;
}

/**
 * Compara el binario instalado con lo que exige la organizacion.
 *
 * Se vuelve a consultar al regresar del segundo plano (con 15 min de margen):
 * una app de emergencias puede pasar dias abierta, y el minimo puede subir
 * mientras tanto.
 *
 * Si la consulta falla el estado es `AL_DIA`: sin red no se bloquea a nadie.
 * En web no hay binario y la consulta ni se lanza.
 */
export function useVersionApp(): VersionApp {
  const organizacionId = useOrganizacionId();

  const { data } = useQuery<VersionOrganizacion>({
    queryKey: QUERY_KEYS.organizaciones.version(organizacionId),
    queryFn: () => organizacionesActions.getVersion(organizacionId),
    enabled: VERSION_INSTALADA !== null,
    staleTime: 15 * 60_000,
    refetchOnWindowFocus: true,
  });

  return {
    estado: evaluarVersion(VERSION_INSTALADA, data),
    urlActualizacion: data?.urlActualizacion ?? null,
  };
}

/**
 * Aviso de que hay una version mas nueva. Una sola vez por ejecucion: es una
 * recomendacion, y repetirla en cada vuelta del segundo plano la volveria
 * ruido en una app que se abre con prisa.
 *
 * `activo` lo retrasa hasta que se oculta el splash.
 */
export function useAvisoActualizacion({ estado, urlActualizacion }: VersionApp, activo: boolean) {
  const avisado = useRef(false);

  useEffect(() => {
    if (!activo || estado !== 'DISPONIBLE' || avisado.current) return;
    avisado.current = true;

    Alert.alert(
      'Actualizacion disponible',
      'Hay una version mas reciente de la aplicacion. Por favor, actualizala.',
      urlActualizacion
        ? [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Actualizar', onPress: () => void abrirActualizacion(urlActualizacion) },
          ]
        : [{ text: 'Entendido' }],
    );
  }, [activo, estado, urlActualizacion]);
}
