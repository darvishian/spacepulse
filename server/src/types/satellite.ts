/**
 * Types for satellite and TLE data structures
 */

export enum OrbitType {
  LEO = 'leo',
  MEO = 'meo',
  GEO = 'geo',
  POLAR = 'polar',
  UNKNOWN = 'unknown',
}

export interface TleRecord {
  satelliteId: string;
  satelliteName: string;
  line1: string;
  line2: string;
  epochYear: number;
  epochDay: number;
  epochTime: Date;
  meanMotion: number;
  inclination: number;
  eccentricity: number;
  argumentOfPerigee: number;
  meanAnomaly: number;
  ascendingNode: number;
}

export interface SatellitePosition {
  satelliteId: string;
  satelliteName: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude: number; // in km
  velocity: number; // in km/s
}

export interface SatelliteTrack {
  satelliteId: string;
  satelliteName: string;
  positions: SatellitePosition[];
  generatedAt: Date;
}

export interface Constellation {
  id: string;
  name: string;
  operatorName: string;
  purpose: string;
  orbitType: OrbitType;
  satellites: {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'planned';
  }[];
  totalSatellites: number;
  activeSatellites: number;
  launchDate?: Date;
  website?: string;
}

export interface ConstellationGrowth {
  constellationName: string;
  year: number;
  totalSatellites: number;
  activeSatellites: number;
}
