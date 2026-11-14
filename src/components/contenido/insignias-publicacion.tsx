import { Lock } from 'lucide-react-native';
import { View } from 'react-native';

import {
  ESTADO_INCIDENTE,
  ESTADO_JORNADA,
  ESTADO_PROYECTO,
  VERIFICACION_INCIDENTE,
} from '@/constants';
import type { Publicacion } from '@/models';

import { Etiqueta } from './etiqueta';

/**
 * Insignias de una publicacion: categoria, y el estado de lo que cuenta: de
 * un reporte, ademas, su nivel de verificacion; de una jornada, si es proxima,
 * esta en desarrollo, finalizo o se cancelo (Plan Maestro, 7); de un proyecto,
 * su estado (10). Lo interno de una brigada o COCODE se marca siempre (8.3:
 * "distincion clara entre publicaciones publicas e internas").
 */
export function InsigniasPublicacion({
  publicacion,
  tarjeta,
}: {
  publicacion: Publicacion;
  /** Nombre de la tarjeta bajo la que se muestra. */
  tarjeta?: string;
}) {
  const incidente = publicacion.incidente;
  const verificacion = incidente ? VERIFICACION_INCIDENTE[incidente.verificacion] : null;
  const estado = incidente
    ? ESTADO_INCIDENTE[incidente.estado]
    : publicacion.jornada
      ? ESTADO_JORNADA[publicacion.jornada.estado]
      : publicacion.proyecto
        ? ESTADO_PROYECTO[publicacion.proyecto.estado]
        : null;
  const categoria = publicacion.categoria?.nombre ?? tarjeta;

  return (
    <View className="flex-row flex-wrap gap-1.5">
      {verificacion && (
        <Etiqueta
          etiqueta={verificacion.etiqueta}
          icono={verificacion.icono}
          fondo={verificacion.fondo}
          texto={verificacion.texto}
        />
      )}
      {estado && <Etiqueta etiqueta={estado.etiqueta} fondo={estado.fondo} texto={estado.texto} />}
      {publicacion.interna && (
        <Etiqueta
          etiqueta="Interno"
          icono={Lock}
          fondo="bg-secondary-500"
          texto="text-secondary-foreground"
        />
      )}
      {categoria && !incidente && (
        <Etiqueta
          etiqueta={categoria}
          fondo="bg-surface-sunken dark:bg-surface-dark-sunken"
          texto="text-content-muted dark:text-content-dark-muted"
        />
      )}
    </View>
  );
}

/** Alerta oficial de un incidente que sigue abierto. */
export function esAlertaActiva(publicacion: Publicacion): boolean {
  const incidente = publicacion.incidente;
  return incidente?.verificacion === 'ALERTA_OFICIAL' && incidente.estado !== 'CERRADO';
}
