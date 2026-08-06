/**
 * Capa `actions`: funciones que hablan con el API.
 *
 * Regla de dependencias (de arriba hacia abajo, nunca al reves):
 *   app/ (pantallas)  ->  hooks/  ->  actions/  ->  api/  ->  models/
 *
 * Un action no importa React, ni el store, ni componentes.
 */
export * from './auth';
export * from './comred';
export * from './usuarios';
