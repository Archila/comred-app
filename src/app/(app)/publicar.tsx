import { PantallaNuevaPublicacion } from '@/components';

/** Nueva publicacion de la pagina principal. Solo administradores (ver `_layout`). */
export default function PublicarScreen() {
  return <PantallaNuevaPublicacion seccion="GENERAL" />;
}
