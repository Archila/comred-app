import { SeccionStack } from '@/components';

/** Las tarjetas quedan siempre debajo: "atras" desde el visor vuelve a ellas. */
export const unstable_settings = { anchor: 'index' };

/** Reportes de desastres (Plan Maestro, 5): tipos de desastre -> sus reportes. */
export default function ReportesLayout() {
  return <SeccionStack seccion="REPORTES" />;
}
