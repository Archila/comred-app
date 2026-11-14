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
 * Por ahora todas abren la pantalla "en construccion" de
 * `app/(app)/seccion/[slug].tsx`. Cuando una seccion tenga pantalla propia,
 * basta con crear su ruta y apuntar el menu a ella.
 */
export interface SeccionMenu {
  slug: string;
  etiqueta: string;
  icono: LucideIcon;
}

export const SECCIONES_MENU: SeccionMenu[] = [
  { slug: 'reportes', etiqueta: 'Reportes de desastres', icono: TriangleAlert },
  { slug: 'boletines', etiqueta: 'Boletines', icono: FileText },
  { slug: 'jornadas', etiqueta: 'Jornadas', icono: CalendarDays },
  { slug: 'brigadas', etiqueta: 'Brigadas', icono: Users },
  { slug: 'mapa', etiqueta: 'Mapa general del municipio', icono: MapPin },
  { slug: 'proyectos', etiqueta: 'Proyectos actuales', icono: HardHat },
  { slug: 'cocodes', etiqueta: 'COCODES', icono: UsersRound },
];

export function buscarSeccion(slug?: string): SeccionMenu | undefined {
  return SECCIONES_MENU.find((seccion) => seccion.slug === slug);
}
