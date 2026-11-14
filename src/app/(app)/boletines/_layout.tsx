import { SeccionStack } from '@/components';

/** Las tarjetas quedan siempre debajo: "atras" desde el visor vuelve a ellas. */
export const unstable_settings = { anchor: 'index' };

/** Boletines informativos y preventivos (Plan Maestro, 6): temas -> sus boletines. */
export default function BoletinesLayout() {
  return <SeccionStack seccion="BOLETINES" />;
}
