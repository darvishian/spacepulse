/**
 * React Query hooks for fetching satellite TLE and constellation data
 * from the SpacePulse backend (/api/satellites/*).
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { TleRecord, Constellation } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface FetchSatelliteDataOptions {
  constellationId?: string;
  limit?: number;
  includeInactive?: boolean;
}

/** Backend response wrapper. */
interface BackendResponse<T> {
  status: string;
  data: T;
  count?: number;
  timestamp: string;
}

/**
 * Fetch TLE records from the backend.
 * Optionally filtered by constellation.
 * Returns frontend TleRecord[] (mapped from backend format).
 */
export function useSatelliteData(options?: FetchSatelliteDataOptions) {
  return useQuery({
    queryKey: ['satellites', options],
    queryFn: async (): Promise<TleRecord[]> => {
      const params: Record<string, string> = {};
      if (options?.constellationId) {
        params.constellation = options.constellationId;
      }

      const response = await axios.get<BackendResponse<BackendTleRecord[]>>(
        `${API_BASE}/satellites/tle`,
        { params, timeout: 30000 },
      );

      const backendRecords = response.data.data || [];

      // Map backend TleRecord → frontend TleRecord
      return backendRecords.map(mapBackendTle);
    },
    staleTime: 1000 * 60 * 30, // 30 minutes (TLEs don't change fast)
    refetchInterval: 1000 * 60 * 60, // Refresh every hour
    retry: 2,
  });
}

/**
 * Fetch details for a single satellite by ID.
 */
export function useSatelliteDetails(satelliteId: string) {
  return useQuery({
    queryKey: ['satellite', satelliteId],
    queryFn: async () => {
      const response = await axios.get<BackendResponse<{ satelliteId: string; latitude: number; longitude: number; altitude: number; velocity: number }>>(
        `${API_BASE}/satellites/${satelliteId}/position`,
        { timeout: 10000 },
      );
      return response.data.data;
    },
    enabled: !!satelliteId,
    staleTime: 1000 * 60, // 1 minute for positions
  });
}

/**
 * Fetch all constellation metadata with satellite counts.
 */
export function useConstellationData() {
  return useQuery({
    queryKey: ['constellations'],
    queryFn: async (): Promise<Constellation[]> => {
      const response = await axios.get<BackendResponse<BackendConstellation[]>>(
        `${API_BASE}/satellites/constellations`,
        { timeout: 15000 },
      );

      const data = response.data.data || [];

      return data.map((c): Constellation => ({
        id: c.id,
        name: c.name,
        operator: c.operator,
        orbitType: mapOrbitType(c.orbitType),
        satelliteCount: c.satelliteCount,
        description: c.purpose,
        website: c.website,
      }));
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    retry: 2,
  });
}

// ── Internal types & mappers ──────────────────────────────────────

/** Backend TLE format (differs from frontend). */
interface BackendTleRecord {
  satelliteId: string;
  satelliteName: string;
  line1: string;
  line2: string;
  epochYear: number;
  epochDay: number;
  epochTime: string; // ISO date string from JSON
  meanMotion: number;
  inclination: number;
  eccentricity: number;
  argumentOfPerigee: number;
  meanAnomaly: number;
  ascendingNode: number;
}

interface BackendConstellation {
  id: string;
  name: string;
  operator: string;
  purpose: string;
  orbitType: string;
  satelliteCount: number;
  website: string;
}

/** Map backend TleRecord → frontend TleRecord. */
function mapBackendTle(b: BackendTleRecord): TleRecord {
  return {
    id: b.satelliteId,
    satelliteNumber: parseInt(b.satelliteId, 10) || 0,
    name: b.satelliteName,
    line1: b.line1,
    line2: b.line2,
    epochYear: b.epochYear,
    epochDay: b.epochDay,
    lastUpdated: b.epochTime,
  };
}

/** Map backend orbit type string to frontend OrbitType enum. */
function mapOrbitType(backend: string): import('../types').OrbitType {
  const { OrbitType } = require('../types');
  const map: Record<string, unknown> = {
    leo: OrbitType.LEO,
    meo: OrbitType.MEO,
    geo: OrbitType.GEO,
  };
  return (map[backend.toLowerCase()] as import('../types').OrbitType) || OrbitType.LEO;
}
