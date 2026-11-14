import {
  CalendarDays,
  FileText,
  HardHat,
  MapPin,
  TriangleAlert,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * Secciones del menu lateral, en el orden del Plan Maestro.
 *
 * "Informacion general" no esta aqui porque es la pantalla de inicio, y el
 * acceso de usuario (perfil / cerrar sesion) lo pinta el menu al final.
 *
 * Las que aun no estan construidas abren la pantalla "en construccion" de
 * `app/(app)/seccion/[slug].tsx`. Cuando una seccion tenga pantalla propia,
 * basta con crear su ruta y ponerla en `ruta`.
 */
export interface SeccionMenu {
  slug: string;
  etiqueta: string;
  icono: LucideIcon;
  /** Ruta propia de la seccion. Sin ella, la pantalla provisional. */
  ruta?: string;
}

export const SECCIONES_MENU: SeccionMenu[] = [
  { slug: 'reportes', etiqueta: 'Reportes de desastres', icono: TriangleAlert, ruta: '/reportes' },
  { slug: 'boletines', etiqueta: 'Boletines', icono: FileText, ruta: '/boletines' },
  { slug: 'jornadas', etiqueta: 'Jornadas', icono: CalendarDays, ruta: '/jornadas' },
  { slug: 'brigadas', etiqueta: 'Brigadas', icono: Users, ruta: '/brigadas' },
  { slug: 'mapa', etiqueta: 'Mapa general del municipio', icono: MapPin },
  { slug: 'proyectos', etiqueta: 'Proyectos actuales', icono: HardHat, ruta: '/proyectos' },
  { slug: 'cocodes', etiqueta: 'COCODES', icono: UsersRound },
];

export function buscarSeccion(slug?: string): SeccionMenu | undefined {
  return SECCIONES_MENU.find((seccion) => seccion.slug === slug);
}

/** Ruta raiz de una seccion del menu. */
export function rutaDeSeccion(seccion: SeccionMenu): string {
  return seccion.ruta ?? `/seccion/${seccion.slug}`;
}

/** Si `pathname` esta dentro de la seccion (su raiz o una pantalla interna). */
export function estaEnSeccion(pathname: string, seccion: SeccionMenu): boolean {
  const raiz = rutaDeSeccion(seccion);
  return pathname === raiz || pathname.startsWith(`${raiz}/`);
}
