/**
 * PALETA DE COLORES DE LA APP
 * ===========================
 *
 * Unico lugar donde se cambian los colores. Lo leen:
 *   - `tailwind.config.js`     -> clases `bg-surface-dark`, `text-content-dark-muted`,
 *                                 `bg-primary-500`, `bg-secondary-500`...
 *   - `src/constants/theme.ts` -> colores literales (navegacion, placeholders)
 *   - `src/lib/branding.ts`    -> marca por defecto
 *   - `src/constants/mapa.ts`  -> contorno del municipio
 *   - `app.config.js`          -> fondo del splash y tema nativo
 *
 * Despues de cambiar un valor:
 *   - Reiniciar Metro limpiando la cache: `npx expo start -c`
 *     (Tailwind lee este archivo solo al arrancar).
 *   - El splash y el tema nativo solo cambian al recompilar el APK
 *     (`npx expo prebuild` + `npx expo run:android`).
 *
 * Formato: hex `#RRGGBB`.
 *
 * Va en CommonJS (`module.exports`) a proposito: `tailwind.config.js` y
 * `app.config.js` se ejecutan en Node sin transpilar y lo cargan con `require`.
 */

const paleta = {
  /**
   * Tema que usa la app:
   *   'oscuro'  -> siempre oscuro (la paleta de abajo esta pensada para esto)
   *   'claro'   -> siempre claro
   *   'sistema' -> sigue el ajuste del telefono
   *
   * @type {'oscuro' | 'claro' | 'sistema'}
   */
  modo: 'oscuro',

  /**
   * Marca POR DEFECTO. Si la organizacion tiene `colorPrimario` /
   * `colorSecundario` configurados en el panel, esos tienen prioridad.
   * Con cada color se genera la escala completa (50-950).
   */
  marca: {
    /** Rojo (botones): botones, opcion activa del menu, franja del encabezado. */
    primario: '#E00F1B',
    /** Azul marino (encabezado): encabezado, menu lateral y splash. */
    secundario: '#0C234D',
  },

  /** Tema oscuro. */
  oscuro: {
    /** Azul oscuro (fondo principal): fondo de todas las pantallas. */
    fondo: '#0A111E',
    /** Azul grisaceo (formularios): inputs, tarjetas, paneles y modales. */
    formulario: '#111C30',
    /** Fondo rehundido: pistas de progreso, chips, botones redondos. */
    hundido: '#070C16',
    /** Blanco (texto): texto principal. */
    texto: '#E9EEF7',
    /** Gris azulado (texto secundario): subtitulos y etiquetas. */
    textoSecundario: '#9BAEC9',
    /** Texto tenue: notas al pie, placeholders e iconos de apoyo. */
    textoTenue: '#6B7E9C',
    /** Bordes y separadores. */
    borde: '#1D2B45',
    /** Bordes con mas contraste (botones `outline`, casillas). */
    bordeFuerte: '#2C3E5E',
  },

  /** Tema claro. Solo se ve con `modo: 'claro'` o `'sistema'`. */
  claro: {
    fondo: '#FFFFFF',
    /** Fondo suave de algunas pantallas (listado de categorias). */
    fondoSuave: '#F8FAFC',
    hundido: '#F1F5F9',
    texto: '#0F172A',
    textoSecundario: '#475569',
    textoTenue: '#94A3B8',
    borde: '#E2E8F0',
    bordeFuerte: '#CBD5E1',
  },

  /** Colores de estado (exito, advertencia, error). Iguales en ambos temas. */
  estados: {
    exito: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857' },
    advertencia: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' },
    error: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' },
  },
};

module.exports = paleta;
