/**
 * Root Zustand store combining all feature slices
 * TODO: Implement store composition with plugin slices
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Import feature store slices
// TODO: Import from feature modules once they're created
// import { satelliteSlice } from '@/features/satellites/store';
// import { launchesSlice } from '@/features/launches/store';
// import { weatherSlice } from '@/features/weather/store';
// import { investmentsSlice } from '@/features/investments/store';

// TODO: Define root store type combining all slices
export interface RootStore {
  // TODO: Add satellite state
  // TODO: Add launches state
  // TODO: Add weather state
  // TODO: Add investments state

  // Global UI state
  sidebarOpen: boolean;
  detailPanelOpen: boolean;
  selectedEntity: string | null;
  debugMode: boolean;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  setDetailPanelOpen: (open: boolean) => void;
  setSelectedEntity: (id: string | null) => void;
  toggleDebugMode: () => void;
}

/**
 * TODO: Create root store with all slices
 * TODO: Configure persistence for UI state
 * TODO: Add devtools middleware for debugging
 */
export const useStore = create<RootStore>()(
  devtools(
    persist(
      (set) => ({
        // Global UI state initialization
        sidebarOpen: true,
        detailPanelOpen: false,
        selectedEntity: null,
        debugMode: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',

        // Global UI actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),
        setSelectedEntity: (id) => set({ selectedEntity: id }),
        toggleDebugMode: () =>
          set((state) => ({ debugMode: !state.debugMode })),
      }),
      {
        name: 'spacepulse-store',
        // TODO: Configure which slices persist
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          debugMode: state.debugMode,
        }),
      }
    ),
    { name: 'RootStore' }
  )
);

/**
 * TODO: Hook for selecting and memoizing store state
 */
export function useStoreSelector<T>(
  selector: (state: RootStore) => T
): T {
  return useStore(selector);
}
