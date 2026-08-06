// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// `input` apunta al CSS global donde viven las directivas de Tailwind.
module.exports = withNativeWind(config, { input: './src/global.css' });
