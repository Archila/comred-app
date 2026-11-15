import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapaNativo,
  Marker,
  NativeUserLocation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import { useImperativeHandle, useMemo, useRef } from 'react';

import { MAPA_CONFIG } from '@/constants';

import {
  CAPA_LIMITE,
  capasDeElementos,
  FUENTE_ELEMENTOS,
  FUENTE_LIMITE,
  MARGEN_ENCUADRE,
} from './estilos-capas';
import { PinMarcador } from './pin-marcador';
import { MARGEN_TOQUE_MARCADOR_MS, puntosVisibles } from './puntos';
import type { MapaVistaProps } from './tipos';

/**
 * Mapa en el telefono: MapLibre nativo (Android / iOS).
 *
 * Areas y lineas van en una sola fuente GeoJSON, con capas que filtran por
 * tipo y por capa encendida. Los puntos son marcadores con el icono de su
 * capa: un municipio tiene decenas o pocos cientos, y un icono se reconoce
 * mejor que un circulo de color.
 *
 * TOQUES. Un punto se puede tocar por dos caminos, y los dos abren su ficha:
 * el marcador (`Marker.onPress`) y la zona de toque invisible de la fuente.
 * El `onPress` del mapa (tocar en vacio cierra la ficha) ignora el toque que
 * acaba de abrir un marcador: si no, la ficha se abriria y se cerraria a la
 * vez.
 */
export function MapaVista({
  capas,
  categoriasActivas,
  seleccionadoId,
  onSeleccionar,
  miUbicacion,
  ref,
}: MapaVistaProps) {
  const camara = useRef<CameraRef>(null);
  const ultimoToqueMarcador = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      irA: ({ latitud, longitud }, zoom) =>
        camara.current?.flyTo({ center: [longitud, latitud], zoom, duration: 800 }),
      encuadrar: (caja) =>
        camara.current?.fitBounds([caja.minLng, caja.minLat, caja.maxLng, caja.maxLat], {
          padding: MARGEN_ENCUADRE,
          duration: 800,
        }),
    }),
    [],
  );

  const capasEstilo = useMemo(
    () => capasDeElementos(categoriasActivas, seleccionadoId),
    [categoriasActivas, seleccionadoId],
  );

  const puntos = useMemo(
    () => puntosVisibles(capas, categoriasActivas),
    [capas, categoriasActivas],
  );

  const seleccionarDesdeMarcador = (id: string) => {
    ultimoToqueMarcador.current = Date.now();
    onSeleccionar(id);
  };

  return (
    <MapaNativo
      style={{ flex: 1 }}
      mapStyle={MAPA_CONFIG.estiloUrl}
      logo={false}
      compass
      attributionPosition={{ bottom: 8, left: 8 }}
      onPress={() => {
        if (Date.now() - ultimoToqueMarcador.current < MARGEN_TOQUE_MARCADOR_MS) return;
        onSeleccionar(null);
      }}
    >
      <Camera
        ref={camara}
        initialViewState={{
          center: [MAPA_CONFIG.centro.longitud, MAPA_CONFIG.centro.latitud],
          zoom: MAPA_CONFIG.zoom,
        }}
        minZoom={MAPA_CONFIG.zoomMin}
        maxZoom={MAPA_CONFIG.zoomMax}
      />

      <GeoJSONSource
        id={FUENTE_ELEMENTOS}
        data={capas.elementos}
        onPress={(evento) => {
          // Sin esto el toque sube al `Map`, que deselecciona.
          evento.stopPropagation();
          const id = evento.nativeEvent.features[0]?.properties?.id;
          if (typeof id === 'string') seleccionarDesdeMarcador(id);
        }}
      >
        {capasEstilo.map((capa) => (
          <Layer key={capa.id} {...capa} />
        ))}
      </GeoJSONSource>

      {capas.limite && (
        <GeoJSONSource id={FUENTE_LIMITE} data={capas.limite}>
          <Layer {...CAPA_LIMITE} />
        </GeoJSONSource>
      )}

      {puntos.map((punto) => (
        <Marker
          key={punto.id}
          id={punto.id}
          lngLat={punto.coordenadas}
          anchor="bottom"
          onPress={(evento) => {
            evento.stopPropagation();
            seleccionarDesdeMarcador(punto.id);
          }}
        >
          <PinMarcador
            color={punto.color}
            icono={punto.icono}
            seleccionado={punto.id === seleccionadoId}
          />
        </Marker>
      ))}

      {/* El punto azul del sistema. Solo cuando el usuario pidio ubicarse. */}
      {miUbicacion && <NativeUserLocation />}
    </MapaNativo>
  );
}
