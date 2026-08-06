/** @type {import('tailwindcss').Config} */
module.exports = {
  // Rutas que Tailwind escanea para generar las clases utilizadas.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  // Preset obligatorio de NativeWind: adapta el motor de Tailwind a React Native.
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      colors: {
        // ---- Marca COMRED ----------------------------------------------
        primary: {
          50: '#EEF6FF',
          100: '#D9EBFF',
          200: '#BCDCFF',
          300: '#8EC6FF',
          400: '#59A8FF',
          500: '#208AEF', // color base de la marca (splash screen)
          600: '#146FCC',
          700: '#1259A5',
          800: '#144C87',
          900: '#16406F',
          950: '#0E2847',
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

  plugins: [],
};
