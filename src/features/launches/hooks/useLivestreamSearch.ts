/**
 * React Query hook for searching YouTube live streams for a launch.
 * Only enables the query when the launch is within 4 hours of its
 * scheduled time. Returns the stream with the highest concurrent
 * viewer count.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { LiveStreamResult } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

interface BackendResponse<T> {
  status: string;
  data: T | null;
  source?: string;
  message?: string;
}

interface UseLivestreamSearchOptions {
  /** Launch name used as the YouTube search query */
  launchName: string;
  /** Scheduled launch time */
  scheduledTime: Date;
  /** Existing webcast URL from the launch data (optional) */
  webcastUrl?: string;
  /** Override: force-enable regardless of time window (for testing) */
  forceEnable?: boolean;
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/**
 * Returns whether the launch is within the 4-hour pre-launch window
 * (or has already launched but is less than 4 hours past).
 */
function isWithinStreamWindow(scheduledTime: Date): boolean {
  const diff = scheduledTime.getTime() - Date.now();
  // Show livestream from 4h before launch to 4h after launch
  return diff < FOUR_HOURS_MS && diff > -FOUR_HOURS_MS;
}

export function useLivestreamSearch({
  launchName,
  scheduledTime,
  webcastUrl,
  forceEnable = false,
}: UseLivestreamSearchOptions): {
  data: LiveStreamResult | null | undefined;
  isLoading: boolean;
  isWithinWindow: boolean;
} {
  const withinWindow = isWithinStreamWindow(scheduledTime);
  const enabled = forceEnable || withinWindow;

  const query = useQuery<LiveStreamResult | null>({
    queryKey: ['livestream', launchName],
    queryFn: async (): Promise<LiveStreamResult | null> => {
      try {
        const params: Record<string, string> = { query: launchName };
        if (webcastUrl) params.webcastUrl = webcastUrl;

        const res = await axios.get<BackendResponse<LiveStreamResult>>(
          `${API_BASE}/launches/livestream`,
          { params, timeout: 10000 },
        );

        return res.data?.data ?? null;
      } catch (error) {
        console.error('[useLivestreamSearch] Failed:', error);
        return null;
      }
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 min — matches backend cache TTL
    refetchInterval: enabled ? 1000 * 60 * 5 : false,
    retry: 1,
  });

  return {
    data: query.data,
    isLoading: query.isLoading && enabled,
    isWithinWindow: withinWindow,
  };
}

export { isWithinStreamWindow };
