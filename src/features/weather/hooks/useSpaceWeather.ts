/**
 * React Query hooks for fetching and managing space weather data.
 * Connects to backend /api/weather/* endpoints for real NOAA SWPC data.
 *
 * NOTE: apiClient.get() already returns the parsed JSON body (response.data
 * from axios), so we access fields directly — no extra `.data` unwrap.
 * The backend response shape is { status, data, timestamp }.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SolarWind, KpIndex, XrayFlux, MagneticStorm } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// Use raw axios instead of apiClient to avoid double-wrapping.
// apiClient wraps responses in ApiResponse<T> which mismatches the
// backend's { status, data, timestamp } shape.

interface BackendResponse<T> {
  status: string;
  data: T;
  timestamp: string;
}

/**
 * Fetch space weather data from backend (which proxies NOAA SWPC).
 * Returns solar wind, Kp index, and X-ray flux.
 */
export function useSpaceWeather(): {
  solarWind: SolarWind | null;
  kpIndex: KpIndex | null;
  xrayFlux: XrayFlux | null;
  isLoading: boolean;
  error: Error | null;
} {
  const solarWindQuery = useQuery({
    queryKey: ['space-weather-solar-wind'],
    queryFn: async (): Promise<SolarWind | null> => {
      try {
        const res = await axios.get<BackendResponse<{
          timestamp: string;
          speed: number;
          density: number;
          temperature: number;
          pressure: number;
          source: string;
        }>>(`${API_BASE}/weather/solar-wind`, { timeout: 10000 });
        const d = res.data.data;
        if (!d) return null;
        return {
          timestamp: String(d.timestamp),
          speed: d.speed,
          density: d.density,
          temperature: d.temperature,
          pressure: d.pressure,
        };
      } catch (err) {
        console.error('[useSpaceWeather] Solar wind fetch failed:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 2,   // 2 min — matches backend cache TTL
    refetchInterval: 1000 * 60 * 2,
  });

  const kpIndexQuery = useQuery({
    queryKey: ['space-weather-kp-index'],
    queryFn: async (): Promise<KpIndex | null> => {
      try {
        const res = await axios.get<BackendResponse<{
          kpIndex: number;
          estimatedKp: number;
          timestamp: string;
          source: string;
        }>>(`${API_BASE}/weather/kp-index`, { timeout: 10000 });
        const d = res.data.data;
        if (!d) return null;
        const kp = d.kpIndex;
        return {
          timestamp: String(d.timestamp),
          value: kp,
          label: getKpLabel(kp),
          severity: getKpSeverity(kp),
        };
      } catch (err) {
        console.error('[useSpaceWeather] Kp index fetch failed:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 3,   // 3 min
    refetchInterval: 1000 * 60 * 3,
  });

  const xrayFluxQuery = useQuery({
    queryKey: ['space-weather-xray'],
    queryFn: async (): Promise<XrayFlux | null> => {
      try {
        const res = await axios.get<BackendResponse<{
          shortWave: number;
          longWave: number;
          classLabel: string;
          timestamp: string;
          source: string;
        }>>(`${API_BASE}/weather/xray`, { timeout: 10000 });
        const d = res.data.data;
        if (!d) return null;
        return {
          timestamp: String(d.timestamp),
          flux_short: d.shortWave,
          flux_long: d.longWave,
          classification: d.classLabel || 'A',
        };
      } catch (err) {
        console.error('[useSpaceWeather] X-ray flux fetch failed:', err);
        return null;
      }
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });

  return {
    solarWind: solarWindQuery.data ?? null,
    kpIndex: kpIndexQuery.data ?? null,
    xrayFlux: xrayFluxQuery.data ?? null,
    isLoading:
      solarWindQuery.isLoading ||
      kpIndexQuery.isLoading ||
      xrayFluxQuery.isLoading,
    error:
      (solarWindQuery.error as Error) ||
      (kpIndexQuery.error as Error) ||
      (xrayFluxQuery.error as Error) ||
      null,
  };
}

/**
 * Fetch space weather alerts from backend.
 */
export function useWeatherAlerts(): {
  alerts: Array<{ id: string; type: string; severity: string; description: string; timestamp: string }>;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['space-weather-alerts'],
    queryFn: async () => {
      try {
        const res = await axios.get<BackendResponse<Array<{
          id: string;
          type: string;
          severity: string;
          description: string;
          timestamp: string;
        }>>>(`${API_BASE}/weather/alerts`, { timeout: 10000 });
        return res.data.data ?? [];
      } catch (err) {
        console.error('[useSpaceWeather] Alerts fetch failed:', err);
        return [];
      }
    },
    staleTime: 1000 * 60,        // 1 min
    refetchInterval: 1000 * 60,
  });

  return {
    alerts: query.data ?? [],
    isLoading: query.isLoading,
  };
}

/**
 * Fetch active magnetic storms (derived from Kp >= 5).
 */
export function useMagneticStorms() {
  return useQuery({
    queryKey: ['space-weather-magnetic-storms'],
    queryFn: async (): Promise<MagneticStorm[]> => {
      try {
        const res = await axios.get<BackendResponse<Array<{
          id: string;
          type: string;
          severity: string;
          timestamp: string;
          description: string;
        }>>>(`${API_BASE}/weather/alerts`, { timeout: 10000 });
        const alerts = res.data.data ?? [];

        return alerts
          .filter((a) => a.type === 'geomagnetic_storm')
          .map((a) => ({
            id: a.id,
            timestamp: a.timestamp,
            kpIndex: severityToKp(a.severity),
            dstIndex: 0, // Not available from NOAA alerts endpoint
            impact: a.description,
          }));
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 15,
  });
}

// ── Helper functions ────────────────────────────────────────────────────

function getKpLabel(kp: number): string {
  if (kp <= 1) return 'Quiet';
  if (kp <= 3) return 'Unsettled';
  if (kp <= 4) return 'Active';
  if (kp <= 5) return 'Minor Storm';
  if (kp <= 6) return 'Moderate Storm';
  if (kp <= 7) return 'Strong Storm';
  if (kp <= 8) return 'Severe Storm';
  return 'Extreme Storm';
}

function getKpSeverity(kp: number): 'low' | 'moderate' | 'high' | 'severe' {
  if (kp <= 3) return 'low';
  if (kp <= 5) return 'moderate';
  if (kp <= 7) return 'high';
  return 'severe';
}

function severityToKp(severity: string): number {
  switch (severity) {
    case 'extreme': return 9;
    case 'major': return 8;
    case 'moderate': return 6;
    case 'minor':
    default: return 5;
  }
}
