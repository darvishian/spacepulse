/**
 * Types for space weather data structures
 */

export interface SolarWind {
  timestamp: Date;
  speed: number; // km/s
  temperature: number; // Kelvin
  density: number; // particles/cm^3
  pressure: number; // nPa
  source: string;
}

export interface KpIndex {
  timestamp: Date;
  kpIndex: number; // 0-9
  estimatedKp: number; // 0-9
  observedKp?: number; // 0-9
  gIndex: number; // 0-400
  source: string;
}

export interface XrayFlux {
  timestamp: Date;
  shortWave: number; // W/m^2 (0.05-0.4 nm)
  longWave: number; // W/m^2 (0.1-0.8 nm)
  classLabel?: string; // A, B, C, M, X
  source: string;
}

export interface SpaceWeather {
  timestamp: Date;
  solarWind: SolarWind;
  kpIndex: KpIndex;
  xrayFlux: XrayFlux;
}

export interface WeatherAlert {
  id: string;
  type: 'solar_flare' | 'geomagnetic_storm' | 'radiation' | 'coronal_mass_ejection';
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  timestamp: Date;
  description: string;
  expectedImpactTime?: Date;
  url?: string;
}
