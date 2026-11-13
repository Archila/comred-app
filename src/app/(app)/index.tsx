import { useRouter } from 'expo-router';
import { History, Megaphone, Phone, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import { BrandLogo, Button, Card, Icon, Screen, Text } from '@/components';
import { useCapacidadesEnvio } from '@/hooks';
import { useAuthUser, useOrganizacion } from '@/store';

/** Pantalla de inicio. */
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

      <AccesoAvisos />

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

/**
 * Acceso directo para quien envia avisos. La pestana "Enviar" ya existe, pero
 * en una emergencia no hay que buscarla: es lo primero que ve un coordinador
 * al abrir la app. A un vecino no le aparece.
 */
function AccesoAvisos() {
  const router = useRouter();
  const { data: capacidades } = useCapacidadesEnvio();

  if (!capacidades?.puedeEnviar && !capacidades?.puedeVerHistorial) return null;

  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-500">
          <Icon as={Megaphone} size={18} className="text-primary-foreground" />
        </View>
        <View className="flex-1">
          <Text variant="heading">Avisos a la poblacion</Text>
          <Text variant="caption">
            {capacidades.puedeEnviar
              ? 'Envia un aviso y revisa quien lo leyo.'
              : 'Revisa los avisos enviados y quien los leyo.'}
          </Text>
        </View>
      </View>

      {capacidades.puedeEnviar && (
        <Button
          label="Nuevo aviso"
          icon={Plus}
          size="lg"
          fullWidth
          onPress={() => router.push('/mensajes/nuevo')}
        />
      )}
      {capacidades.puedeVerHistorial && (
        <Button
          label="Ver avisos enviados"
          icon={History}
          variant="outline"
          fullWidth
          onPress={() => router.push('/mensajes')}
        />
      )}
    </Card>
  );
}
