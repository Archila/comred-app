import { useLocalSearchParams } from 'expo-router';
import { Construction } from 'lucide-react-native';

import { EmptyState, Screen } from '@/components';
import { buscarSeccion } from '@/constants';

/**
 * Pantalla provisional de las secciones del menu que aun no estan construidas
 * (mapa, COCODES). El titulo lo pone el encabezado.
 */
export default function SeccionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const seccion = buscarSeccion(slug);

  return (
    <Screen edges={['bottom']}>
      <EmptyState
        icon={seccion?.icono ?? Construction}
        title="Próximamente"
        description={
          seccion
            ? `La sección "${seccion.etiqueta}" estará disponible en una próxima versión.`
            : 'Esta sección no existe.'
        }
      />
    </Screen>
  );
}
