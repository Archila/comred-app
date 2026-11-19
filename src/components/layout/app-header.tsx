import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNoLeidos } from '@/hooks';

import { MuniLogo, useNombreMunicipalidad } from '../common/muni-logo';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

/**
 * Encabezado institucional fijo: escudo, "COMRED", campana de avisos y la
 * franja roja. Con `title` agrega debajo la barra de la seccion con su flecha
 * de regreso al inicio.
 *
 * Es el `header` de las pestanas de `app/(app)/_layout.tsx`, por eso aplica el
 * mismo el inset superior en vez de dejarselo a cada pantalla.
 *
 * Con `onAbrirMenu`, tocar el escudo abre el menu lateral (ademas del boton
 * flotante).
 */
export function AppHeader({ title, onAbrirMenu }: { title?: string; onAbrirMenu?: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const nombreMunicipalidad = useNombreMunicipalidad();
  const { noLeidos } = useNoLeidos();

  return (
    <View className="bg-secondary-500" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        {onAbrirMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir menu"
            hitSlop={8}
            onPress={onAbrirMenu}
            className="active:opacity-70"
          >
            <MuniLogo size={44} />
          </Pressable>
        ) : (
          <MuniLogo size={44} />
        )}

        <View className="flex-1">
          <Text variant="plain" className="text-xl font-bold leading-6 text-secondary-foreground">
            COMRED
          </Text>
          <Text variant="plain" className="text-xs text-secondary-foreground" numberOfLines={1}>
            {nombreMunicipalidad}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={noLeidos > 0 ? `Avisos, ${noLeidos} sin leer` : 'Avisos'}
          hitSlop={10}
          onPress={() => router.navigate('/avisos')}
          className="h-10 w-10 items-center justify-center active:opacity-70"
        >
          <Icon as={Bell} size={24} className="text-secondary-foreground" />
          {noLeidos > 0 && (
            <View className="absolute right-0 top-0 h-5 min-w-5 items-center justify-center rounded-full border-2 border-secondary-500 bg-primary-500 px-1">
              <Text
                variant="plain"
                className="text-[10px] font-bold leading-3 text-primary-foreground"
              >
                {noLeidos > 99 ? '99+' : noLeidos}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View className="h-1.5 bg-primary-500" />

      {title && <SeccionBar title={title} onBack={() => router.navigate('/')} />}
    </View>
  );
}

function SeccionBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View className="h-12 flex-row items-center bg-secondary-600 px-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver al inicio"
        hitSlop={8}
        onPress={onBack}
        className="h-10 w-10 items-center justify-center active:opacity-70"
      >
        <Icon as={ChevronLeft} size={24} className="text-secondary-foreground" />
      </Pressable>

      <Text
        variant="plain"
        className="flex-1 text-center text-base font-semibold text-secondary-foreground"
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Hueco del ancho de la flecha: mantiene el titulo centrado. */}
      <View className="w-10" />
    </View>
  );
}
