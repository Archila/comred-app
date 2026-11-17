import { Camera, Map as MapaNativo, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { MapPin } from 'lucide-react-native';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

import { MAPA_CONFIG } from '@/constants';

import { PinMarcador } from './pin-marcador';
import { ZOOM_PUNTO, type MapaSelectorProps } from './tipos';

/**
 * Mapa para elegir un punto, en el telefono (MapLibre nativo). La version web
 * es `mapa-selector.web.tsx`.
 *
 * Va con `androidView="texture"`: la vista previa vive dentro de un
 * ScrollView, y un SurfaceView (el de por defecto) no se recorta ni se
 * desplaza bien con el contenido que lo rodea.
 *
 * Sin `onElegir` es solo una imagen: no responde a gestos (`pointerEvents`),
 * para que deslizar el formulario sobre ella siga desplazando el formulario.
 */
export function MapaSelector({ punto, onElegir, color, ref }: MapaSelectorProps) {
  const camara = useRef<CameraRef>(null);
  const interactivo = Boolean(onElegir);

  useImperativeHandle(
    ref,
    () => ({
      irA: ({ latitud, longitud }, zoom = ZOOM_PUNTO) =>
        camara.current?.flyTo({ center: [longitud, latitud], zoom, duration: 800 }),
    }),
    [],
  );

  // La vista fija sigue al punto; la interactiva no: moverle la camara a
  // quien acaba de tocar seria quitarle el mapa de debajo del dedo.
  useEffect(() => {
    if (interactivo || !punto) return;
    camara.current?.jumpTo({ center: [punto.longitud, punto.latitud], zoom: ZOOM_PUNTO });
  }, [interactivo, punto]);

  return (
    <View style={{ flex: 1 }} pointerEvents={interactivo ? 'auto' : 'none'}>
      <MapaNativo
        style={{ flex: 1 }}
        mapStyle={MAPA_CONFIG.estiloUrl}
        androidView="texture"
        logo={false}
        attributionPosition={{ bottom: 8, left: 8 }}
        dragPan={interactivo}
        touchZoom={interactivo}
        doubleTapZoom={interactivo}
        doubleTapHoldZoom={interactivo}
        touchRotate={false}
        touchPitch={false}
        onPress={
          onElegir
            ? (evento) => {
                const [longitud, latitud] = evento.nativeEvent.lngLat;
                onElegir({ latitud, longitud });
              }
            : undefined
        }
      >
        <Camera
          ref={camara}
          initialViewState={
            punto
              ? { center: [punto.longitud, punto.latitud], zoom: ZOOM_PUNTO }
              : {
                  center: [MAPA_CONFIG.centro.longitud, MAPA_CONFIG.centro.latitud],
                  zoom: MAPA_CONFIG.zoom,
                }
          }
          minZoom={MAPA_CONFIG.zoomMin}
          maxZoom={MAPA_CONFIG.zoomMax}
        />

        {punto && (
          <Marker id="punto-elegido" lngLat={[punto.longitud, punto.latitud]} anchor="bottom">
            <PinMarcador color={color} icono={MapPin} seleccionado />
          </Marker>
        )}
      </MapaNativo>
    </View>
  );
}
