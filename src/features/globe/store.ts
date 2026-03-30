/**
 * Globe feature Zustand store
 * Manages layer visibility, clock/time state, viewer ref, and entity selection.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { GlobeStore, TimeScale, GlobeEntity } from './types';
import { DEFAULT_LAYERS } from './types';

export const useGlobeStore = create<GlobeStore>()(
  devtools(
    (set) => ({
      // ── Viewer ref (not serialized) ──────────────────────────
      viewerRef: null,
      setViewerRef: (viewer) => set({ viewerRef: viewer }),

      // ── Layers ───────────────────────────────────────────────
      layers: DEFAULT_LAYERS,

      setLayerVisible: (layerId: string, visible: boolean) =>
        set((state) => ({
          layers: state.layers.map((l) =>
            l.id === layerId ? { ...l, visible } : l
          ),
        })),

      setLayerOpacity: (layerId: string, opacity: number) =>
        set((state) => ({
          layers: state.layers.map((l) =>
            l.id === layerId ? { ...l, opacity } : l
          ),
        })),

      // ── Clock ────────────────────────────────────────────────
      clock: {
        currentTime: new Date(),
        isPlaying: true,
        timeScale: 'real-time' as TimeScale,
      },

      setIsPlaying: (playing: boolean) =>
        set((state) => ({
          clock: { ...state.clock, isPlaying: playing },
        })),

      setTimeScale: (scale: TimeScale) =>
        set((state) => ({
          clock: { ...state.clock, timeScale: scale },
        })),

      setCurrentTime: (time: Date) =>
        set((state) => ({
          clock: { ...state.clock, currentTime: time },
        })),

      skipTime: (direction: 'forward' | 'backward', hours: number) =>
        set((state) => {
          const offset = direction === 'forward' ? hours : -hours;
          const newTime = new Date(state.clock.currentTime);
          newTime.setHours(newTime.getHours() + offset);
          return { clock: { ...state.clock, currentTime: newTime } };
        }),

      // ── Entity selection ─────────────────────────────────────
      selectedGlobeEntity: null,
      setSelectedGlobeEntity: (entity: GlobeEntity | null) =>
        set({ selectedGlobeEntity: entity }),
    }),
    { name: 'GlobeStore' }
  )
);
