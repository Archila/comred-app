import {
  Camera,
  GeoJSONSource,
  Layer,
  Map as MapaNativo,
  Marker,
  NativeUserLocation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import type { Point } from 'geojson';
import { useImperativeHandle, useMemo, useRef } from 'react';

import { iconoDeCapa, MAPA_CONFIG } from '@/constants';
import type { FiguraMapa } from '@/models';

import {
  CAPA_LIMITE,
  capasDeElementos,
  FUENTE_ELEMENTOS,
  FUENTE_LIMITE,
  MARGEN_ENCUADRE,
} from './estilos-capas';
import { PinMarcador } from './pin-marcador';
import type { MapaVistaProps } from './tipos';

/**
 * Mapa en el telefono: MapLibre nativo (Android / iOS).
 *
 * Areas y lineas van en una sola fuente GeoJSON, con capas que filtran por
 * tipo y por capa encendida. Los puntos son marcadores con el icono de su
 * capa: un municipio tiene decenas o pocos cientos, y un icono se reconoce
 * mejor que un circulo de color. Si algun dia son miles, pasarlos a la capa
 * `circle` que ya usa la version web.
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
    () => capasDeElementos(categoriasActivas, seleccionadoId, false),
    [categoriasActivas, seleccionadoId],
  );

  const puntos = useMemo(() => {
    const activas = new Set(categoriasActivas);
    const iconos = new Map(capas.categorias.map((c) => [c.id, iconoDeCapa(c)]));

    return capas.elementos.features
      .filter(
        (figura): figura is FiguraMapa & { geometry: Point } =>
          figura.properties.tipoGeometria === 'PUNTO' &&
          figura.geometry.type === 'Point' &&
          activas.has(figura.properties.categoriaId),
      )
      .map((figura) => ({ figura, icono: iconos.get(figura.properties.categoriaId) }));
  }, [capas, categoriasActivas]);

  return (
    <MapaNativo
      style={{ flex: 1 }}
      mapStyle={MAPA_CONFIG.estiloUrl}
      logo={false}
      compass
      attributionPosition={{ bottom: 8, left: 8 }}
      onPress={() => onSeleccionar(null)}
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
          if (typeof id === 'string') onSeleccionar(id);
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

      {puntos.map(({ figura, icono }) => {
        const [longitud, latitud] = figura.geometry.coordinates;
        return (
          <Marker
            key={figura.properties.id}
            id={figura.properties.id}
            lngLat={[longitud, latitud]}
            anchor="bottom"
            onPress={() => onSeleccionar(figura.properties.id)}
          >
            <PinMarcador
              color={figura.properties.color}
              icono={icono ?? iconoDeCapa({ icono: null, nombre: '' })}
              seleccionado={figura.properties.id === seleccionadoId}
            />
          </Marker>
        );
      })}

      {/* El punto azul del sistema. Solo cuando el usuario pidio ubicarse. */}
      {miUbicacion && <NativeUserLocation />}
    </MapaNativo>
  );
}
