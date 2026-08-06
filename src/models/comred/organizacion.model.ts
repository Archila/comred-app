/**
 * Raiz del modelo multi-tenant: cada organizacion (municipalidad) genera una
 * app distinta con el mismo codigo. Los campos de marca alimentan el
 * theming dinamico al arrancar la app.
 */
export interface Organizacion {
  id: string;
  nombre: string;
  /** Identificador legible usado como perfil de build en EAS. Ej: 'MUNI-XELA'. */
  codigo: string;
  municipio: string;
  departamento: string;
  telefonoEmergencia?: string;
  logoUrl?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  androidPackage?: string;
  iosBundleId?: string;
  activo: boolean;
  created_at?: string;
}
