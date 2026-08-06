/**
 * Utilidades de color para el theming dinamico por organizacion.
 *
 * El API solo guarda DOS colores por organizacion (`colorPrimario` y
 * `colorSecundario`), pero los componentes usan una escala completa
 * (`bg-primary-500`, `active:bg-primary-600`, `bg-primary-50`...). Aqui se
 * genera esa escala mezclando el color base con blanco (tonos claros) y con
 * negro (tonos oscuros).
 *
 * Es una mezcla en sRGB, no en un espacio perceptual como OKLCH: suficiente y
 * predecible para una marca institucional, y sin dependencias externas.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export const COLOR_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type ColorShade = (typeof COLOR_SHADES)[number];

/**
 * Cuanto se mezcla cada tono respecto al color base (500).
 * Positivo = hacia blanco, negativo = hacia negro.
 */
const SHADE_MIX: Record<ColorShade, number> = {
  50: 0.93,
  100: 0.85,
  200: 0.7,
  300: 0.5,
  400: 0.3,
  500: 0,
  600: -0.15,
  700: -0.3,
  800: -0.45,
  900: -0.6,
  950: -0.78,
};

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/** Texto oscuro para fondos claros (mismo valor que `content.DEFAULT`). */
const DARK_FOREGROUND: Rgb = { r: 15, g: 23, b: 42 };

/**
 * Acepta `#RGB`, `#RRGGBB` y `rgb(r, g, b)`.
 * Devuelve `null` si el valor no es un color valido: el llamador decide el
 * fallback en vez de pintar algo aleatorio.
 */
export function parseColor(input?: string | null): Rgb | null {
  if (!input) return null;

  const value = input.trim();

  const hexMatch = value.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((char) => char + char)
        .join('');
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  const rgbMatch = value.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return { r: clampChannel(Number(r)), g: clampChannel(Number(g)), b: clampChannel(Number(b)) };
  }

  return null;
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Mezcla `color` con `target`. `weight` 0 = sin cambios, 1 = `target` puro. */
export function mixColor(color: Rgb, target: Rgb, weight: number): Rgb {
  const w = Math.max(0, Math.min(1, weight));
  return {
    r: clampChannel(color.r + (target.r - color.r) * w),
    g: clampChannel(color.g + (target.g - color.g) * w),
    b: clampChannel(color.b + (target.b - color.b) * w),
  };
}

/** Formato que exige `rgb(var(--x) / <alpha-value>)` de Tailwind: "32 138 239". */
export function toRgbTriple({ r, g, b }: Rgb): string {
  return `${r} ${g} ${b}`;
}

export function toHex({ r, g, b }: Rgb): string {
  const hex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

/** Convierte el triple `"32 138 239"` de vuelta a `#208AEF`. */
export function tripleToHex(triple: string): string {
  const [r, g, b] = triple.split(/\s+/).map(Number);
  return toHex({ r: clampChannel(r), g: clampChannel(g), b: clampChannel(b) });
}

/** Luminancia relativa (WCAG), para decidir el color del texto encima. */
export function getLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Color de texto legible sobre `background`.
 *
 * Importante para multi-tenant: si una municipalidad configura un amarillo
 * claro como color primario, el texto blanco del boton seria ilegible.
 */
export function getReadableForeground(background: Rgb): Rgb {
  return getLuminance(background) > 0.5 ? DARK_FOREGROUND : WHITE;
}

/** Escala 50-950 en formato triple RGB, lista para las variables CSS. */
export function generateColorScale(base: Rgb): Record<ColorShade, string> {
  const scale = {} as Record<ColorShade, string>;

  for (const shade of COLOR_SHADES) {
    const weight = SHADE_MIX[shade];
    const mixed =
      weight === 0
        ? base
        : weight > 0
          ? mixColor(base, WHITE, weight)
          : mixColor(base, BLACK, -weight);

    scale[shade] = toRgbTriple(mixed);
  }

  return scale;
}
