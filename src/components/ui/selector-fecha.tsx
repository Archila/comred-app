import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarClock } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { cn, fechaSinHora, formatDateOnly, formatDateTime } from '@/lib';
import { useBrandColors } from '@/store';

import { Button } from './button';
import { Icon } from './icon';
import { aMediodia, fechaInicial, type SelectorFechaProps } from './selector-fecha.comun';
import { Text } from './text';

export { proximaHora, type SelectorFechaProps } from './selector-fecha.comun';

/**
 * Fecha y hora, con el selector nativo del telefono. En web se usa
 * `selector-fecha.web.tsx`: este paquete no tiene version para navegador.
 *
 * Android no tiene un selector de fecha y hora a la vez: se abre el de fecha
 * y, al aceptarlo, el de hora. En iOS se despliega el calendario bajo el campo.
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
  const brand = useBrandColors();
  const [abiertoIos, setAbiertoIos] = useState(false);
  const inicial = fechaInicial(valor, minimo, maximo);
  // Solo el dia: se muestra con sus componentes locales, sin pasar por la zona de Guatemala.
  const texto = valor ? (soloFecha ? formatDateOnly(fechaSinHora(valor)) : formatDateTime(valor)) : '';

  function abrir() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: inicial,
        mode: 'date',
        minimumDate: minimo,
        maximumDate: maximo,
        onValueChange: (_evento, fecha) =>
          soloFecha
            ? onCambiar(aMediodia(fecha))
            : DateTimePickerAndroid.open({
                value: fecha,
                mode: 'time',
                is24Hour: true,
                onValueChange: (_eventoHora, conHora) => onCambiar(conHora),
              }),
      });
      return;
    }
    setAbiertoIos((abierto) => !abierto);
  }

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={valor ? `Fecha elegida: ${texto}` : placeholder}
        disabled={deshabilitado}
        onPress={abrir}
        className={cn(
          'h-control flex-row items-center gap-2 rounded-field border bg-surface px-3 dark:bg-surface-dark-muted',
          error ? 'border-danger-500' : 'border-line dark:border-line-dark',
          deshabilitado && 'opacity-60',
        )}
      >
        <Icon as={CalendarClock} size={18} className="text-content-subtle dark:text-content-dark-subtle" />
        <Text
          variant="plain"
          className={cn(
            'flex-1 text-base',
            valor ? 'text-content dark:text-content-dark-default' : 'text-content-subtle dark:text-content-dark-subtle',
          )}
        >
          {valor ? texto : placeholder}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && abiertoIos && (
        <View className="items-center rounded-field border border-line bg-surface p-2 dark:border-line-dark dark:bg-surface-dark-muted">
          <DateTimePicker
            value={inicial}
            mode={soloFecha ? 'date' : 'datetime'}
            display="inline"
            locale="es-GT"
            minimumDate={minimo}
            maximumDate={maximo}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            accentColor={brand.primary}
            onValueChange={(_evento, fecha) => onCambiar(soloFecha ? aMediodia(fecha) : fecha)}
          />
          <Button label="Listo" variant="ghost" size="sm" onPress={() => setAbiertoIos(false)} />
        </View>
      )}

      {error && <Text variant="error">{error}</Text>}
    </View>
  );
}
