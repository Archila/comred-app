import { View } from 'react-native';

import { Card, Screen, Text } from '@/components';
import { useAuthUser } from '@/store';

/** Pantalla de inicio. Placeholder listo para colgar los modulos de COMRED. */
export default function HomeScreen() {
  const user = useAuthUser();

  return (
    <Screen scrollable edges={['bottom']} contentClassName="gap-4">
      <View className="gap-1">
        <Text variant="subtitle">Bienvenido</Text>
        <Text variant="title">{user?.nombreCompleto ?? 'Usuario'}</Text>
      </View>

      <Card className="gap-1">
        <Text variant="label">Organizacion</Text>
        <Text variant="body">{user?.sucursal?.nombre ?? 'Sin sucursal asignada'}</Text>
        <Text variant="caption">
          {[user?.sucursal?.municipio, user?.sucursal?.departamento].filter(Boolean).join(', ')}
        </Text>
      </Card>

      <Card className="gap-1">
        <Text variant="label">Rol</Text>
        <Text variant="body">{user?.rol?.nombre ?? 'Sin rol'}</Text>
      </Card>
    </Screen>
  );
}
