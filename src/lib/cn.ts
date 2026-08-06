/**
 * Une clases de Tailwind condicionalmente.
 *
 * Version minima sin dependencias: filtra falsy y aplana.
 * Nota: no resuelve conflictos como `tailwind-merge` (`p-2 p-4` deja ambas y
 * gana la ultima que procese NativeWind). Para los componentes de `ui/`
 * definimos primero las clases base y despues `className`, que es justo el
 * orden que hace que la clase del consumidor gane.
 */
export type ClassValue = string | number | null | false | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  const output: string[] = [];

  for (const input of inputs) {
    if (!input) continue;
    if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) output.push(nested);
    } else {
      output.push(String(input));
    }
  }

  return output.join(' ');
}
