/**
 * Configuración de Babel.
 *
 * - `babel-preset-expo` con `jsxImportSource: 'nativewind'` es lo que permite
 *   que cualquier componente acepte la prop `className`.
 * - `nativewind/babel` transforma las clases de Tailwind a estilos nativos.
 *
 * Nota: los flags de `experiments` de app.json (typedRoutes, reactCompiler)
 * los sigue leyendo `babel-preset-expo`, no hay que declararlos aquí.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
