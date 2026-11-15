import { House, Layers, LocateFixed, type LucideIcon } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { getErrorMessage } from '@/api';
import { MAPA_CONFIG } from '@/constants';
import { useCapasMapa, useMiUbicacion } from '@/hooks';
import type { Bbox } from '@/models';
import { useMapaStore } from '@/store';

import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import { FichaElemento } from './ficha-elemento';
import { FiltrosCapas } from './filtros-capas';
import { MapaVista } from './mapa-vista';
import { CAPAS_VACIAS, type MapaVistaRef } from './tipos';

/** Zoom al ubicar al usuario: de calle, no de municipio. */
const ZOOM_MI_UBICACION = 16;

/**
 * Mapa general del municipio (Plan Maestro, 9).
 *
 * El mapa base se pinta enseguida, en el centro y zoom de `MAPA_CONFIG`; las
 * capas llegan despues y no mueven la camara. Si el API falla, el mapa sigue
 * siendo util como mapa del municipio y se avisa arriba.
 */
export function PantallaMapa() {
  const { data, isFetching, error, refetch } = useCapasMapa();
  const capas = data ?? CAPAS_VACIAS;

  const cambios = useMapaStore((state) => state.cambios);
  const alternar = useMapaStore((state) => state.alternar);
  const restablecer = useMapaStore((state) => state.restablecer);

  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const vista = useRef<MapaVistaRef>(null);
  const { ubicacion, buscando, error: errorUbicacion, ubicar } = useMiUbicacion();

  const activas = useMemo(
    () =>
      capas.categorias
        .filter((categoria) => cambios[categoria.id] ?? categoria.visiblePorDefecto)
        .map((categoria) => categoria.id),
    [capas.categorias, cambios],
  );
  const conjuntoActivas = useMemo(() => new Set(activas), [activas]);

  const cajaLimite = useMemo(() => cajaDe(capas.limite), [capas.limite]);

  const recentrar = () => {
    if (cajaLimite) vista.current?.encuadrar(cajaLimite);
    else vista.current?.irA(MAPA_CONFIG.centro, MAPA_CONFIG.zoom);
  };

  const irAMiUbicacion = async () => {
    const coordenadas = await ubicar();
    if (coordenadas) vista.current?.irA(coordenadas, ZOOM_MI_UBICACION);
  };

  const aviso = error
    ? `No se pudieron cargar las capas: ${getErrorMessage(error)}`
    : errorUbicacion;

  return (
    <View className="flex-1 bg-surface-sunken dark:bg-surface-dark">
      <MapaVista
        ref={vista}
        capas={capas}
        categoriasActivas={activas}
        seleccionadoId={seleccionadoId}
        onSeleccionar={(id) => {
          setSeleccionadoId(id);
          if (id) setFiltrosAbiertos(false);
        }}
        miUbicacion={ubicacion}
      />

      <View className="absolute right-3 top-3 gap-2">
        <BotonControl
          icono={Layers}
          etiqueta="Capas del mapa"
          onPress={() => setFiltrosAbiertos((abierto) => !abierto)}
        />
        <BotonControl
          icono={LocateFixed}
          etiqueta="Mi ubicación"
          cargando={buscando}
          onPress={() => void irAMiUbicacion()}
        />
        <BotonControl icono={House} etiqueta="Recentrar el mapa" onPress={recentrar} />
      </View>

      {isFetching && !data && (
        <View className="absolute left-3 top-3 flex-row items-center gap-2 rounded-full bg-surface px-3 py-1.5 shadow dark:bg-surface-dark-muted">
          <ActivityIndicator size="small" />
          <Text variant="caption">Cargando capas…</Text>
        </View>
      )}

      {aviso && !filtrosAbiertos && (
        <Pressable
          onPress={error ? () => void refetch() : undefined}
          className="absolute left-3 right-16 top-3 rounded-field bg-warning-50 px-3 py-2 shadow"
        >
          <Text variant="caption" className="text-warning-700">
            {aviso}
            {error ? ' Toca para reintentar.' : ''}
          </Text>
        </Pressable>
      )}

      {filtrosAbiertos && (
        <FiltrosCapas
          categorias={capas.categorias}
          activas={conjuntoActivas}
          onAlternar={alternar}
          onRestablecer={restablecer}
          onCerrar={() => setFiltrosAbiertos(false)}
        />
      )}

      {seleccionadoId && (
        <FichaElemento
          key={seleccionadoId}
          id={seleccionadoId}
          onCerrar={() => setSeleccionadoId(null)}
          onEncuadrar={(caja) => vista.current?.encuadrar(caja)}
        />
      )}
    </View>
  );
}

function BotonControl({
  icono,
  etiqueta,
  onPress,
  cargando = false,
}: {
  icono: LucideIcon;
  etiqueta: string;
  onPress: () => void;
  cargando?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      disabled={cargando}
      style={{ elevation: 4 }}
      className="h-11 w-11 items-center justify-center rounded-full bg-surface shadow active:bg-surface-sunken dark:bg-surface-dark-muted"
    >
      {cargando ? <ActivityIndicator size="small" /> : <Icon as={icono} size={20} />}
    </Pressable>
  );
}

/** Caja del contorno del municipio, para "Recentrar". */
function cajaDe(limite: GeoJSON.FeatureCollection | null): Bbox | null {
  if (!limite) return null;

  const caja = { minLat: Infinity, minLng: Infinity, maxLat: -Infinity, maxLng: -Infinity };
  const recorrer = (valor: unknown) => {
    if (!Array.isArray(valor)) return;
    if (typeof valor[0] === 'number' && typeof valor[1] === 'number') {
      const [lng, lat] = valor as number[];
      caja.minLat = Math.min(caja.minLat, lat);
      caja.minLng = Math.min(caja.minLng, lng);
      caja.maxLat = Math.max(caja.maxLat, lat);
      caja.maxLng = Math.max(caja.maxLng, lng);
      return;
    }
    valor.forEach(recorrer);
  };
  for (const figura of limite.features) {
    if (figura.geometry && 'coordinates' in figura.geometry) recorrer(figura.geometry.coordinates);
  }

  return Number.isFinite(caja.minLat) ? caja : null;
}
