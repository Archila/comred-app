// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Archivos `.geojson` de `geo/` importables desde el codigo (ver
// `metro-geojson-transformer.js`).
config.resolver.sourceExts.push('geojson');
config.transformer.babelTransformerPath = require.resolve('./metro-geojson-transformer');

// `input` apunta al CSS global donde viven las directivas de Tailwind.
module.exports = withNativeWind(config, { input: './src/global.css' });
