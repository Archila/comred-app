export interface Sucursal {
  id: string;
  nombre: string;
  municipio: string;
  departamento: string;
  telefono?: string;
  direccion?: string;
  central: boolean;
  created_at?: string;
}
