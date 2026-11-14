/** @type {import('tailwindcss').Config} */
module.exports = {
  // Rutas que Tailwind escanea para generar las clases utilizadas.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  // Preset obligatorio de NativeWind: adapta el motor de Tailwind a React Native.
  presets: [require('nativewind/preset')],

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
        success: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },

        // ---- Superficies / texto ----------------------------------------
        // Se usan siempre en pareja con la variante `dark:` dentro de los
        // componentes de `src/components/ui`, para no repetir colores sueltos
        // en las pantallas.
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          sunken: '#F1F5F9',
          dark: '#0B1220',
          'dark-muted': '#111A2E',
          'dark-sunken': '#0A1020',
        },
        content: {
          DEFAULT: '#0F172A',
          muted: '#475569',
          subtle: '#94A3B8',
          inverted: '#FFFFFF',
          'dark-default': '#E2E8F0',
          'dark-muted': '#94A3B8',
          'dark-subtle': '#64748B',
        },
        line: {
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
          dark: '#1E293B',
          'dark-strong': '#334155',
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
     * Valores por defecto de la marca: rojo #D7141A como color de accion
     * (primary) y azul institucional #0B1F4B para encabezado y menu (secondary).
     *
     * Se usan cuando la app aun no ha recibido la configuracion publica de la
     * organizacion, cuando el endpoint falla o cuando la organizacion no tiene
     * colores configurados. `BrandingProvider` los sobreescribe en runtime con
     * `vars()` de NativeWind.
     *
     * Fueron generados con el mismo algoritmo que usa `lib/color.ts`, para que
     * el look por defecto sea identico al que produciria la organizacion si
     * configurara exactamente estos colores base.
     */
    ({ addBase }) =>
      addBase({
        ':root': {
          // primary — base #D7141A (rojo: acentos, botones, elemento activo)
          '--color-primary-50': '252 239 239',
          '--color-primary-100': '249 220 221',
          '--color-primary-200': '243 185 186',
          '--color-primary-300': '235 138 141',
          '--color-primary-400': '227 91 95',
          '--color-primary-500': '215 20 26',
          '--color-primary-600': '183 17 22',
          '--color-primary-700': '151 14 18',
          '--color-primary-800': '118 11 14',
          '--color-primary-900': '86 8 10',
          '--color-primary-950': '47 4 6',
          '--color-primary-foreground': '255 255 255',

          // secondary — base #0B1F4B (azul institucional: encabezado y menu)
          '--color-secondary-50': '238 239 242',
          '--color-secondary-100': '218 221 228',
          '--color-secondary-200': '182 188 201',
          '--color-secondary-300': '133 143 165',
          '--color-secondary-400': '84 98 129',
          '--color-secondary-500': '11 31 75',
          '--color-secondary-600': '9 26 64',
          '--color-secondary-700': '8 22 53',
          '--color-secondary-800': '6 17 41',
          '--color-secondary-900': '4 12 30',
          '--color-secondary-950': '2 7 17',
          '--color-secondary-foreground': '255 255 255',
        },
      }),
  ],
};
