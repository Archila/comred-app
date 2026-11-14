import {
  generateColorScale,
  getReadableForeground,
  parseColor,
  toHex,
  toRgbTriple,
  tripleToHex,
  type ColorShade,
} from './color';

/**
 * Traduce los dos colores que guarda una organizacion a todo lo que necesita
 * la app para pintarse con su marca:
 *
 *   - `cssVars`: variables que NativeWind inyecta con `vars()`, y que
 *     resuelven las clases `bg-primary-500`, `text-secondary-600`, etc.
 *   - `colors`: los mismos colores en hex, para los puntos donde React Native
 *     exige un valor literal (tab bar, ActivityIndicator, StatusBar).
 */

/**
 * Marca por defecto: rojo de accion (primario) y azul institucional del
 * encabezado y el menu (secundario). Debe coincidir con `addBase` de
 * tailwind.config.js.
 */
export const DEFAULT_BRAND = {
  primario: '#D7141A',
  secundario: '#0B1F4B',
} as const;

export interface BrandColors {
  /** Color base de la marca (equivale a `primary-500`). */
  primary: string;
  /** Variante presionada / oscura (equivale a `primary-600`). */
  primaryDark: string;
  /** Color de texto legible sobre `primary`. */
  primaryForeground: string;
  secondary: string;
  secondaryDark: string;
  secondaryForeground: string;
}

export interface BrandTheme {
  cssVars: Record<string, string>;
  colors: BrandColors;
}

function buildPalette(name: 'primary' | 'secondary', input: string | undefined, fallback: string) {
  // Si la organizacion tiene un color invalido o vacio, se cae al de COMRED
  // en lugar de romper la pantalla.
  const base = parseColor(input) ?? parseColor(fallback)!;

  const scale = generateColorScale(base);
  const foreground = getReadableForeground(base);

  const cssVars: Record<string, string> = {};
  for (const shade of Object.keys(scale) as unknown as ColorShade[]) {
    cssVars[`--color-${name}-${shade}`] = scale[shade];
  }
  cssVars[`--color-${name}-foreground`] = toRgbTriple(foreground);

  return {
    cssVars,
    base: toHex(base),
    dark: tripleToHex(scale[600]),
    foreground: toHex(foreground),
  };
}

/**
 * @param colorPrimario   `colorPrimario` de la organizacion (puede venir vacio)
 * @param colorSecundario `colorSecundario` de la organizacion
 */
export function buildBrandTheme(
  colorPrimario?: string | null,
  colorSecundario?: string | null,
): BrandTheme {
  const primary = buildPalette('primary', colorPrimario ?? undefined, DEFAULT_BRAND.primario);
  const secondary = buildPalette(
    'secondary',
    colorSecundario ?? undefined,
    DEFAULT_BRAND.secundario,
  );

  return {
    cssVars: { ...primary.cssVars, ...secondary.cssVars },
    colors: {
      primary: primary.base,
      primaryDark: primary.dark,
      primaryForeground: primary.foreground,
      secondary: secondary.base,
      secondaryDark: secondary.dark,
      secondaryForeground: secondary.foreground,
    },
  };
}
