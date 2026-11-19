import { createElement } from 'react';
import { View } from 'react-native';

import { Colors } from '@/constants';
import { useColorScheme } from '@/hooks/use-color-scheme';

import type { SelectorFechaProps } from './selector-fecha.comun';
import { Text } from './text';

export { proximaHora, type SelectorFechaProps } from './selector-fecha.comun';

const dos = (n: number) => String(n).padStart(2, '0');

/** `AAAA-MM-DD` en hora local, el formato de `<input type="date">`. */
function aDiaLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

/** `AAAA-MM-DDTHH:mm` en hora local, el formato de `<input type="datetime-local">`. */
function aLocal(fecha: Date): string {
  return `${aDiaLocal(fecha)}T${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
}

/**
 * `new Date('AAAA-MM-DD')` es medianoche UTC, que en Guatemala es el dia
 * anterior: se arma a mediodia local.
 */
function deDiaLocal(texto: string): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  return partes ? new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]), 12) : null;
}

/**
 * Version web de `SelectorFecha`: el selector del navegador. El paquete
 * nativo no tiene version web, y Metro elige este archivo al compilar para web.
 */
export function SelectorFecha({
  valor,
  onCambiar,
  minimo,
  maximo,
  placeholder,
  error,
  deshabilitado = false,
  soloFecha = false,
}: SelectorFechaProps) {
  const scheme = useColorScheme();
  const tema = scheme === 'dark' ? Colors.dark : Colors.light;
  const formato = soloFecha ? aDiaLocal : aLocal;

  return (
    <View className="gap-2">
      {createElement('input', {
        type: soloFecha ? 'date' : 'datetime-local',
        'aria-label': placeholder,
        value: valor ? formato(valor) : '',
        min: minimo ? formato(minimo) : undefined,
        max: maximo ? formato(maximo) : undefined,
        disabled: deshabilitado,
        onChange: (evento: { target: { value: string } }) => {
          const texto = evento.target.value;
          if (!texto) return;
          const fecha = soloFecha ? deDiaLocal(texto) : new Date(texto);
          if (fecha) onCambiar(fecha);
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
