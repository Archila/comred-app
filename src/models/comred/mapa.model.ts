import type { Feature, FeatureCollection, Geometry } from 'geojson';

/**
 * Mapa general del municipio. Espejo de lo que devuelve
 * `GET /comred/mapa/publico/*` (api-comred, `MapaPublicoService`).
 */

export type TipoGeometria = 'PUNTO' | 'LINEA' | 'AREA';

export type EstadoElementoGeografico =
  | 'HABILITADO'
  | 'CERRADO'
  | 'PENDIENTE'
  | 'ACTIVO'
  | 'CONTROLADO';

/**
 * Categoria de una zona de amenaza: 1 (Baja) a 6 (Muy alta). Las etiquetas
 * viven en `CATEGORIA_RIESGO` (`constants/mapa.ts`).
 */
export type CategoriaRiesgo = 1 | 2 | 3 | 4 | 5 | 6;

/** Una capa del mapa: "Albergues", "Zonas de inundacion". */
export interface CapaMapa {
  id: string;
  nombre: string;
  descripcion: string | null;
  /** `#RRGGBB` o `#RRGGBBAA`. */
  color: string;
  /** Nombre de icono de lucide. */
  icono: string | null;
  tipoGeometria: TipoGeometria | 'MIXTA';
  opacidadRelleno: number;
  /** Estado inicial del filtro. */
  visiblePorDefecto: boolean;
  orden: number;
}

/** Atributos de cada figura: lo justo para pintarla y tocarla. */
export interface PropiedadesFigura {
  id: string;
  categoriaId: string;
  nombre: string;
  estado: EstadoElementoGeografico | null;
  categoriaRiesgo: CategoriaRiesgo | null;
  tipoGeometria: TipoGeometria;
  color: string;
  /** Del relleno de un area. El API la calcula segun la categoria, o la toma de la capa. */
  opacidad: number;
}

export type FiguraMapa = Feature<Geometry, PropiedadesFigura>;

export interface CapasMapa {
  /** Fecha del ultimo cambio de cualquier cosa del mapa. */
  version: string | null;
  /** Contorno del municipio, o null si la organizacion no lo tiene. */
  limite: FeatureCollection | null;
  categorias: CapaMapa[];
  elementos: FeatureCollection<Geometry, PropiedadesFigura>;
}

export interface Bbox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** A donde lleva "Ver publicaciones". */
export interface VinculoElemento {
  tipo: 'INCIDENTE' | 'JORNADA' | 'PROYECTO';
  id: string;
  nombre: string;
  categoriaContenidoId: string;
}

/** La ficha que se abre al tocar una figura (Plan Maestro, 9.3). */
export interface ElementoGeograficoDetalle {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: EstadoElementoGeografico | null;
  categoriaRiesgo: CategoriaRiesgo | null;
  tipoGeometria: TipoGeometria;
  latitud: number | null;
  longitud: number | null;
  bbox: Bbox | null;
  comunidad: string | null;
  direccion: string | null;
  telefono: string | null;
  capacidad: number | null;
  fuente: string | null;
  /** 'AAAA-MM-DD'. */
  fechaFuente: string | null;
  fotoUrl: string | null;
  actualizado: string;
  categoria: { id: string; nombre: string; color: string; icono: string | null };
  vinculo: VinculoElemento | null;
}
