/**
 * Hooks for fetching and managing chart data.
 * Primary hook: useSatelliteGrowthData — fetches from /api/satellites/growth,
 * returns aggregated orbit-type time-series for the Recharts area chart.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  SatelliteGrowthData,
  GrowthApiResponse,
  ChartTimeRange,
  FilterOptions,
} from '../types';

interface FetchChartDataOptions {
  timeRange?: ChartTimeRange;
  filters?: FilterOptions;
}

/**
 * Build query-string params from the current filter state.
 * The backend accepts comma-separated lists: ?orbitTypes=leo,meo&operators=SpaceX
 */
function buildGrowthParams(
  options?: FetchChartDataOptions
): Record<string, string> {
  const params: Record<string, string> = {};
  if (options?.filters?.orbitTypes?.length) {
    params.orbitTypes = options.filters.orbitTypes.join(',');
  }
  if (options?.filters?.operators?.length) {
    params.operators = options.filters.operators.join(',');
  }
  if (options?.filters?.functions?.length) {
    params.functions = options.filters.functions.join(',');
  }
  return params;
}

/**
 * Filter the aggregated rows client-side by time range.
 * The backend returns all years; we trim here so the same cached response
 * can serve multiple time-range selections without extra network calls.
 */
function applyTimeRange(
  data: SatelliteGrowthData[],
  range?: ChartTimeRange
): SatelliteGrowthData[] {
  if (!range || range === ChartTimeRange.ALL_TIME || data.length === 0) {
    return data;
  }

  const now = new Date();
  const cutoff = new Date(now);

  switch (range) {
    case ChartTimeRange.ONE_YEAR:
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    case ChartTimeRange.THREE_MONTHS:
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case ChartTimeRange.ONE_MONTH:
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case ChartTimeRange.ONE_WEEK:
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case ChartTimeRange.ONE_DAY:
      cutoff.setDate(cutoff.getDate() - 1);
      break;
  }

  return data.filter((d) => new Date(d.timestamp) >= cutoff);
}

/**
 * Fetch satellite growth data from /api/satellites/growth.
 * Returns aggregated orbit-type time-series ready for Recharts.
 */
export function useSatelliteGrowthData(options?: FetchChartDataOptions) {
  const params = buildGrowthParams(options);

  return useQuery({
    queryKey: ['chart-satellite-growth', params],
    queryFn: async (): Promise<SatelliteGrowthData[]> => {
      const response = await apiClient.get<GrowthApiResponse>(
        '/satellites/growth',
        { params }
      );
      return response.data!.aggregated;
    },
    staleTime: 1000 * 60 * 60, // 1 hour — static data
    select: (data) => applyTimeRange(data, options?.timeRange),
  });
}

/**
 * Fetch the available filter options (orbit types, operators, functions)
 * from the growth endpoint. Cached separately so we only call once.
 */
export function useGrowthFilterOptions() {
  return useQuery({
    queryKey: ['chart-growth-filter-options'],
    queryFn: async () => {
      const response = await apiClient.get<GrowthApiResponse>(
        '/satellites/growth'
      );
      return response.data!.filterOptions;
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours — very stable
  });
}

/**
 * Stub: hook for launch statistics (Phase 2).
 */
export function useLaunchStatistics(options?: FetchChartDataOptions) {
  return useQuery({
    queryKey: ['chart-launch-stats', options],
    queryFn: async () => {
      // TODO: Fetch launch statistics
      return [];
    },
    staleTime: 1000 * 60 * 60,
  });
}

/**
 * Stub: hook for space weather chart data (Phase 2).
 */
export function useSpaceWeatherData(options?: FetchChartDataOptions) {
  return useQuery({
    queryKey: ['chart-space-weather', options],
    queryFn: async () => {
      // TODO: Fetch space weather data
      return [];
    },
    staleTime: 1000 * 60 * 15,
    refetchInterval: 1000 * 60 * 15,
  });
}
