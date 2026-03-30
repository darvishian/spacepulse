/**
 * Space weather Zustand store
 * TODO: Implement weather state management
 */

import { create } from 'zustand';
import { SpaceWeatherStore, SolarWind, KpIndex, XrayFlux, MagneticStorm } from './types';

/**
 * TODO: Create weather store with real-time data updates
 * TODO: Handle WebSocket subscriptions for live data
 */
export const useWeatherStore = create<SpaceWeatherStore>((set) => ({
  solarWind: null,
  kpIndex: null,
  xrayFlux: null,
  activeStorms: [],
  alerts: [],

  setSolarWind: (wind: SolarWind) => {
    set({ solarWind: wind });
  },

  setKpIndex: (index: KpIndex) => {
    set({ kpIndex: index });
  },

  setXrayFlux: (flux: XrayFlux) => {
    set({ xrayFlux: flux });
  },

  setActiveStorms: (storms: MagneticStorm[]) => {
    set({ activeStorms: storms });
  },

  addAlert: (alert) => {
    set((state) => ({
      alerts: [...state.alerts, alert],
    }));
  },

  removeAlert: (id: string) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    }));
  },
}));
