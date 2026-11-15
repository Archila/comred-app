import { create } from 'zustand';

/**
 * Filtros del mapa: que capas ha encendido o apagado el usuario. Es estado de
 * cliente, asi que va aqui y no en la cache de Query.
 *
 * Solo se guardan los cambios respecto a `visiblePorDefecto` de cada capa: una
 * capa nueva que llegue del API arranca como diga el panel, sin que haga falta
 * reiniciar nada. No se persiste: al volver a abrir la app, el mapa arranca
 * como lo configuro la municipalidad.
 */
interface MapaState {
  /** categoriaId -> visible, solo para las capas que el usuario toco. */
  cambios: Record<string, boolean>;
  alternar: (categoriaId: string, visibleAhora: boolean) => void;
  restablecer: () => void;
}

export const useMapaStore = create<MapaState>((set) => ({
  cambios: {},
  alternar: (categoriaId, visibleAhora) =>
    set((state) => ({ cambios: { ...state.cambios, [categoriaId]: !visibleAhora } })),
  restablecer: () => set({ cambios: {} }),
}));
