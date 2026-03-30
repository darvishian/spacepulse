/**
 * Satellite Zustand store — manages satellite positions, constellations,
 * selection state, and filter criteria.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  SatelliteStore,
  SatelliteFilter,
  SatellitePosition,
  Constellation,
  OrbitType,
} from './types';

/**
 * Central satellite state store.
 * SatelliteLayer writes positions here; other components (DetailPanel, Sidebar) read.
 */
export const useSatelliteStore = create<SatelliteStore>()(
  devtools(
    (set) => ({
      satellites: new Map(),
      constellations: [],
      selectedSatelliteId: null,
      filters: {},
      visibilityOverlay: false,

      setSatellites: (satellites: SatellitePosition[]): void => {
        const map = new Map(satellites.map((s) => [s.id, s]));
        set({ satellites: map });
      },

      setConstellations: (constellations: Constellation[]): void => {
        set({ constellations });
      },

      setSelectedSatellite: (id: string | null): void => {
        set({ selectedSatelliteId: id });
      },

      setFilters: (filters: Partial<SatelliteFilter>): void => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      setVisibilityOverlay: (visible: boolean): void => {
        set({ visibilityOverlay: visible });
      },
    }),
    { name: 'SatelliteStore' },
  ),
);

/**
 * Derived selector: returns satellites filtered by the active filter criteria.
 *
 * Filters:
 * - constellationId: match by satellite name heuristic
 * - orbitType: match by altitude range (LEO < 2000km, MEO < 35786km, GEO ~35786km)
 * - minAltitude / maxAltitude: altitude range
 * - searchQuery: partial name match
 */
export function useFilteredSatellites(): SatellitePosition[] {
  const satellites = useSatelliteStore((state) => state.satellites);
  const filters = useSatelliteStore((state) => state.filters);

  const all = Array.from(satellites.values());

  if (Object.keys(filters).length === 0) {
    return all;
  }

  return all.filter((sat) => {
    // Constellation filter
    if (filters.constellationId) {
      const constellation = guessConstellationFromName(sat.name);
      if (constellation.toUpperCase() !== filters.constellationId.toUpperCase()) {
        return false;
      }
    }

    // Orbit type filter
    if (filters.orbitType) {
      const satOrbit = classifyOrbitByAltitude(sat.altitude);
      if (satOrbit !== filters.orbitType) {
        return false;
      }
    }

    // Altitude range filter
    if (filters.minAltitude !== undefined && sat.altitude < filters.minAltitude) {
      return false;
    }
    if (filters.maxAltitude !== undefined && sat.altitude > filters.maxAltitude) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (!sat.name.toLowerCase().includes(q) && !sat.id.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

// ── Helpers ───────────────────────────────────────────────────────

/** Heuristic constellation detection from satellite name. */
function guessConstellationFromName(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('STARLINK')) return 'STARLINK';
  if (upper.includes('ONEWEB')) return 'ONEWEB';
  if (upper.includes('IRIDIUM')) return 'IRIDIUM';
  if (upper.includes('GPS') || upper.includes('NAVSTAR')) return 'GPS';
  if (upper.includes('GLONASS') || upper.includes('COSMOS')) return 'GLONASS';
  if (upper.includes('GALILEO') || upper.includes('GSAT')) return 'GALILEO';
  if (upper.includes('BEIDOU')) return 'BEIDOU';
  if (upper.includes('GLOBALSTAR')) return 'GLOBALSTAR';
  if (upper.includes('FLOCK') || upper.includes('DOVE') || upper.includes('SKYSAT')) return 'PLANET';
  if (upper.includes('SPIRE') || upper.includes('LEMUR')) return 'SPIRE';
  if (upper.includes('TELESAT')) return 'TELESAT';
  return 'OTHER';
}

/** Classify orbit type by altitude (km). */
function classifyOrbitByAltitude(altitudeKm: number): OrbitType {
  if (altitudeKm < 2000) return OrbitType.LEO;
  if (altitudeKm < 35786) return OrbitType.MEO;
  if (altitudeKm < 40000) return OrbitType.GEO;
  return OrbitType.HEO;
}
