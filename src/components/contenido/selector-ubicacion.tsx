import { Crosshair, MapPin, MapPinned, X } from 'lucide-react-native';
import { vars } from 'nativewind';
import { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMiUbicacion, type Coordenadas } from '@/hooks/use-mi-ubicacion';
import { cn } from '@/lib';
import { useBrandColors, useBrandVars } from '@/store';

import { MapaSelector } from '../mapa/mapa-selector';
import type { MapaSelectorRef } from '../mapa/tipos';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/** Alto de la vista previa en el formulario. */
const ALTO_PREVIA = 170;

/** "14.845900, -91.527500": lo que se guarda, para quien quiera comprobarlo. */
function textoCoordenadas({ latitud, longitud }: Coordenadas): string {
  return `${latitud.toFixed(6)}, ${longitud.toFixed(6)}`;
}

/**
 * Ubicacion de un lugar en el mapa: vista previa fija en el formulario y,
 * al tocar el boton, el mapa a pantalla completa para marcar el punto.
 *
 * El punto se elige en el modal y solo pasa al formulario al confirmar:
 * cerrar sin confirmar deja el que habia.
 */
export function SelectorUbicacion({
  valor,
  error,
  deshabilitado = false,
  onCambiar,
}: {
  valor: Coordenadas | null;
  error?: boolean;
  deshabilitado?: boolean;
  onCambiar: (coordenadas: Coordenadas) => void;
}) {
  const brand = useBrandColors();
  const [abierto, setAbierto] = useState(false);

  return (
    <View
      className={cn(
        'gap-3 rounded-card border bg-surface p-2 dark:bg-surface-dark',
        error ? 'border-danger-500' : 'border-line dark:border-line-dark',
      )}
    >
      <View style={{ height: ALTO_PREVIA }} className="overflow-hidden rounded-field bg-surface-sunken dark:bg-surface-dark-sunken">
        <MapaSelector punto={valor} color={brand.primary} />
        {!valor && (
          // Sobre el mapa del municipio: que no parezca que ya hay un punto.
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center bg-black/25">
            <View className="flex-row items-center gap-2 rounded-full bg-surface px-3 py-1.5 dark:bg-surface-dark">
              <Icon as={MapPinned} size={16} />
              <Text variant="plain" className="text-sm font-semibold text-content dark:text-content-dark-default">
                Aún no has marcado el lugar
              </Text>
            </View>
          </View>
        )}
      </View>

      {valor && (
        <Text variant="caption" className="text-center">
          {textoCoordenadas(valor)}
        </Text>
      )}

      <Button
        label={valor ? 'Cambiar ubicación en el mapa' : 'Seleccionar ubicación en el mapa'}
        icon={MapPin}
        variant="outline"
        fullWidth
        disabled={deshabilitado}
        onPress={() => setAbierto(true)}
      />

      {/* Montado solo abierto: un mapa oculto seguiria descargando teselas. */}
      {abierto && (
        <ModalMapa
          inicial={valor}
          onCerrar={() => setAbierto(false)}
          onConfirmar={(coordenadas) => {
            onCambiar(coordenadas);
            setAbierto(false);
          }}
        />
      )}
    </View>
  );
}

/**
 * Mapa a pantalla completa para marcar el punto. Es un `Modal`: no hereda
 * las variables de color de `BrandingProvider` y se vuelven a aplicar (ver
 * `DetallePublicacion`).
 */
function ModalMapa({
  inicial,
  onCerrar,
  onConfirmar,
}: {
  inicial: Coordenadas | null;
  onCerrar: () => void;
  onConfirmar: (coordenadas: Coordenadas) => void;
}) {
  const insets = useSafeAreaInsets();
  const brand = useBrandColors();
  const brandVars = useBrandVars();
  const estiloMarca = useMemo(() => vars(brandVars), [brandVars]);
  const mapa = useRef<MapaSelectorRef>(null);
  const ubicacion = useMiUbicacion();
  const [punto, setPunto] = useState<Coordenadas | null>(inicial);

  async function usarMiUbicacion() {
    const coordenadas = await ubicacion.ubicar();
    if (!coordenadas) return;
    setPunto(coordenadas);
    mapa.current?.irA(coordenadas);
  }

  return (
    <Modal visible animationType="slide" statusBarTranslucent onRequestClose={onCerrar}>
      <View style={[estiloMarca, { paddingTop: insets.top }]} className="flex-1 bg-surface dark:bg-surface-dark">
        <View className="flex-row items-center gap-3 px-4 py-3">
          <View className="flex-1 gap-0.5">
            <Text variant="heading">Ubicación en el mapa</Text>
            <Text variant="caption">Toca el mapa en el lugar exacto. Puedes acercarte con dos dedos.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar sin cambiar la ubicación"
            hitSlop={10}
            onPress={onCerrar}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-sunken active:opacity-70 dark:bg-surface-dark-muted"
          >
            <Icon as={X} size={20} />
          </Pressable>
        </View>

        <View className="flex-1">
          <MapaSelector ref={mapa} punto={punto} color={brand.primary} onElegir={setPunto} />
        </View>

        <View className="gap-3 px-4 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <Text variant="caption" className="text-center">
            {punto ? `Punto marcado: ${textoCoordenadas(punto)}` : 'Todavía no has marcado ningún punto.'}
          </Text>
          {ubicacion.error && (
            <Text variant="error" className="text-center">
              {ubicacion.error}
            </Text>
          )}
          <Button
            label={ubicacion.buscando ? 'Buscando ubicación...' : 'Usar mi ubicación'}
            icon={Crosshair}
            variant="outline"
            fullWidth
            loading={ubicacion.buscando}
            onPress={() => void usarMiUbicacion()}
          />
          <Button
            label="Confirmar ubicación"
            icon={MapPin}
            size="lg"
            fullWidth
            disabled={!punto}
            onPress={() => punto && onConfirmar(punto)}
          />
        </View>
      </View>
    </Modal>
  );
}
