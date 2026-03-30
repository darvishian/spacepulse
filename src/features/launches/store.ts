/**
 * Launches Zustand store
 * Manages launch state, filtering, selection, and recent-launches toggle.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { LaunchStore, LaunchFilter, Launch, Trajectory } from './types';

export const useLaunchStore = create<LaunchStore>()(
  devtools(
    (set) => ({
      launches: [],
      recentLaunches: [],
      selectedLaunchId: null,
      showRecentLaunches: false,
      trajectories: new Map(),
      filters: {},
      showTrajectories: true,

      setLaunches: (launches: Launch[]): void => {
        set({ launches });
      },

      setRecentLaunches: (launches: Launch[]): void => {
        set({ recentLaunches: launches });
      },

      setSelectedLaunch: (id: string | null): void => {
        set({ selectedLaunchId: id });
      },

      setShowRecentLaunches: (show: boolean): void => {
        set({ showRecentLaunches: show });
      },

      setTrajectories: (trajectories: Trajectory[]): void => {
        const map = new Map(trajectories.map((t) => [t.id, t]));
        set({ trajectories: map });
      },

      setFilters: (filters: Partial<LaunchFilter>): void => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      setShowTrajectories: (show: boolean): void => {
        set({ showTrajectories: show });
      },
    }),
    { name: 'LaunchStore' }
  )
);

/**
 * Selector hook: returns launches filtered by current store filters.
 */
export function useFilteredLaunches(): Launch[] {
  const launches = useLaunchStore((state) => state.launches);
  const filters = useLaunchStore((state) => state.filters);

  if (!launches || launches.length === 0) return [];

  let filtered = launches;

  // Filter by provider
  if (filters.provider) {
    filtered = filtered.filter((l) => l.provider === filters.provider);
  }

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter((l) => l.status === filters.status);
  }

  // Filter by date range
  if (filters.dateRange) {
    const start = new Date(filters.dateRange.start).getTime();
    const end = new Date(filters.dateRange.end).getTime();
    filtered = filtered.filter((l) => {
      const t = l.scheduledTime.getTime();
      return t >= start && t <= end;
    });
  }

  // Search by name
  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.rocketType.toLowerCase().includes(q) ||
        l.launchSite.name.toLowerCase().includes(q)
    );
  }

  return filtered;
}
