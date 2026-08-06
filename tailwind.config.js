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
     * Valores por defecto de la marca (COMRED central, azul #208AEF).
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
          // primary — base #208AEF
          '--color-primary-50': '239 247 254',
          '--color-primary-100': '222 237 253',
          '--color-primary-200': '188 220 250',
          '--color-primary-300': '144 197 247',
          '--color-primary-400': '99 173 244',
          '--color-primary-500': '32 138 239',
          '--color-primary-600': '27 117 203',
          '--color-primary-700': '22 97 167',
          '--color-primary-800': '18 76 131',
          '--color-primary-900': '13 55 96',
          '--color-primary-950': '7 30 53',
          '--color-primary-foreground': '255 255 255',

          // secondary — base #16406F
          '--color-secondary-50': '239 242 245',
          '--color-secondary-100': '220 226 233',
          '--color-secondary-200': '185 198 212',
          '--color-secondary-300': '139 160 183',
          '--color-secondary-400': '92 121 154',
          '--color-secondary-500': '22 64 111',
          '--color-secondary-600': '19 54 94',
          '--color-secondary-700': '15 45 78',
          '--color-secondary-800': '12 35 61',
          '--color-secondary-900': '9 26 44',
          '--color-secondary-950': '5 14 24',
          '--color-secondary-foreground': '255 255 255',
        },
      }),
  ],
};
