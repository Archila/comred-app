import { Link, Stack } from 'expo-router';
import { View } from 'react-native';

import { Screen, Text } from '@/components';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pagina no encontrada', headerShown: true }} />
      <Screen contentClassName="items-center justify-center gap-3">
        <Text variant="heading">Esta pantalla no existe.</Text>
        <View>
          <Link href="/">
            <Text className="text-primary-600 dark:text-primary-400">Volver al inicio</Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
