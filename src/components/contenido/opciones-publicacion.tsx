import { Clock, Eye, EyeOff, FileClock, Flag, Globe, UsersRound, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import type { GrupoDestino } from '@/hooks';
import type { VisibilidadPublicacion } from '@/models';
import { useCategoriasPublicas } from '@/store';

import { Text } from '../ui/text';
import { Campo, Chip, OpcionRadio } from './piezas-formulario';

/**
 * Opciones que comparten los formularios que crean una publicacion (la
 * general y el boletin): prioridad, quien la ve y la fecha sugerida de
 * vencimiento. Viven aqui para que las dos pantallas digan lo mismo.
 */

export const PRIORIDADES: { valor: number; etiqueta: string; descripcion: string; icono: LucideIcon }[] = [
  { valor: 0, etiqueta: 'Normal', descripcion: 'Por orden de fecha, con las demás.', icono: Clock },
  { valor: 50, etiqueta: 'Alta', descripcion: 'Antes que las normales en su sección.', icono: Flag },
  {
    valor: 100,
    etiqueta: 'Urgente',
    descripcion: 'La primera de su sección. Solo para emergencias activas.',
    icono: FileClock,
  },
];

const VISIBILIDADES: {
  valor: VisibilidadPublicacion;
  etiqueta: string;
  descripcion: string;
  icono: LucideIcon;
}[] = [
  { valor: 'PUBLICA', etiqueta: 'Pública', descripcion: 'La ve cualquier persona con la app.', icono: Globe },
  {
    valor: 'GRUPO',
    etiqueta: 'Solo un grupo',
    descripcion: 'Solo los miembros con sesión de una brigada, COCODE o categoría.',
    icono: UsersRound,
  },
  {
    valor: 'ADMINISTRATIVA',
    etiqueta: 'Interna',
    descripcion: 'No sale en la app: solo se consulta desde el panel.',
    icono: EyeOff,
  },
];

/** `dias` despues de `desde` (o de ahora), a la hora en punto siguiente. */
export function sumarDias(desde: Date | null, dias: number): Date {
  const fecha = new Date(desde ?? new Date());
  fecha.setDate(fecha.getDate() + dias);
  fecha.setHours(fecha.getHours() + 1, 0, 0, 0);
  return fecha;
}

/**
 * Visibilidad y, si es de un grupo, cual. Los grupos salen del arbol
 * organizativo que la app ya cargo al arrancar: una categoria entera (todas
 * las brigadas) o una subcategoria (una brigada).
 */
export function SelectorVisibilidad({
  visibilidad,
  grupo,
  error,
  deshabilitado,
  onCambiar,
}: {
  visibilidad: VisibilidadPublicacion;
  grupo: GrupoDestino | null;
  error?: string;
  deshabilitado: boolean;
  onCambiar: (cambios: { visibilidad: VisibilidadPublicacion; grupo: GrupoDestino | null }) => void;
}) {
  const arbol = useCategoriasPublicas();
  // Sin grupos configurados, "solo un grupo" seria un camino sin salida.
  const opciones = VISIBILIDADES.filter((opcion) => opcion.valor !== 'GRUPO' || arbol.length > 0);

  return (
    <Campo icono={Eye} titulo="¿Quién la ve?" error={error}>
      <View className="gap-2">
        {opciones.map((opcion) => (
          <OpcionRadio
            key={opcion.valor}
            icono={opcion.icono}
            etiqueta={opcion.etiqueta}
            descripcion={opcion.descripcion}
            seleccionada={visibilidad === opcion.valor}
            deshabilitado={deshabilitado}
            onPress={() => onCambiar({ visibilidad: opcion.valor, grupo: opcion.valor === 'GRUPO' ? grupo : null })}
          />
        ))}
      </View>

      {visibilidad === 'GRUPO' && (
        <View className="gap-4 rounded-field border border-line p-3 dark:border-line-dark">
          {arbol.map((categoria) => (
            <View key={categoria.id} className="gap-2">
              <Text variant="label" className="uppercase">
                {categoria.nombre}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  etiqueta={`Todo ${categoria.nombre}`}
                  seleccionado={grupo?.tipo === 'categoria' && grupo.id === categoria.id}
                  deshabilitado={deshabilitado}
                  onPress={() =>
                    onCambiar({ visibilidad: 'GRUPO', grupo: { tipo: 'categoria', id: categoria.id } })
                  }
                />
                {categoria.subcategorias.map((subcategoria) => (
                  <Chip
                    key={subcategoria.id}
                    etiqueta={subcategoria.nombre}
                    seleccionado={grupo?.tipo === 'subcategoria' && grupo.id === subcategoria.id}
                    deshabilitado={deshabilitado}
                    onPress={() =>
                      onCambiar({ visibilidad: 'GRUPO', grupo: { tipo: 'subcategoria', id: subcategoria.id } })
                    }
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </Campo>
  );
}
