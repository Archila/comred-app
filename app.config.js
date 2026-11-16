/**
 * Configuracion dinamica de Expo. Recibe lo que hay en `app.json` y solo le
 * anade lo que se DERIVA de otro campo, para no tener que mantenerlo a mano.
 *
 * VERSION DE LA APP
 * -----------------
 * La unica fuente es `expo.version` de `app.json` ("1.0.1"). De ahi sale el
 * numero de compilacion (10001), que es lo que:
 *   - Android usa como `versionCode` (y Play Store exige que suba en cada APK),
 *   - la app lee del binario y envia al API (`src/lib/version-app.ts`),
 *   - el API compara con `versionMinima` / `versionUltima` de la organizacion.
 *
 * No va en el `.env` a proposito: el `.env` no se versiona y cambia por
 * maquina y por municipalidad, y la version tiene que ser la misma para todos
 * los APK compilados desde un mismo commit.
 *
 * Para publicar una version: subir `version` en `app.json`, compilar, y
 * recien entonces actualizar `versionUltima` (y `versionMinima` si la
 * anterior deja de servir) en la organizacion.
 */

/** "1.0.1" -> 10001. Dos digitos para minor y patch: 1.99.99 es el tope. */
function versionACodigo(version) {
  const partes = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '');
  if (!partes) {
    throw new Error(
      `[app.config] "version" debe tener la forma MAYOR.MENOR.PARCHE (ej. 1.0.1). Recibido: "${version}".`,
    );
  }

  const [mayor, menor, parche] = partes.slice(1).map(Number);
  if (menor > 99 || parche > 99) {
    throw new Error(
      `[app.config] MENOR y PARCHE no pueden pasar de 99 (recibido "${version}"): el codigo dejaria de ser creciente.`,
    );
  }

  return mayor * 10000 + menor * 100 + parche;
}

/**
 * COLORES
 * -------
 * Salen de `src/config/paleta.js`: el tema nativo (`userInterfaceStyle`, que
 * reemplaza al de `app.json`) y el fondo del splash. Solo se aplican al
 * recompilar (`npx expo prebuild` + `npx expo run:android`).
 */
const paleta = require('./src/config/paleta');

const ESTILO_INTERFAZ = { oscuro: 'dark', claro: 'light', sistema: 'automatic' };

/** Pone el azul de la marca como fondo del splash. */
function conFondoDeSplash(plugins = []) {
  return plugins.map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
      ? [plugin[0], { ...plugin[1], backgroundColor: paleta.marca.secundario }]
      : plugin,
  );
}

module.exports = ({ config }) => {
  const codigo = versionACodigo(config.version);

  return {
    ...config,
    userInterfaceStyle: ESTILO_INTERFAZ[paleta.modo] ?? config.userInterfaceStyle,
    android: { ...config.android, versionCode: codigo },
    ios: { ...config.ios, buildNumber: String(codigo) },
    plugins: conFondoDeSplash(config.plugins),
  };
};
