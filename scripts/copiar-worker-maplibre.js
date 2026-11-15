/**
 * Copia el worker de maplibre-gl a `public/`, para el mapa en web.
 *
 * maplibre-gl 6 busca su worker junto a su propio archivo (`import.meta.url`).
 * Metro lo empaqueta todo en un bundle y esa ruta deja de existir, así que la
 * app le indica la URL a mano (`setWorkerUrl('/maplibre-gl-worker.mjs')` en
 * `src/components/mapa/mapa-vista.web.tsx`) y Expo sirve `public/` tal cual
 * en la raíz del sitio.
 *
 * Corre en `postinstall`: así el worker es siempre el de la versión instalada.
 * Un worker de otra versión que la librería no funciona. El archivo copiado
 * está en `.gitignore`: se genera, no se versiona.
 */
const fs = require('node:fs');
const path = require('node:path');

// npm ejecuta `postinstall` desde la raíz del paquete.
const raiz = process.cwd();
const origen = path.join(raiz, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const destino = path.join(raiz, 'public', 'maplibre-gl-worker.mjs');

if (!fs.existsSync(origen)) {
  // Sin maplibre-gl instalado (instalación parcial): no hay nada que copiar.
  console.warn('[copiar-worker-maplibre] No se encontró maplibre-gl; se omite.');
  process.exit(0);
}

fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.copyFileSync(origen, destino);
console.log('[copiar-worker-maplibre] Worker copiado a public/maplibre-gl-worker.mjs');
