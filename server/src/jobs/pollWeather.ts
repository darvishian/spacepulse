import { Server as SocketIOServer } from 'socket.io';
import weatherService from '../services/weather.service';
import { SolarWind, KpIndex, XrayFlux, WeatherAlert } from '../types/weather';

/**
 * Space Weather polling job
 * Polls NOAA SWPC at regular intervals (typically 60 seconds).
 * Emits real-time weather updates, alerts, and significant change events.
 */

interface WeatherSnapshot {
  solarWind: SolarWind | null;
  kpIndex: KpIndex | null;
  xrayFlux: XrayFlux | null;
}

let previousWeatherData: WeatherSnapshot | null = null;
let previousAlerts: WeatherAlert[] = [];

/**
 * Poll space weather data and emit updates only on changes.
 */
export async function pollWeather(io?: SocketIOServer): Promise<void> {
  try {
    const [weatherData, alerts] = await Promise.all([
      weatherService.fetchSpaceWeather(),
      weatherService.fetchWeatherAlerts(),
    ]);

    if (!weatherData) {
      console.warn('[Poll Weather] No weather data returned');
      return;
    }

    // ── Weather data change detection ───────────────────────────────

    const weatherChanged = hasWeatherChanged(weatherData, previousWeatherData);

    if (weatherChanged && io) {
      io.of('/weather').emit('weather_update', {
        status: 'success',
        data: weatherData,
        timestamp: new Date().toISOString(),
      });

      // Analyze for significant changes (storms, flares, etc.)
      if (previousWeatherData) {
        analyzeWeatherTrends(weatherData, previousWeatherData, io);
      }
    }

    previousWeatherData = weatherData;

    // ── Alert change detection ──────────────────────────────────────

    const newAlerts = detectNewAlerts(alerts, previousAlerts);
    if (newAlerts.length > 0 && io) {
      for (const alert of newAlerts) {
        const severity = getAlertSeverity(alert);
        io.of('/weather').emit('weather_alert', {
          status: 'success',
          data: alert,
          severity,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`[Poll Weather] ${newAlerts.length} new alert(s) emitted`);
    }

    previousAlerts = alerts;
  } catch (error) {
    console.error('[Poll Weather] Error polling weather data:', error instanceof Error ? error.message : error);
  }
}

/**
 * Compare weather snapshots to determine if data actually changed.
 * Uses key numeric fields rather than full JSON equality to avoid
 * false positives from timestamp differences.
 */
function hasWeatherChanged(
  current: WeatherSnapshot,
  previous: WeatherSnapshot | null,
): boolean {
  if (!previous) return true;

  // Solar wind: speed change > 10 km/s or density change > 0.5
  if (current.solarWind && previous.solarWind) {
    if (
      Math.abs(current.solarWind.speed - previous.solarWind.speed) > 10 ||
      Math.abs(current.solarWind.density - previous.solarWind.density) > 0.5
    ) {
      return true;
    }
  } else if (current.solarWind !== previous.solarWind) {
    return true;
  }

  // Kp index: any integer change
  if (current.kpIndex && previous.kpIndex) {
    if (current.kpIndex.kpIndex !== previous.kpIndex.kpIndex) return true;
  } else if (current.kpIndex !== previous.kpIndex) {
    return true;
  }

  // X-ray flux: class label change or > 50% flux change
  if (current.xrayFlux && previous.xrayFlux) {
    if (current.xrayFlux.classLabel !== previous.xrayFlux.classLabel) return true;
    const ratio = current.xrayFlux.longWave / (previous.xrayFlux.longWave || 1e-10);
    if (ratio > 1.5 || ratio < 0.67) return true;
  } else if (current.xrayFlux !== previous.xrayFlux) {
    return true;
  }

  return false;
}

/**
 * Analyze weather trends and emit significant change events.
 */
function analyzeWeatherTrends(
  current: WeatherSnapshot,
  previous: WeatherSnapshot,
  io: SocketIOServer,
): void {
  const ts = new Date().toISOString();

  // ── Kp index significant change (±2 or more) → geomagnetic storm indicator
  if (current.kpIndex && previous.kpIndex) {
    const kpChange = current.kpIndex.kpIndex - previous.kpIndex.kpIndex;
    if (Math.abs(kpChange) >= 2) {
      io.of('/weather').emit('kp_index_significant_change', {
        oldValue: previous.kpIndex.kpIndex,
        newValue: current.kpIndex.kpIndex,
        change: kpChange,
        stormLevel: getGeomagneticStormLevel(current.kpIndex.kpIndex),
        timestamp: ts,
      });
      console.log(`[Poll Weather] Significant Kp change: ${kpChange > 0 ? '+' : ''}${kpChange} → Kp=${current.kpIndex.kpIndex}`);
    }
  }

  // ── Solar wind speed surge (>100 km/s increase)
  if (current.solarWind && previous.solarWind) {
    const speedChange = current.solarWind.speed - previous.solarWind.speed;
    if (speedChange > 100) {
      io.of('/weather').emit('solar_wind_surge', {
        oldSpeed: previous.solarWind.speed,
        newSpeed: current.solarWind.speed,
        change: speedChange,
        timestamp: ts,
      });
      console.log(`[Poll Weather] Solar wind surge: +${Math.round(speedChange)} km/s`);
    }
  }

  // ── X-ray flux class escalation (e.g., B → C → M → X)
  if (current.xrayFlux && previous.xrayFlux) {
    const classOrder = ['A', 'B', 'C', 'M', 'X'];
    const prevIdx = classOrder.indexOf(previous.xrayFlux.classLabel || 'A');
    const currIdx = classOrder.indexOf(current.xrayFlux.classLabel || 'A');
    if (currIdx > prevIdx) {
      io.of('/weather').emit('xray_flux_escalation', {
        oldClass: previous.xrayFlux.classLabel,
        newClass: current.xrayFlux.classLabel,
        flux: current.xrayFlux.longWave,
        timestamp: ts,
      });
      console.log(`[Poll Weather] X-ray flux escalation: ${previous.xrayFlux.classLabel} → ${current.xrayFlux.classLabel}`);
    }
  }
}

/**
 * Detect new alerts by comparing IDs.
 */
function detectNewAlerts(newAlerts: WeatherAlert[], oldAlerts: WeatherAlert[]): WeatherAlert[] {
  const oldIds = new Set(oldAlerts.map((a) => a.id));
  return newAlerts.filter((a) => !oldIds.has(a.id));
}

/**
 * Determine alert severity from the alert's own severity field.
 */
export function getAlertSeverity(alert: WeatherAlert): 'low' | 'medium' | 'high' | 'critical' {
  switch (alert.severity) {
    case 'extreme': return 'critical';
    case 'major': return 'high';
    case 'moderate': return 'medium';
    case 'minor':
    default: return 'low';
  }
}

/**
 * Map Kp index to NOAA geomagnetic storm level (G0–G5).
 */
function getGeomagneticStormLevel(kp: number): string {
  if (kp >= 9) return 'G5 (Extreme)';
  if (kp >= 8) return 'G4 (Severe)';
  if (kp >= 7) return 'G3 (Strong)';
  if (kp >= 6) return 'G2 (Moderate)';
  if (kp >= 5) return 'G1 (Minor)';
  return 'G0 (Quiet)';
}

export default pollWeather;
