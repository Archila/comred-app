import 'maplibre-gl/dist/maplibre-gl.css';

import type {
  AddLayerObject,
  FilterSpecification,
  GeoJSONSource,
  Map as MapaGl,
  Marker as MarcadorGl,
} from 'maplibre-gl';
import { useEffect, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { View } from 'react-native';

import { CAJA_MUNICIPIO, MAPA_CONFIG } from '@/constants';

import {
  AREA_MIN_ETIQUETA_KM2,
  CAPA_LIMITE,
  CAPAS_TOCABLES,
  capasDeElementos,
  FUENTE_ELEMENTOS,
  FUENTE_ETIQUETAS,
  FUENTE_LIMITE,
  MARGEN_ENCUADRE,
} from './estilos-capas';
import { etiquetasDeAreas } from './etiquetas';
import { PinMarcador } from './pin-marcador';
import { MARGEN_TOQUE_MARCADOR_MS, puntosVisibles } from './puntos';
import type { MapaVistaProps } from './tipos';

type MaplibreGl = typeof import('maplibre-gl');

const COLECCION_VACIA = { type: 'FeatureCollection' as const, features: [] };

/** Lo deja ahi `scripts/copiar-worker-maplibre.js` (ver el comentario de `MapaVista`). */
const URL_WORKER = '/maplibre-gl-worker.mjs';

/** Un punto en el mapa: el marcador de maplibre-gl y la raiz de React que lo pinta. */
interface Pin {
  marcador: MarcadorGl;
  raiz: Root;
}

function quitarPin(pin: Pin) {
  pin.marcador.remove();
  // Desmontar una raiz mientras React aun pinta la pantalla da un aviso: se
  // deja para despues del ciclo actual.
  setTimeout(() => pin.raiz.unmount(), 0);
}

/**
 * Las capas se escriben con los tipos de la especificacion que trae el
 * paquete nativo; maplibre-gl trae su propia copia, identica en forma pero
 * de otra version, y TypeScript no las da por iguales.
 */
function aGl(capa: unknown): AddLayerObject {
  return capa as AddLayerObject;
}

/**
 * Mapa en el navegador: maplibre-gl, con las mismas capas que la version
 * nativa (`estilos-capas.ts`).
 *
 * PUNTOS. Son el mismo `PinMarcador` que en el telefono: cada uno es un
 * `Marker` de maplibre-gl cuyo elemento del DOM se pinta con su propia raiz
 * de React (`createRoot`), porque vive fuera del arbol de la pantalla. Al
 * cambiar la seleccion solo se vuelve a pintar esa raiz; al cambiar los
 * datos o los filtros, se quitan los que sobran y se crean los que faltan.
 *
 * WORKER. maplibre-gl 6 busca su worker junto a su propio archivo
 * (`import.meta.url`), que deja de existir en cuanto Metro lo empaqueta. Por
 * eso se le indica a mano con `setWorkerUrl`: el script `postinstall`
 * (`scripts/copiar-worker-maplibre.js`) copia el worker de la version
 * instalada a `public/`, que Expo sirve tal cual en la raiz del sitio.
 *
 * maplibre-gl toca `window` al cargarse, y la web se exporta estatica
 * (`output: static`): por eso se importa dentro del efecto, que solo corre en
 * el navegador.
 */
export function MapaVista({
  capas,
  categoriasActivas,
  seleccionadoId,
  onSeleccionar,
  miUbicacion,
  ref,
}: MapaVistaProps) {
  const contenedor = useRef<ComponentRef<typeof View>>(null);
  const mapa = useRef<MapaGl | null>(null);
  const libreria = useRef<MaplibreGl | null>(null);
  const marcadorUbicacion = useRef<MarcadorGl | null>(null);
  const pines = useRef(new Map<string, Pin>());
  const ultimoToqueMarcador = useRef(0);
  const [listo, setListo] = useState(false);

  // El clic se registra una vez; lee siempre la ultima funcion.
  const alSeleccionar = useRef(onSeleccionar);
  useEffect(() => {
    alSeleccionar.current = onSeleccionar;
  }, [onSeleccionar]);

  useImperativeHandle(
    ref,
    () => ({
      irA: ({ latitud, longitud }, zoom) =>
        mapa.current?.flyTo({ center: [longitud, latitud], zoom, duration: 800 }),
      encuadrar: (caja) =>
        mapa.current?.fitBounds(
          [
            [caja.minLng, caja.minLat],
            [caja.maxLng, caja.maxLat],
          ],
          { padding: MARGEN_ENCUADRE, duration: 800 },
        ),
    }),
    [],
  );

  // Creacion del mapa, una sola vez.
  useEffect(() => {
    let cancelado = false;

    void import('maplibre-gl').then((maplibregl) => {
      // En web, la `View` de React Native es un <div>.
      const elemento = contenedor.current as unknown as HTMLElement | null;
      if (cancelado || !elemento) return;

      maplibregl.setWorkerUrl(URL_WORKER);
      libreria.current = maplibregl;
      const instancia = new maplibregl.Map({
        container: elemento,
        style: MAPA_CONFIG.estiloUrl,
        ...(CAJA_MUNICIPIO
          ? {
              bounds: [
                [CAJA_MUNICIPIO.minLng, CAJA_MUNICIPIO.minLat],
                [CAJA_MUNICIPIO.maxLng, CAJA_MUNICIPIO.maxLat],
              ] as [[number, number], [number, number]],
              fitBoundsOptions: { padding: MARGEN_ENCUADRE },
            }
          : {
              center: [MAPA_CONFIG.centro.longitud, MAPA_CONFIG.centro.latitud] as [number, number],
              zoom: MAPA_CONFIG.zoom,
            }),
        minZoom: MAPA_CONFIG.zoomMin,
        maxZoom: MAPA_CONFIG.zoomMax,
        attributionControl: false,
      });
      // Todo a la izquierda: arriba a la derecha van los botones de la
      // pantalla, y abajo a la derecha el boton del menu.
      instancia.addControl(new maplibregl.NavigationControl(), 'top-left');
      instancia.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

      instancia.on('load', () => {
        instancia.addSource(FUENTE_ELEMENTOS, { type: 'geojson', data: COLECCION_VACIA });
        instancia.addSource(FUENTE_ETIQUETAS, { type: 'geojson', data: COLECCION_VACIA });
        instancia.addSource(FUENTE_LIMITE, { type: 'geojson', data: COLECCION_VACIA });
        for (const capa of capasDeElementos([], null)) instancia.addLayer(aGl(capa));
        instancia.addLayer(aGl(CAPA_LIMITE));
        setListo(true);
      });

      instancia.on('click', (evento) => {
        // El clic en un marcador tambien llega aqui: no es un clic en vacio.
        if (Date.now() - ultimoToqueMarcador.current < MARGEN_TOQUE_MARCADOR_MS) return;
        const [figura] = instancia.queryRenderedFeatures(evento.point, {
          layers: CAPAS_TOCABLES,
        });
        const id: unknown = figura?.properties?.id;
        alSeleccionar.current(typeof id === 'string' ? id : null);
      });
      for (const capa of CAPAS_TOCABLES) {
        instancia.on('mouseenter', capa, () => {
          instancia.getCanvas().style.cursor = 'pointer';
        });
        instancia.on('mouseleave', capa, () => {
          instancia.getCanvas().style.cursor = '';
        });
      }

      mapa.current = instancia;
    });

    const pinesMontados = pines.current;
    return () => {
      cancelado = true;
      for (const pin of pinesMontados.values()) quitarPin(pin);
      pinesMontados.clear();
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  // Datos: se reemplazan en la fuente, sin rehacer las capas.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    (instancia.getSource(FUENTE_ELEMENTOS) as GeoJSONSource | undefined)?.setData(capas.elementos);
    (instancia.getSource(FUENTE_ETIQUETAS) as GeoJSONSource | undefined)?.setData(
      etiquetasDeAreas(capas, AREA_MIN_ETIQUETA_KM2),
    );
    (instancia.getSource(FUENTE_LIMITE) as GeoJSONSource | undefined)?.setData(
      capas.limite ?? COLECCION_VACIA,
    );
  }, [listo, capas]);

  // Filtros y seleccion: solo cambia el `filter` de cada capa.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    for (const capa of capasDeElementos(categoriasActivas, seleccionadoId)) {
      const { filter } = aGl(capa) as { filter?: FilterSpecification };
      if (filter) instancia.setFilter(capa.id, filter);
    }
  }, [listo, categoriasActivas, seleccionadoId]);

  // Marcadores de los puntos.
  useEffect(() => {
    const instancia = mapa.current;
    const maplibregl = libreria.current;
    if (!listo || !instancia || !maplibregl) return;

    const visibles = puntosVisibles(capas, categoriasActivas);
    const ids = new Set(visibles.map((punto) => punto.id));

    for (const [id, pin] of pines.current) {
      if (!ids.has(id)) {
        quitarPin(pin);
        pines.current.delete(id);
      }
    }

    for (const punto of visibles) {
      let pin = pines.current.get(punto.id);
      if (!pin) {
        const elemento = document.createElement('div');
        elemento.style.cursor = 'pointer';
        elemento.setAttribute('role', 'button');
        elemento.addEventListener('click', (evento) => {
          evento.stopPropagation();
          ultimoToqueMarcador.current = Date.now();
          alSeleccionar.current(punto.id);
        });
        pin = {
          marcador: new maplibregl.Marker({ element: elemento, anchor: 'bottom' })
            .setLngLat(punto.coordenadas)
            .addTo(instancia),
          raiz: createRoot(elemento),
        };
        pines.current.set(punto.id, pin);
      } else {
        pin.marcador.setLngLat(punto.coordenadas);
      }

      pin.raiz.render(
        <PinMarcador
          color={punto.color}
          icono={punto.icono}
          seleccionado={punto.id === seleccionadoId}
        />,
      );
    }
  }, [listo, capas, categoriasActivas, seleccionadoId]);

  // Punto de "Mi ubicacion".
  useEffect(() => {
    const instancia = mapa.current;
    const maplibregl = libreria.current;
    if (!listo || !instancia || !maplibregl) return;

    marcadorUbicacion.current?.remove();
    marcadorUbicacion.current = miUbicacion
      ? new maplibregl.Marker({ color: '#2563EB' })
          .setLngLat([miUbicacion.longitud, miUbicacion.latitud])
          .addTo(instancia)
      : null;
  }, [listo, miUbicacion]);

  return <View ref={contenedor} style={{ flex: 1 }} />;
}
