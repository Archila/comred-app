import { SeccionStack } from '@/components';

/** Las tarjetas quedan siempre debajo: "atras" desde el visor vuelve a ellas. */
export const unstable_settings = { anchor: 'index' };

/** Jornadas municipales (Plan Maestro, 7): tipos de jornada -> sus jornadas. */
export default function JornadasLayout() {
  return <SeccionStack seccion="JORNADAS" />;
}
