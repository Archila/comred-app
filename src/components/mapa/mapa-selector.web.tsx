import 'maplibre-gl/dist/maplibre-gl.css';

import type { Map as MapaGl, Marker as MarcadorGl } from 'maplibre-gl';
import { useEffect, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';

import { MAPA_CONFIG } from '@/constants';

import { ZOOM_PUNTO, type MapaSelectorProps } from './tipos';

type MaplibreGl = typeof import('maplibre-gl');

/** Lo deja ahi `scripts/copiar-worker-maplibre.js` (ver `mapa-vista.web.tsx`). */
const URL_WORKER = '/maplibre-gl-worker.mjs';

/**
 * Mapa para elegir un punto, en el navegador (maplibre-gl). Mismo contrato que
 * `mapa-selector.tsx`; por que se importa dentro del efecto y el worker a
 * mano, ver `mapa-vista.web.tsx`.
 */
export function MapaSelector({ punto, onElegir, color, ref }: MapaSelectorProps) {
  const contenedor = useRef<ComponentRef<typeof View>>(null);
  const mapa = useRef<MapaGl | null>(null);
  const libreria = useRef<MaplibreGl | null>(null);
  const marcador = useRef<MarcadorGl | null>(null);
  const [listo, setListo] = useState(false);
  // Se decide al crear el mapa: maplibre-gl no cambia `interactive` despues.
  const [interactivo] = useState(() => Boolean(onElegir));

  // El clic se registra una vez; lee siempre la ultima funcion.
  const alElegir = useRef(onElegir);
  useEffect(() => {
    alElegir.current = onElegir;
  }, [onElegir]);

  // El punto inicial se lee una sola vez, al crear el mapa.
  const puntoInicial = useRef(punto);

  useImperativeHandle(
    ref,
    () => ({
      irA: ({ latitud, longitud }, zoom = ZOOM_PUNTO) =>
        mapa.current?.flyTo({ center: [longitud, latitud], zoom, duration: 800 }),
    }),
    [],
  );

  useEffect(() => {
    let cancelado = false;

    void import('maplibre-gl').then((maplibregl) => {
      const elemento = contenedor.current as unknown as HTMLElement | null;
      if (cancelado || !elemento) return;

      maplibregl.setWorkerUrl(URL_WORKER);
      libreria.current = maplibregl;
      const inicial = puntoInicial.current;
      const instancia = new maplibregl.Map({
        container: elemento,
        style: MAPA_CONFIG.estiloUrl,
        center: inicial
          ? [inicial.longitud, inicial.latitud]
          : [MAPA_CONFIG.centro.longitud, MAPA_CONFIG.centro.latitud],
        zoom: inicial ? ZOOM_PUNTO : MAPA_CONFIG.zoom,
        minZoom: MAPA_CONFIG.zoomMin,
        maxZoom: MAPA_CONFIG.zoomMax,
        interactive: interactivo,
        attributionControl: false,
      });
      instancia.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
      if (interactivo) {
        instancia.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
        instancia.getCanvas().style.cursor = 'crosshair';
        instancia.on('click', (evento) =>
          alElegir.current?.({ latitud: evento.lngLat.lat, longitud: evento.lngLat.lng }),
        );
      }
      instancia.on('load', () => setListo(true));
      mapa.current = instancia;
    });

    return () => {
      cancelado = true;
      marcador.current?.remove();
      marcador.current = null;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [interactivo]);

  // El pin, y en la vista fija la camara, siguen al punto.
  useEffect(() => {
    const instancia = mapa.current;
    const maplibregl = libreria.current;
    if (!listo || !instancia || !maplibregl) return;

    marcador.current?.remove();
    marcador.current = punto
      ? new maplibregl.Marker({ color }).setLngLat([punto.longitud, punto.latitud]).addTo(instancia)
      : null;
    if (punto && !interactivo) instancia.jumpTo({ center: [punto.longitud, punto.latitud], zoom: ZOOM_PUNTO });
  }, [listo, punto, color, interactivo]);

  return <View ref={contenedor} style={{ flex: 1 }} />;
}
