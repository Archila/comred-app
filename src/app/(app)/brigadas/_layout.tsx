import { SeccionStack } from '@/components';

/** Las tarjetas quedan siempre debajo: "atras" desde el visor vuelve a ellas. */
export const unstable_settings = { anchor: 'index' };

/**
 * Brigadas (Plan Maestro, 8): categorias -> sus publicaciones. Lo interno de una
 * brigada solo lo envia el API al aparato con sesion de uno de sus miembros.
 */
export default function BrigadasLayout() {
  return <SeccionStack seccion="BRIGADAS" />;
}
