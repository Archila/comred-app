import { Platform } from 'react-native';

/**
 * Valores crudos del tema.
 *
 * La fuente de verdad del estilo es `tailwind.config.js` (clases `className`).
 * Este archivo solo existe para los casos donde React Native exige un color
 * literal y no admite clases: navegacion, StatusBar, iconos SVG, gradientes.
 * Si cambias un color aqui, cambialo tambien en tailwind.config.js.
 */
export const Colors = {
  brand: {
    500: '#208AEF',
    600: '#146FCC',
    700: '#1259A5',
  },
  light: {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#475569',
    textSubtle: '#94A3B8',
    danger: '#EF4444',
  },
  dark: {
    background: '#0B1220',
    surface: '#111A2E',
    border: '#1E293B',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    textSubtle: '#64748B',
    danger: '#EF4444',
  },
} as const;

export type ColorTheme = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Ancho maximo del contenido en tablet / web. */
export const MaxContentWidth = 800;
