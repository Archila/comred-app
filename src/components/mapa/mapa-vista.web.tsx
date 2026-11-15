import 'maplibre-gl/dist/maplibre-gl.css';

import type {
  AddLayerObject,
  FilterSpecification,
  GeoJSONSource,
  Map as MapaGl,
  Marker as MarcadorGl,
} from 'maplibre-gl';
import { useEffect, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { View } from 'react-native';

import { MAPA_CONFIG } from '@/constants';

import {
  CAPA_LIMITE,
  CAPAS_TOCABLES,
  capasDeElementos,
  FUENTE_ELEMENTOS,
  FUENTE_LIMITE,
  MARGEN_ENCUADRE,
} from './estilos-capas';
import type { MapaVistaProps } from './tipos';

type MaplibreGl = typeof import('maplibre-gl');

const COLECCION_VACIA = { type: 'FeatureCollection' as const, features: [] };

/** Lo deja ahi `scripts/copiar-worker-maplibre.js` (ver el comentario de `MapaVista`). */
const URL_WORKER = '/maplibre-gl-worker.mjs';

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
 * nativa (`estilos-capas.ts`). Aqui los puntos son circulos de color: un
 * marcador con icono exigiria montar un componente de React por punto fuera
 * del arbol.
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
        center: [MAPA_CONFIG.centro.longitud, MAPA_CONFIG.centro.latitud],
        zoom: MAPA_CONFIG.zoom,
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
        instancia.addSource(FUENTE_LIMITE, { type: 'geojson', data: COLECCION_VACIA });
        for (const capa of capasDeElementos([], null, true)) instancia.addLayer(aGl(capa));
        instancia.addLayer(aGl(CAPA_LIMITE));
        setListo(true);
      });

      instancia.on('click', (evento) => {
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

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  // Datos: se reemplazan en la fuente, sin rehacer las capas.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    (instancia.getSource(FUENTE_ELEMENTOS) as GeoJSONSource | undefined)?.setData(capas.elementos);
    (instancia.getSource(FUENTE_LIMITE) as GeoJSONSource | undefined)?.setData(
      capas.limite ?? COLECCION_VACIA,
    );
  }, [listo, capas]);

  // Filtros y seleccion: solo cambia el `filter` de cada capa.
  useEffect(() => {
    const instancia = mapa.current;
    if (!listo || !instancia) return;
    for (const capa of capasDeElementos(categoriasActivas, seleccionadoId, true)) {
      const { filter } = aGl(capa) as { filter?: FilterSpecification };
      if (filter) instancia.setFilter(capa.id, filter);
    }
  }, [listo, categoriasActivas, seleccionadoId]);

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
