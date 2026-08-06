import { create } from 'zustand';

import { STORAGE_KEYS } from '@/constants';
import { buildBrandTheme, secureStorage, type BrandTheme } from '@/lib';
import type { OrganizacionPublica } from '@/models';

/**
 * Marca de la organizacion (multi-tenant).
 *
 * El tema se deriva de `organizacion` y se guarda ya calculado: generar la
 * escala de 22 colores en cada render seria trabajo repetido, y este valor
 * cambia como mucho una vez por arranque.
 */
interface OrganizacionState {
  organizacion: OrganizacionPublica | null;
  /** Tema derivado. Nunca es null: sin organizacion son los colores de COMRED. */
  theme: BrandTheme;
  /** `false` hasta que se lee la cache del disco. Evita el parpadeo de marca. */
  isHydrated: boolean;

  /** Carga la ultima marca conocida desde el almacenamiento. */
  hydrate: () => Promise<void>;
  /** Guarda la configuracion publica recibida del API y recalcula el tema. */
  setOrganizacion: (organizacion: OrganizacionPublica) => Promise<void>;
  /** Vuelve a la marca por defecto (ej. si el build cambia de organizacion). */
  clear: () => Promise<void>;
}

const DEFAULT_THEME = buildBrandTheme();

export const useOrganizacionStore = create<OrganizacionState>((set) => ({
  organizacion: null,
  theme: DEFAULT_THEME,
  isHydrated: false,

  hydrate: async () => {
    const cached = await secureStorage.getObject<OrganizacionPublica>(STORAGE_KEYS.organizacion);

    set({
      organizacion: cached,
      theme: cached
        ? buildBrandTheme(cached.colorPrimario, cached.colorSecundario)
        : DEFAULT_THEME,
      isHydrated: true,
    });
  },

  setOrganizacion: async (organizacion) => {
    set({
      organizacion,
      theme: buildBrandTheme(organizacion.colorPrimario, organizacion.colorSecundario),
      isHydrated: true,
    });

    await secureStorage.setObject(STORAGE_KEYS.organizacion, organizacion);
  },

  clear: async () => {
    set({ organizacion: null, theme: DEFAULT_THEME, isHydrated: true });
    await secureStorage.removeItem(STORAGE_KEYS.organizacion);
  },
}));

/* -------------------------------------------------------------------------- */
/* Selectores                                                                  */
/* -------------------------------------------------------------------------- */

export const useOrganizacion = () => useOrganizacionStore((state) => state.organizacion);

/** Colores de marca en hex, para props que no aceptan `className`. */
export const useBrandColors = () => useOrganizacionStore((state) => state.theme.colors);

/** Variables CSS de la marca, para `vars()` de NativeWind. */
export const useBrandVars = () => useOrganizacionStore((state) => state.theme.cssVars);

/** Categorias publicas de la organizacion (arbol de reportes). */
export const useCategoriasPublicas = () =>
  useOrganizacionStore((state) => state.organizacion?.categorias ?? []);
