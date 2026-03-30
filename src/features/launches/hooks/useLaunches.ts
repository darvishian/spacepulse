/**
 * React Query hooks for fetching and managing launch data.
 * Maps backend API responses to frontend Launch domain models.
 *
 * Uses raw axios (not apiClient) to avoid the double-unwrapping issue
 * where apiClient.get() returns response.data, making the type layer confusing.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Launch,
  LaunchApiRecord,
  LaunchProvider,
  LaunchStatus,
  Trajectory,
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Mapping layer: backend → frontend ───────────────────────────────────

function mapProvider(raw: string): LaunchProvider {
  const val = raw as LaunchProvider;
  if (Object.values(LaunchProvider).includes(val)) return val;
  return LaunchProvider.OTHER;
}

function mapStatus(raw: string): LaunchStatus {
  const val = raw as LaunchStatus;
  if (Object.values(LaunchStatus).includes(val)) return val;
  return LaunchStatus.UNKNOWN;
}

function mapApiRecordToLaunch(record: LaunchApiRecord): Launch {
  const firstPayload = record.payloads?.[0];

  return {
    id: record.id,
    name: record.name,
    provider: mapProvider(record.provider),
    scheduledTime: new Date(record.scheduledTime),
    launchWindow: record.launchWindow
      ? {
          start: new Date(record.launchWindow.start),
          end: new Date(record.launchWindow.end),
        }
      : undefined,
    launchSite: {
      name: record.location.name,
      latitude: record.location.latitude ?? 0,
      longitude: record.location.longitude ?? 0,
    },
    rocketType: record.vehicle.name,
    rocketFamily: record.vehicle.family,
    missionType: firstPayload?.type ?? 'Unknown',
    payload: firstPayload
      ? {
          name: firstPayload.name,
          mass: firstPayload.mass,
          destination: firstPayload.orbit,
        }
      : undefined,
    status: mapStatus(record.status),
    probability: record.probability,
    missionDescription: record.missionDescription,
    webcastUrl: record.webcastUrl,
  };
}

// ── Backend response wrapper ────────────────────────────────────────────
// Backend returns { status: 'success', data: [...], count, timestamp }
interface BackendResponse<T> {
  status: string;
  data: T;
  count?: number;
  timestamp?: string;
}

// ── Hooks ───────────────────────────────────────────────────────────────

interface FetchLaunchesOptions {
  limit?: number;
  offset?: number;
}

/**
 * Fetch upcoming launches from the backend.
 */
export function useLaunches(options?: FetchLaunchesOptions): ReturnType<typeof useQuery<Launch[]>> {
  return useQuery<Launch[]>({
    queryKey: ['launches', 'upcoming', options],
    queryFn: async (): Promise<Launch[]> => {
      try {
        const res = await axios.get<BackendResponse<LaunchApiRecord[]>>(
          `${API_BASE}/launches`,
          { timeout: 15000 },
        );
        const records = res.data?.data;
        if (!records || !Array.isArray(records)) return [];
        return records.map(mapApiRecordToLaunch);
      } catch (error) {
        console.error('[useLaunches] Failed to fetch upcoming launches:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,       // 5 minutes
    refetchInterval: 1000 * 60 * 5,  // Refresh every 5 minutes
  });
}

/**
 * Fetch recent launches (past N days).
 */
export function useRecentLaunches(days: number = 30): ReturnType<typeof useQuery<Launch[]>> {
  return useQuery<Launch[]>({
    queryKey: ['launches', 'recent', days],
    queryFn: async (): Promise<Launch[]> => {
      try {
        const res = await axios.get<BackendResponse<LaunchApiRecord[]>>(
          `${API_BASE}/launches/recent?days=${days}`,
          { timeout: 15000 },
        );
        const records = res.data?.data;
        if (!records || !Array.isArray(records)) return [];
        return records.map(mapApiRecordToLaunch);
      } catch (error) {
        console.error('[useLaunches] Failed to fetch recent launches:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 10,       // 10 minutes
    refetchInterval: 1000 * 60 * 10,
  });
}

/**
 * Fetch specific launch details by ID.
 */
export function useLaunchDetails(launchId: string): ReturnType<typeof useQuery<Launch | null>> {
  return useQuery<Launch | null>({
    queryKey: ['launch', launchId],
    queryFn: async (): Promise<Launch | null> => {
      try {
        const res = await axios.get<BackendResponse<LaunchApiRecord>>(
          `${API_BASE}/launches/${launchId}`,
          { timeout: 10000 },
        );
        if (!res.data?.data) return null;
        return mapApiRecordToLaunch(res.data.data);
      } catch (error) {
        console.error(`[useLaunches] Failed to fetch launch ${launchId}:`, error);
        return null;
      }
    },
    enabled: !!launchId,
  });
}

/**
 * Fetch launch trajectories.
 * (Trajectories are generated client-side as approximate arcs for now.)
 */
export function useLaunchTrajectories(launchId?: string): ReturnType<typeof useQuery<Trajectory[]>> {
  return useQuery<Trajectory[]>({
    queryKey: ['trajectories', launchId],
    queryFn: async (): Promise<Trajectory[]> => {
      // Trajectories are computed client-side in TrajectoryOverlay
      return [];
    },
    enabled: !!launchId,
  });
}
