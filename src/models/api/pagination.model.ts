/**
 * Query params de paginacion. Espejo de `PaginationDto` del API.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  /** Texto libre de busqueda. */
  busqueda?: string;
  /** `true` para ignorar la paginacion y traer todo el catalogo. */
  todos?: boolean;
}

/** Resultado ya normalizado que consumen las pantallas de listado. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  /** Calculado en el cliente para los listados con scroll infinito. */
  hasNextPage: boolean;
}
