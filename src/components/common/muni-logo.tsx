import { Image } from 'expo-image';
import { View } from 'react-native';

import { useOrganizacion } from '@/store';

// Escudo empaquetado en el binario: se ve aun sin red ni bootstrap previo.
const LOGO_MUNI = require('@/assets/images/logo-muni.png');

/**
 * Escudo de la municipalidad dentro de un circulo blanco.
 *
 * El circulo no es decorativo: el JPEG trae fondo blanco, y sobre el azul del
 * encabezado o del menu se veria como un recuadro.
 */
export function MuniLogo({ size = 44 }: { size?: number }) {
  const organizacion = useOrganizacion();
  const interior = Math.round(size * 0.9);

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center overflow-hidden bg-white"
    >
      <Image
        source={LOGO_MUNI}
        style={{ width: interior, height: interior }}
        contentFit="contain"
        accessibilityLabel={organizacion?.nombre ?? 'Logo de la municipalidad'}
      />
    </View>
  );
}

/** Subtitulo institucional que acompana a "COMRED" en encabezado, menu y login. */
export function useNombreMunicipalidad(): string {
  const organizacion = useOrganizacion();
  return organizacion?.municipio
    ? `Municipalidad de ${organizacion.municipio}`
    : 'Municipalidad de San Carlos Sija';
}
