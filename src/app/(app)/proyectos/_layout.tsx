import { SeccionStack } from '@/components';

/** Las tarjetas quedan siempre debajo: "atras" desde el visor vuelve a ellas. */
export const unstable_settings = { anchor: 'index' };

/** Proyectos actuales (Plan Maestro, 10): tipos de proyecto -> su seguimiento. */
export default function ProyectosLayout() {
  return <SeccionStack seccion="PROYECTOS" />;
}
