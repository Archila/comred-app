import { Tabs } from 'expo-router';
import { House, UserRound } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants';
import { useBrandColors } from '@/store';

/**
 * Rutas privadas. Solo se montan cuando hay sesion activa (ver el guard en
 * `app/_layout.tsx`). Aqui se agregan los tabs de los modulos de COMRED.
 *
 * React Navigation no acepta `className` en la tab bar, por eso los colores
 * se leen del store de marca en lugar de usar clases de Tailwind.
 */
export default function AppLayout() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;
  const brand = useBrandColors();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        tabBarActiveTintColor: brand.primary,
        tabBarInactiveTintColor: palette.textSubtle,
        tabBarStyle: {
          backgroundColor: palette.background,
          borderTopColor: palette.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
