import { create } from 'zustand';

/**
 * Estado de interfaz que no pertenece a ninguna pantalla en particular
 * (banners globales, filtros compartidos, modo offline...).
 */

export type ColorSchemePreference = 'system' | 'light' | 'dark';

interface UiState {
  colorScheme: ColorSchemePreference;
  setColorScheme: (value: ColorSchemePreference) => void;

  /** Mensaje efimero mostrado en la parte superior de la app. */
  banner: { type: 'info' | 'success' | 'error'; message: string } | null;
  showBanner: (type: 'info' | 'success' | 'error', message: string) => void;
  hideBanner: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  colorScheme: 'system',
  setColorScheme: (colorScheme) => set({ colorScheme }),

  banner: null,
  showBanner: (type, message) => set({ banner: { type, message } }),
  hideBanner: () => set({ banner: null }),
}));
