/**
 * Graphs and charts feature types
 */

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartSeries {
  id: string;
  name: string;
  data: ChartDataPoint[];
  color?: string;
  lineType?: 'linear' | 'stepAfter' | 'natural';
}

export enum ChartTimeRange {
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  THREE_MONTHS = '3m',
  ONE_YEAR = '1y',
  ALL_TIME = 'all',
}

export interface FilterOptions {
  orbitTypes?: string[];
  constellations?: string[];
  operators?: string[];
  functions?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

/** A single row in the satellite growth chart (aggregated by orbit type). */
export interface SatelliteGrowthData {
  timestamp: string;
  year: number;
  total: number;
  leo: number;
  meo: number;
  geo: number;
  heo: number;
}

/** Per-constellation growth entry returned by the backend. */
export interface ConstellationGrowthEntry {
  orbitType: string;
  operator: string;
  function: string;
  data: { year: number; totalSatellites: number; activeSatellites: number }[];
}

/** Shape of the /api/satellites/growth response body. */
export interface GrowthApiResponse {
  aggregated: SatelliteGrowthData[];
  constellations: Record<string, ConstellationGrowthEntry>;
  filterOptions: {
    orbitTypes: string[];
    operators: string[];
    functions: string[];
  };
}
