/**
 * Zustand store slice for livestream panel state.
 *
 * Tracks which launch (if any) the user wants to watch live.
 * The UpcomingLaunchesPanel sets this when the user clicks "Watch Live",
 * and the LiveStreamPanel reads it to know what to stream.
 */

import { create } from 'zustand';

export interface ActiveLaunchStream {
  id: string;
  name: string;
  scheduledTime: Date;
  webcastUrl?: string;
}

interface LivestreamStore {
  activeLaunch: ActiveLaunchStream | null;
  setActiveLaunch: (launch: ActiveLaunchStream | null) => void;
  clearStream: () => void;
}

export const useLivestreamStore = create<LivestreamStore>((set) => ({
  activeLaunch: null,
  setActiveLaunch: (launch) => set({ activeLaunch: launch }),
  clearStream: () => set({ activeLaunch: null }),
}));
