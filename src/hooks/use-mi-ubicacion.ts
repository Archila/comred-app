import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

/**
 * Ubicacion del usuario para el boton "Mi ubicacion" del mapa (Plan Maestro,
 * 9.4).
 *
 * El permiso se pide SOLO al tocar el boton, nunca al abrir el mapa. La
 * posicion vive en el estado de la pantalla: no se guarda ni se envia al API.
 */
export function useMiUbicacion() {
  const [ubicacion, setUbicacion] = useState<Coordenadas | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ubicar = useCallback(async (): Promise<Coordenadas | null> => {
    setBuscando(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setError('Sin permiso de ubicación. Puedes activarlo en los ajustes del teléfono.');
        return null;
      }

      // Precision equilibrada: basta para "donde estoy en el municipio" y
      // responde mucho antes que la maxima.
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordenadas = {
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      };
      setUbicacion(coordenadas);
      return coordenadas;
    } catch {
      setError('No se pudo obtener tu ubicación. Revisa que el GPS esté encendido.');
      return null;
    } finally {
      setBuscando(false);
    }
  }, []);

  return { ubicacion, buscando, error, ubicar };
}
