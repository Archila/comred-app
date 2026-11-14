/**
 * Componentes compartidos.
 *
 *   ui/       -> sistema de diseno (Button, Input, Card, Text, Icon)
 *   layout/   -> andamiaje de pantallas (Screen)
 *   feedback/ -> estados de carga, error y vacio
 *   common/   -> utilidades varias
 *   contenido/ -> tarjetas y visor de publicaciones, compartidos por las
 *                 secciones (reportes, boletines...)
 *
 * Los componentes de una sola pantalla NO van aqui: viven junto a su ruta.
 */
export * from './common';
export * from './contenido';
export * from './feedback';
export * from './layout';
export * from './ui';
