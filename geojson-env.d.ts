// Archivos `.geojson` importados con Metro (ver `metro-geojson-transformer.js`).
declare module '*.geojson' {
  const coleccion: import('geojson').FeatureCollection;
  export default coleccion;
}
