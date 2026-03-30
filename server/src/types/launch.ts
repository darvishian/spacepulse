/**
 * Types for launch data structures
 */

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

export interface LaunchSite {
  id: string;
  name: string;
  country: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface LaunchVehicle {
  id: string;
  name: string;
  type: string;
  family?: string;
}

export interface LaunchPayload {
  id: string;
  name: string;
  type: string;
  mass?: number;
  orbit?: string;
}

export interface Launch {
  id: string;
  name: string;
  provider: LaunchProvider;
  scheduledTime: Date;
  launchWindow?: {
    start: Date;
    end: Date;
  };
  location: LaunchSite;
  vehicle: LaunchVehicle;
  payloads: LaunchPayload[];
  status: LaunchStatus;
  probability?: number;
  missionDescription?: string;
  webcastUrl?: string;
  apiUrl?: string;
  lastUpdated: Date;
}

export interface LaunchSummary {
  id: string;
  name: string;
  provider: LaunchProvider;
  scheduledTime: Date;
  location: string;
  vehicle: string;
  status: LaunchStatus;
}
