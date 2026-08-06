import { Phone } from 'lucide-react-native';
import { View } from 'react-native';

import { BrandLogo, Card, Icon, Screen, Text } from '@/components';
import { useAuthUser, useOrganizacion } from '@/store';

/** Pantalla de inicio. Placeholder listo para colgar los modulos de COMRED. */
export default function HomeScreen() {
  const user = useAuthUser();
  const organizacion = useOrganizacion();

  return (
    <Screen scrollable edges={['bottom']} contentClassName="gap-4">
      <View className="flex-row items-center gap-3">
        <BrandLogo size={48} />
        <View className="flex-1">
          <Text variant="subtitle">Bienvenido</Text>
          <Text variant="heading">{user?.nombreCompleto ?? 'Usuario'}</Text>
        </View>
      </View>

      <Card className="gap-1">
        <Text variant="label">Organizacion</Text>
        <Text variant="body">{organizacion?.nombre ?? 'COMRED'}</Text>
        <Text variant="caption">
          {[organizacion?.municipio, organizacion?.departamento].filter(Boolean).join(', ')}
        </Text>
      </Card>

      {organizacion?.telefonoEmergencia && (
        <Card className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-500">
            <Icon as={Phone} size={18} className="text-primary-foreground" />
          </View>
          <View className="flex-1">
            <Text variant="label">Telefono de emergencia</Text>
            <Text variant="body">{organizacion.telefonoEmergencia}</Text>
          </View>
        </Card>
      )}

      <Card className="gap-1">
        <Text variant="label">Rol</Text>
        <Text variant="body">{user?.rol?.nombre ?? 'Sin rol'}</Text>
      </Card>
    </Screen>
  );
}
