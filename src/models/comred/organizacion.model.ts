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

/**
 * Respuesta del bootstrap publico `GET /comred/organizaciones/:id/publica`.
 *
 * Es lo unico que la app puede leer antes de tener sesion: marca + arbol de
 * categorias. No trae ningun dato sensible.
 */
export interface OrganizacionPublica {
  id: string;
  nombre: string;
  codigo: string;
  municipio: string;
  departamento: string;
  telefonoEmergencia?: string;
  logoUrl?: string;
  /** Color base de la marca. Ej: '#208AEF'. */
  colorPrimario?: string;
  /** Color de acento de la marca. */
  colorSecundario?: string;
  categorias: CategoriaPublica[];
}

/**
 * Respuesta de `GET /comred/organizaciones/:id/version`.
 *
 * Los numeros son el `versionCode` del binario (1.0.1 -> 10001). `null` =
 * la organizacion no tiene ese control configurado.
 */
export interface VersionOrganizacion {
  /** Por debajo de esta, la app obliga a actualizar y el API rechaza el login. */
  versionMinima: number | null;
  /** Ultimo APK publicado. Por debajo, la app solo avisa. */
  versionUltima: number | null;
  /** Donde descargar la version nueva. `null` si el API no tiene enlace. */
  urlActualizacion: string | null;
}

export interface CategoriaPublica {
  id: string;
  nombre: string;
  descripcion?: string;
  /** Nombre del icono a pintar (mapeado a lucide en el cliente). */
  icono?: string;
  orden: number;
  subcategorias: SubcategoriaPublica[];
}

export interface SubcategoriaPublica {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
}
