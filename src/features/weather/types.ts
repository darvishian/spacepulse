/**
 * Space weather feature types
 */

export interface SolarWind {
  timestamp: string;
  speed: number; // km/s
  density: number; // particles/cm³
  temperature: number; // Kelvin
  pressure: number; // nPa
}

export interface KpIndex {
  timestamp: string;
  value: number; // 0-9
  label: string; // Quiet, Unsettled, Active, etc.
  severity: 'low' | 'moderate' | 'high' | 'severe';
}

export interface XrayFlux {
  timestamp: string;
  flux_short: number; // 0.1-0.8 nm
  flux_long: number; // 0.8-8.0 nm
  classification: string; // A, B, C, M, X
}

export interface MagneticStorm {
  id: string;
  timestamp: string;
  kpIndex: number;
  dstIndex: number;
  duration?: number; // hours
  impact?: string;
}

export interface SpaceWeatherStore {
  solarWind: SolarWind | null;
  kpIndex: KpIndex | null;
  xrayFlux: XrayFlux | null;
  activeStorms: MagneticStorm[];
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;

  setSolarWind: (wind: SolarWind) => void;
  setKpIndex: (index: KpIndex) => void;
  setXrayFlux: (flux: XrayFlux) => void;
  setActiveStorms: (storms: MagneticStorm[]) => void;
  addAlert: (alert: any) => void;
  removeAlert: (id: string) => void;
}
