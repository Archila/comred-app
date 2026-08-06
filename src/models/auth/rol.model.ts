export interface Rol {
  id: string;
  nombre: string;
  invitado: boolean;
  activo: boolean;
  esAdmin: boolean;
  /** `null`/`undefined` = rol global de COMRED central. */
  organizacionId?: string;
}
