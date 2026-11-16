import { Platform } from 'react-native';

import paleta from '@/config/paleta';

/**
 * Valores crudos del tema.
 *
 * Los colores se editan en `src/config/paleta.js`, no aqui. Este archivo solo
 * los expone para los casos donde React Native exige un color literal y no
 * admite clases: navegacion, placeholders de inputs, StatusBar.
 *
 * Los colores de MARCA no estan aqui: dependen de la organizacion y se leen
 * con `useBrandColors()` (store), nunca de una constante.
 */
export const Colors = {
  light: {
    background: paleta.claro.fondo,
    surface: paleta.claro.fondoSuave,
    border: paleta.claro.borde,
    text: paleta.claro.texto,
    textMuted: paleta.claro.textoSecundario,
    textSubtle: paleta.claro.textoTenue,
    danger: paleta.estados.error[500],
  },
  dark: {
    background: paleta.oscuro.fondo,
    surface: paleta.oscuro.formulario,
    border: paleta.oscuro.borde,
    text: paleta.oscuro.texto,
    textMuted: paleta.oscuro.textoSecundario,
    textSubtle: paleta.oscuro.textoTenue,
    danger: paleta.estados.error[500],
  },
};

export type ColorTheme = typeof Colors.light;

/**
 * Esquema impuesto por `paleta.modo`, o `null` si la app sigue al sistema.
 * Lo impone `app/_layout.tsx` al arrancar y lo respeta `useColorScheme()` (hooks).
 */
export const ESQUEMA_FORZADO: 'light' | 'dark' | null =
  paleta.modo === 'oscuro' ? 'dark' : paleta.modo === 'claro' ? 'light' : null;

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
