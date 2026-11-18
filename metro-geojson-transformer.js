// Transformador de Babel para Metro que deja importar archivos `.geojson`
// como si fueran `.json` (Metro solo reconoce la extension `.json`).
//
// El contenido se envuelve en `module.exports = ...` y pasa al transformador
// de Expo de siempre; el resto de archivos no se toca.
const upstream = require('@expo/metro-config/babel-transformer');

module.exports = {
  ...upstream,
  transform(params) {
    if (params.filename.endsWith('.geojson')) {
      // Se valida aqui para que un archivo roto falle con un mensaje claro.
      JSON.parse(params.src);
      return upstream.transform({ ...params, src: `module.exports = ${params.src};` });
    }
    return upstream.transform(params);
  },
};
