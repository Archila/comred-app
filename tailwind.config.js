/**
 * Los colores NO se editan aqui: salen de `src/config/paleta.js`.
 * Tras cambiar la paleta hay que reiniciar Metro con `npx expo start -c`.
 */
const paleta = require('./src/config/paleta');

/**
 * Escala 50-950 de un color de marca, como variables CSS en formato triple
 * RGB ("215 20 26") para `rgb(var(--x) / <alpha-value>)`.
 *
 * Replica `generateColorScale` y `getReadableForeground` de `src/lib/color.ts`
 * (aquel es TypeScript y este archivo corre en Node sin transpilar). Si se
 * cambia la mezcla alli, hay que cambiarla aqui.
 */
const MEZCLA_TONOS = {
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

function variablesDeMarca(nombre, hex) {
  const base = [1, 3, 5].map((i) => parseInt(hex.replace('#', '').slice(i - 1, i + 1), 16));
  const variables = {};

  for (const [tono, peso] of Object.entries(MEZCLA_TONOS)) {
    const destino = peso > 0 ? 255 : 0;
    const mezcla = base.map((canal) =>
      Math.max(0, Math.min(255, Math.round(canal + (destino - canal) * Math.abs(peso)))),
    );
    variables[`--color-${nombre}-${tono}`] = mezcla.join(' ');
  }

  // Luminancia WCAG: texto casi negro sobre marcas claras, blanco sobre oscuras.
  const [r, g, b] = base.map((canal) => {
    const v = canal / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  variables[`--color-${nombre}-foreground`] = luminancia > 0.5 ? '15 23 42' : '255 255 255';

  return variables;
}

const { oscuro, claro, estados } = paleta;

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Rutas que Tailwind escanea para generar las clases utilizadas.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  // Preset obligatorio de NativeWind: adapta el motor de Tailwind a React Native.
  presets: [require('nativewind/preset')],

  // Con un modo fijo (`oscuro` / `claro`) la app lo impone con
  // `colorScheme.set()` de NativeWind, que exige la estrategia `class`.
  // En `sistema` basta con seguir la media query del telefono.
  darkMode: paleta.modo === 'sistema' ? 'media' : 'class',

  theme: {
    extend: {
      colors: {
        // ---- Marca de la organizacion (DINAMICA) -------------------------
        // Estos colores NO son fijos: se resuelven en tiempo de ejecucion
        // desde variables CSS que `BrandingProvider` reescribe con los
        // colores de la organizacion (`colorPrimario` / `colorSecundario`).
        // Los valores por defecto viven en el plugin `addBase` de abajo.
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
          /** Texto legible ENCIMA del color primario (blanco o casi negro). */
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },

        secondary: {
          50: 'rgb(var(--color-secondary-50) / <alpha-value>)',
          100: 'rgb(var(--color-secondary-100) / <alpha-value>)',
          200: 'rgb(var(--color-secondary-200) / <alpha-value>)',
          300: 'rgb(var(--color-secondary-300) / <alpha-value>)',
          400: 'rgb(var(--color-secondary-400) / <alpha-value>)',
          500: 'rgb(var(--color-secondary-500) / <alpha-value>)',
          600: 'rgb(var(--color-secondary-600) / <alpha-value>)',
          700: 'rgb(var(--color-secondary-700) / <alpha-value>)',
          800: 'rgb(var(--color-secondary-800) / <alpha-value>)',
          900: 'rgb(var(--color-secondary-900) / <alpha-value>)',
          950: 'rgb(var(--color-secondary-950) / <alpha-value>)',
          foreground: 'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },

        // ---- Estados ----------------------------------------------------
        success: estados.exito,
        warning: estados.advertencia,
        danger: estados.error,

        // ---- Superficies / texto ----------------------------------------
        // Se usan siempre en pareja con la variante `dark:` dentro de los
        // componentes de `src/components/ui`, para no repetir colores sueltos
        // en las pantallas. Valores en `src/config/paleta.js`.
        surface: {
          DEFAULT: claro.fondo,
          muted: claro.fondoSuave,
          sunken: claro.hundido,
          dark: oscuro.fondo,
          'dark-muted': oscuro.formulario,
          'dark-sunken': oscuro.hundido,
        },
        content: {
          DEFAULT: claro.texto,
          muted: claro.textoSecundario,
          subtle: claro.textoTenue,
          inverted: '#FFFFFF',
          'dark-default': oscuro.texto,
          'dark-muted': oscuro.textoSecundario,
          'dark-subtle': oscuro.textoTenue,
        },
        line: {
          DEFAULT: claro.borde,
          strong: claro.bordeFuerte,
          dark: oscuro.borde,
          'dark-strong': oscuro.bordeFuerte,
        },
      },

      borderRadius: {
        card: '16px',
        field: '12px',
      },

      spacing: {
        // Altura estándar de inputs y botones (touch target cómodo).
        control: '48px',
      },
    },
  },

  plugins: [
    /**
     * Valores por defecto de la marca (`paleta.marca`): primario para
     * acciones, secundario para encabezado y menu.
     *
     * Se usan cuando la app aun no ha recibido la configuracion publica de la
     * organizacion, cuando el endpoint falla o cuando la organizacion no tiene
     * colores configurados. `BrandingProvider` los sobreescribe en runtime con
     * `vars()` de NativeWind.
     */
    ({ addBase }) =>
      addBase({
        ':root': {
          ...variablesDeMarca('primary', paleta.marca.primario),
          ...variablesDeMarca('secondary', paleta.marca.secundario),
        },
      }),
  ],
};
