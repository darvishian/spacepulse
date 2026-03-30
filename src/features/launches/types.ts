/**
 * Launches feature types and interfaces.
 *
 * Backend is source of truth. Frontend types mirror backend enums
 * and the mapping layer in useLaunches.ts transforms the API response
 * into these types.
 */

// ── Enums (match backend exactly) ───────────────────────────────────────

export enum LaunchStatus {
  GO = 'go',
  NO_GO = 'no_go',
  HOLD = 'hold',
  TBD = 'tbd',
  IN_FLIGHT = 'in_flight',
  SUCCESS = 'success',
  FAILURE = 'failure',
  UNKNOWN = 'unknown',
}

export enum LaunchProvider {
  SPACEX = 'spacex',
  ROCKET_LAB = 'rocket_lab',
  ULA = 'ula',
  BLUE_ORIGIN = 'blue_origin',
  ARIANESPACE = 'arianespace',
  ROSCOSMOS = 'roscosmos',
  ISRO = 'isro',
  CASC = 'casc',
  JAXA = 'jaxa',
  OTHER = 'other',
}

// ── Backend API response shape ──────────────────────────────────────────
// (raw JSON from /api/launches — dates arrive as ISO strings)

export interface LaunchApiPayload {
  id: string;
  name: string;
  type: string;
  mass?: number;
  orbit?: string;
}

export interface LaunchApiRecord {
  id: string;
  name: string;
  provider: string;
  scheduledTime: string;          // ISO 8601
  launchWindow?: {
    start: string;
    end: string;
  };
  location: {
    id: string;
    name: string;
    country: string;
    latitude?: number;
    longitude?: number;
  };
  vehicle: {
    id: string;
    name: string;
    type: string;
    family?: string;
  };
  payloads: LaunchApiPayload[];
  status: string;
  probability?: number;
  missionDescription?: string;
  webcastUrl?: string;
  lastUpdated: string;            // ISO 8601
}

// ── Frontend domain models ──────────────────────────────────────────────

export interface Launch {
  id: string;
  name: string;
  provider: LaunchProvider;
  scheduledTime: Date;
  launchWindow?: {
    start: Date;
    end: Date;
  };
  launchSite: {
    name: string;
    latitude: number;
    longitude: number;
  };
  rocketType: string;
  rocketFamily?: string;
  missionType: string;
  payload?: {
    name: string;
    mass?: number;
    destination?: string;
  };
  status: LaunchStatus;
  probability?: number;
  missionDescription?: string;
  webcastUrl?: string;
  properties?: Record<string, unknown>;
}

export interface Trajectory {
  id: string;
  launchId: string;
  points: Array<{
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: string;
  }>;
  estimatedApogee?: number;
  estimatedPerigee?: number;
}

export interface LaunchFilter {
  provider?: LaunchProvider;
  status?: LaunchStatus;
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery?: string;
}

export interface LaunchStore {
  launches: Launch[];
  recentLaunches: Launch[];
  selectedLaunchId: string | null;
  showRecentLaunches: boolean;
  trajectories: Map<string, Trajectory>;
  filters: LaunchFilter;
  showTrajectories: boolean;

  setLaunches: (launches: Launch[]) => void;
  setRecentLaunches: (launches: Launch[]) => void;
  setSelectedLaunch: (id: string | null) => void;
  setShowRecentLaunches: (show: boolean) => void;
  setTrajectories: (trajectories: Trajectory[]) => void;
  setFilters: (filters: Partial<LaunchFilter>) => void;
  setShowTrajectories: (show: boolean) => void;
}

// ── Status display helpers ──────────────────────────────────────────────

export const STATUS_COLORS: Record<LaunchStatus, string> = {
  [LaunchStatus.GO]: '#00ff88',
  [LaunchStatus.NO_GO]: '#ff4444',
  [LaunchStatus.HOLD]: '#ffd700',
  [LaunchStatus.TBD]: '#888888',
  [LaunchStatus.IN_FLIGHT]: '#00d4ff',
  [LaunchStatus.SUCCESS]: '#00ff88',
  [LaunchStatus.FAILURE]: '#ff4444',
  [LaunchStatus.UNKNOWN]: '#888888',
};

export const STATUS_LABELS: Record<LaunchStatus, string> = {
  [LaunchStatus.GO]: 'Go',
  [LaunchStatus.NO_GO]: 'No Go',
  [LaunchStatus.HOLD]: 'Hold',
  [LaunchStatus.TBD]: 'TBD',
  [LaunchStatus.IN_FLIGHT]: 'In Flight',
  [LaunchStatus.SUCCESS]: 'Success',
  [LaunchStatus.FAILURE]: 'Failed',
  [LaunchStatus.UNKNOWN]: 'Unknown',
};

export const PROVIDER_LABELS: Record<LaunchProvider, string> = {
  [LaunchProvider.SPACEX]: 'SpaceX',
  [LaunchProvider.ROCKET_LAB]: 'Rocket Lab',
  [LaunchProvider.ULA]: 'ULA',
  [LaunchProvider.BLUE_ORIGIN]: 'Blue Origin',
  [LaunchProvider.ARIANESPACE]: 'Arianespace',
  [LaunchProvider.ROSCOSMOS]: 'Roscosmos',
  [LaunchProvider.ISRO]: 'ISRO',
  [LaunchProvider.CASC]: 'CASC',
  [LaunchProvider.JAXA]: 'JAXA',
  [LaunchProvider.OTHER]: 'Other',
};
