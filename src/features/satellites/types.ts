/**
 * Satellite feature types and interfaces
 */

export enum OrbitType {
  LEO = 'LEO', // Low Earth Orbit (0-2000 km)
  MEO = 'MEO', // Medium Earth Orbit (2000-35786 km)
  GEO = 'GEO', // Geostationary Orbit (35786 km)
  HEO = 'HEO', // High Earth Orbit (>35786 km)
}

export interface TleRecord {
  id: string;
  satelliteNumber: number;
  name: string;
  line1: string;
  line2: string;
  epochYear: number;
  epochDay: number;
  lastUpdated: string;
}

export interface SatellitePosition {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number; // in kilometers
  velocity?: number; // km/s
  heading?: number; // degrees
  footprint?: number; // ground footprint radius in km
}

export interface Constellation {
  id: string;
  name: string;
  operator: string;
  orbitType: OrbitType;
  satelliteCount: number;
  description?: string;
  website?: string;
  properties?: Record<string, unknown>;
}

export interface SatelliteFilter {
  constellationId?: string;
  orbitType?: OrbitType;
  operatorId?: string;
  minAltitude?: number;
  maxAltitude?: number;
  searchQuery?: string;
}

export interface SatelliteStore {
  satellites: Map<string, SatellitePosition>;
  constellations: Constellation[];
  selectedSatelliteId: string | null;
  filters: SatelliteFilter;
  visibilityOverlay: boolean;

  setSatellites: (satellites: SatellitePosition[]) => void;
  setConstellations: (constellations: Constellation[]) => void;
  setSelectedSatellite: (id: string | null) => void;
  setFilters: (filters: Partial<SatelliteFilter>) => void;
  setVisibilityOverlay: (visible: boolean) => void;
}
