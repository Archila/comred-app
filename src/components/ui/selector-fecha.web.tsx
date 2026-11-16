import { createElement } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { SelectorFechaProps } from './selector-fecha.comun';
import { Text } from './text';

export { proximaHora, type SelectorFechaProps } from './selector-fecha.comun';

/** `AAAA-MM-DDTHH:mm` en hora local, el formato de `<input type="datetime-local">`. */
function aLocal(fecha: Date): string {
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/**
 * Version web de `SelectorFecha`: el selector del navegador. El paquete
 * nativo no tiene version web, y Metro elige este archivo al compilar para web.
 */
export function SelectorFecha({
  valor,
  onCambiar,
  minimo,
  placeholder,
  error,
  deshabilitado = false,
}: SelectorFechaProps) {
  const scheme = useColorScheme();
  const tema = scheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <View className="gap-2">
      {createElement('input', {
        type: 'datetime-local',
        'aria-label': placeholder,
        value: valor ? aLocal(valor) : '',
        min: minimo ? aLocal(minimo) : undefined,
        disabled: deshabilitado,
        onChange: (evento: { target: { value: string } }) => {
          const texto = evento.target.value;
          if (texto) onCambiar(new Date(texto));
        },
        style: {
          height: 48,
          borderRadius: 12,
          border: `1px solid ${error ? tema.danger : tema.border}`,
          backgroundColor: tema.surface,
          color: tema.text,
          colorScheme: scheme === 'dark' ? 'dark' : 'light',
          padding: '0 12px',
          fontSize: 16,
        },
      })}
      {error && <Text variant="error">{error}</Text>}
    </View>
  );
}
