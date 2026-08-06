import { LogOut } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, ErrorState, LoadingScreen, Screen, Text } from '@/components';
import { useCurrentUser, useLogout } from '@/hooks';
import { getInitials } from '@/lib';

/**
 * Perfil del usuario. Muestra el patron completo de una pantalla de lectura:
 * `useQuery` -> estados de carga / error / datos.
 */
export default function PerfilScreen() {
  const { data: user, isLoading, isError, error, refetch } = useCurrentUser();
  const logout = useLogout();

  if (isLoading && !user) return <LoadingScreen message="Cargando perfil..." />;
  if (isError && !user) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <Screen scrollable edges={['bottom']} contentClassName="gap-4">
      <View className="items-center gap-2 py-4">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-500">
          <Text className="text-2xl font-bold text-white">
            {getInitials(user?.nombreCompleto)}
          </Text>
        </View>
        <Text variant="heading">{user?.nombreCompleto}</Text>
        <Text variant="caption">@{user?.userName}</Text>
      </View>

      <Card className="gap-3">
        <Field label="Correo" value={user?.correo ?? 'No registrado'} />
        <Field label="Documento" value={user?.documento ?? 'No registrado'} />
        <Field label="Rol" value={user?.rol?.nombre ?? 'Sin rol'} />
        <Field label="Sucursal" value={user?.sucursal?.nombre ?? 'Sin asignar'} />
      </Card>

      <Button label="Cerrar sesion" variant="danger" icon={LogOut} fullWidth onPress={logout} />
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text variant="label">{label}</Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}
