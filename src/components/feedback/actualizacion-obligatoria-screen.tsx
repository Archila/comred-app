import { Download } from 'lucide-react-native';
import { View } from 'react-native';

import { abrirActualizacion, getVersionApp } from '@/lib';

import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';

// Constante del binario: no cambia mientras la app esta abierta.
const VERSION_APP = getVersionApp();

/**
 * Muro cuando el binario esta por debajo de la version minima de la
 * organizacion.
 *
 * No tiene salida a proposito: el API ya rechaza el login de esta version, asi
 * que dejar ver el formulario solo llevaria a un error tras escribir la clave.
 */
export function ActualizacionObligatoriaScreen({
  urlActualizacion,
}: {
  /** `null` si el API no tiene enlace de descarga para esta organizacion. */
  urlActualizacion: string | null;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-surface p-6 dark:bg-surface-dark">
      <Icon as={Download} size={40} className="text-primary-500" />
      <Text variant="heading">Actualizacion necesaria</Text>
      <Text variant="subtitle" className="text-center">
        Esta version de la aplicacion ya no es compatible. Actualizala para seguir recibiendo y
        enviando avisos.
      </Text>

      {urlActualizacion ? (
        <Button
          label="Actualizar"
          icon={Download}
          onPress={() => void abrirActualizacion(urlActualizacion)}
        />
      ) : (
        <Text variant="subtitle" className="text-center">
          Solicita la nueva version a tu municipalidad.
        </Text>
      )}

      {/* Para saber que version tiene el telefono al dar soporte. */}
      {VERSION_APP.length > 0 && (
        <Text variant="caption" selectable>
          {VERSION_APP}
        </Text>
      )}
    </View>
  );
}
