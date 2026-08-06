import type { Rol } from './rol.model';
import type { Sucursal } from './sucursal.model';

/**
 * Usuario autenticado. Espejo de la entidad `auth.usuario` del API,
 * sin el campo `clave` (el backend siempre lo vacia antes de responder).
 */
export interface Usuario {
  id: string;
  nombreCompleto: string;
  nombre1: string;
  nombre2?: string;
  nombre3?: string;
  apellido1: string;
  apellido2?: string;
  apellido3?: string;
  documento?: string;
  tipoDocumento?: string;
  userName: string;
  correo?: string;
  fotoUrl?: string;
  activo: boolean;

  /** Raiz del aislamiento multi-tenant: toda consulta filtra por esta columna. */
  organizacionId: string;

  rolId: string;
  rol?: Rol;

  puestoId?: string;
  puesto?: Puesto;

  sucursalId?: string;
  sucursal?: Sucursal;

  lastPasswordUpdate?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Puesto {
  id: string;
  nombre: string;
  activo: boolean;
}
