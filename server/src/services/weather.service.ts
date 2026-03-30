import axios from 'axios';
import { SolarWind, KpIndex, XrayFlux, WeatherAlert } from '../types/weather';
import config from '../config';
import { getCache } from '../cache';

/**
 * Weather Service
 * Fetches real-time space weather data from NOAA SWPC JSON endpoints.
 * All endpoints are free, public, and require no API key.
 *
 * NOAA SWPC data sources:
 * - Solar wind:  https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json
 * - Kp index:    https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
 * - X-ray flux:  https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json
 * - Alerts:      https://services.swpc.noaa.gov/products/alerts.json
 */

const cache = getCache();

const NOAA_BASE = config.noaaSwpcUrl; // https://services.swpc.noaa.gov

// ── Solar Wind ──────────────────────────────────────────────────────────

/**
 * Fetch real-time solar wind plasma data from NOAA SWPC.
 * Endpoint returns a 7-day JSON array: [[header], [row], ...].
 * Each row: [time_tag, density, speed, temperature].
 * We take the latest non-null entry.
 */
export async function fetchSolarWind(): Promise<SolarWind | null> {
  try {
    const cacheKey = 'space_weather_solar_wind';
    const cached = await cache.get<SolarWind>(cacheKey);
    if (cached) return cached;

    const url = `${NOAA_BASE}/products/solar-wind/plasma-7-day.json`;
    const response = await axios.get(url, { timeout: 10000 });
    const rows: string[][] = response.data;

    // rows[0] is the header, find latest row with non-null speed
    let latest: SolarWind | null = null;
    for (let i = rows.length - 1; i >= 1; i--) {
      const [timeTag, density, speed, temperature] = rows[i];
      const spd = parseFloat(speed);
      if (isNaN(spd)) continue;

      latest = {
        timestamp: new Date(timeTag),
        speed: spd,
        temperature: parseFloat(temperature) || 0,
        density: parseFloat(density) || 0,
        // Approximate dynamic pressure: P = 1.6726e-6 * n * v^2 (in nPa)
        pressure: 1.6726e-6 * (parseFloat(density) || 0) * spd * spd,
        source: 'NOAA SWPC',
      };
      break;
    }

    if (latest) {
      await cache.set(cacheKey, latest, 120); // 2-min TTL — fast-changing data
      return latest;
    }

    console.warn('[WeatherService] No valid solar wind data in NOAA response');
    return fallbackSolarWind();
  } catch (error) {
    console.error('[WeatherService] Error fetching solar wind:', error instanceof Error ? error.message : error);
    return fallbackSolarWind();
  }
}

function fallbackSolarWind(): SolarWind {
  return {
    timestamp: new Date(),
    speed: 380,
    temperature: 60000,
    density: 3.5,
    pressure: 2.1,
    source: 'NOAA SWPC (fallback)',
  };
}

// ── Kp Index ────────────────────────────────────────────────────────────

/**
 * Fetch planetary Kp index from NOAA SWPC.
 * Endpoint returns JSON array: [[time_tag, Kp, Kp_fraction, a_running, station_count]].
 * We take the latest entry.
 */
export async function fetchKpIndex(): Promise<KpIndex | null> {
  try {
    const cacheKey = 'space_weather_kp_index';
    const cached = await cache.get<KpIndex>(cacheKey);
    if (cached) return cached;

    const url = `${NOAA_BASE}/products/noaa-planetary-k-index.json`;
    const response = await axios.get(url, { timeout: 10000 });
    const rows: string[][] = response.data;

    // rows[0] is the header, rows[last] is the latest
    let latest: KpIndex | null = null;
    for (let i = rows.length - 1; i >= 1; i--) {
      const [timeTag, kpStr] = rows[i];
      const kp = parseFloat(kpStr);
      if (isNaN(kp)) continue;

      // G index approximation: Kp * 50 (simplified mapping)
      const gIndex = Math.round(kp * 50);

      latest = {
        timestamp: new Date(timeTag),
        kpIndex: Math.round(kp),
        estimatedKp: kp,
        observedKp: kp,
        gIndex,
        source: 'NOAA SWPC',
      };
      break;
    }

    if (latest) {
      await cache.set(cacheKey, latest, 180); // 3-min TTL
      return latest;
    }

    console.warn('[WeatherService] No valid Kp index data in NOAA response');
    return fallbackKpIndex();
  } catch (error) {
    console.error('[WeatherService] Error fetching Kp index:', error instanceof Error ? error.message : error);
    return fallbackKpIndex();
  }
}

function fallbackKpIndex(): KpIndex {
  return {
    timestamp: new Date(),
    kpIndex: 3,
    estimatedKp: 3,
    observedKp: 2,
    gIndex: 45,
    source: 'NOAA SWPC (fallback)',
  };
}

// ── X-ray Flux ──────────────────────────────────────────────────────────

/**
 * Fetch GOES X-ray flux from NOAA SWPC.
 * Endpoint returns JSON objects with energy/flux fields.
 * We use the primary GOES satellite data, latest entry.
 */
export async function fetchXrayFlux(): Promise<XrayFlux | null> {
  try {
    const cacheKey = 'space_weather_xray_flux';
    const cached = await cache.get<XrayFlux>(cacheKey);
    if (cached) return cached;

    const url = `${NOAA_BASE}/json/goes/primary/xrays-7-day.json`;
    const response = await axios.get(url, { timeout: 10000 });
    const entries: Array<{
      time_tag: string;
      satellite: number;
      flux: number;
      observed_flux: number;
      electron_correction: number;
      electron_contaminaton: boolean;
      energy: string; // "0.05-0.4nm" or "0.1-0.8nm"
    }> = response.data;

    if (!entries || entries.length === 0) {
      return fallbackXrayFlux();
    }

    // Separate by energy band, take latest of each
    let latestShort: number | null = null;
    let latestLong: number | null = null;
    let latestTime: string | null = null;

    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (entry.energy === '0.05-0.4nm' && latestShort === null) {
        latestShort = entry.flux;
        if (!latestTime) latestTime = entry.time_tag;
      }
      if (entry.energy === '0.1-0.8nm' && latestLong === null) {
        latestLong = entry.flux;
        if (!latestTime) latestTime = entry.time_tag;
      }
      if (latestShort !== null && latestLong !== null) break;
    }

    const longWave = latestLong ?? 1e-7;
    const classLabel = classifyXrayFlux(longWave);

    const result: XrayFlux = {
      timestamp: latestTime ? new Date(latestTime) : new Date(),
      shortWave: latestShort ?? 1e-8,
      longWave,
      classLabel,
      source: 'NOAA SWPC',
    };

    await cache.set(cacheKey, result, 120); // 2-min TTL
    return result;
  } catch (error) {
    console.error('[WeatherService] Error fetching X-ray flux:', error instanceof Error ? error.message : error);
    return fallbackXrayFlux();
  }
}

/**
 * Classify X-ray flux into solar flare class (A/B/C/M/X)
 * Based on GOES long-wavelength (0.1–0.8 nm) flux in W/m².
 */
function classifyXrayFlux(flux: number): string {
  if (flux >= 1e-4) return 'X';
  if (flux >= 1e-5) return 'M';
  if (flux >= 1e-6) return 'C';
  if (flux >= 1e-7) return 'B';
  return 'A';
}

function fallbackXrayFlux(): XrayFlux {
  return {
    timestamp: new Date(),
    shortWave: 1e-8,
    longWave: 1e-7,
    classLabel: 'A',
    source: 'NOAA SWPC (fallback)',
  };
}

// ── Space Weather (combined) ────────────────────────────────────────────

/**
 * Fetch all space weather data in parallel.
 */
export async function fetchSpaceWeather(): Promise<{
  solarWind: SolarWind | null;
  kpIndex: KpIndex | null;
  xrayFlux: XrayFlux | null;
} | null> {
  try {
    const [solarWind, kpIndex, xrayFlux] = await Promise.all([
      fetchSolarWind(),
      fetchKpIndex(),
      fetchXrayFlux(),
    ]);

    return { solarWind, kpIndex, xrayFlux };
  } catch (error) {
    console.error('[WeatherService] Error fetching space weather:', error);
    return null;
  }
}

// ── Alerts ──────────────────────────────────────────────────────────────

/**
 * Fetch space weather alerts from NOAA SWPC.
 * Endpoint returns JSON array of alert objects.
 */
export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    const cacheKey = 'space_weather_alerts';
    const cached = await cache.get<WeatherAlert[]>(cacheKey);
    if (cached) return cached;

    const url = `${NOAA_BASE}/products/alerts.json`;
    const response = await axios.get(url, { timeout: 10000 });
    const rawAlerts: Array<{
      product_id: string;
      issue_datetime: string;
      message: string;
    }> = response.data;

    if (!rawAlerts || rawAlerts.length === 0) {
      await cache.set(cacheKey, [], 60);
      return [];
    }

    // Parse NOAA alerts into our WeatherAlert format
    // Take only the 20 most recent alerts
    const alerts: WeatherAlert[] = rawAlerts
      .slice(-20)
      .map((raw) => parseNoaaAlert(raw))
      .filter((a): a is WeatherAlert => a !== null);

    await cache.set(cacheKey, alerts, 60); // 1-min TTL — alerts must be fresh
    return alerts;
  } catch (error) {
    console.error('[WeatherService] Error fetching weather alerts:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Parse a raw NOAA alert message into a WeatherAlert.
 * NOAA alerts are plain-text messages with a product_id prefix indicating type.
 */
function parseNoaaAlert(raw: {
  product_id: string;
  issue_datetime: string;
  message: string;
}): WeatherAlert | null {
  try {
    const id = raw.product_id;
    const type = classifyAlertType(raw.message);
    const severity = classifyAlertSeverity(raw.message);

    // Extract first meaningful line as description (skip blank/header lines)
    const lines = raw.message.split('\n').filter((l) => l.trim().length > 0);
    const description = lines.slice(0, 3).join(' ').substring(0, 300);

    return {
      id,
      type,
      severity,
      timestamp: new Date(raw.issue_datetime),
      description,
    };
  } catch {
    return null;
  }
}

/**
 * Classify NOAA alert type from message content.
 */
function classifyAlertType(message: string): WeatherAlert['type'] {
  const lower = message.toLowerCase();
  if (lower.includes('solar flare') || lower.includes('x-ray')) return 'solar_flare';
  if (lower.includes('geomagnetic') || lower.includes('kp index') || lower.includes('g1') || lower.includes('g2') || lower.includes('g3') || lower.includes('g4') || lower.includes('g5')) return 'geomagnetic_storm';
  if (lower.includes('radiation') || lower.includes('proton')) return 'radiation';
  if (lower.includes('cme') || lower.includes('coronal mass')) return 'coronal_mass_ejection';
  // Default to geomagnetic_storm for unclassified NOAA alerts
  return 'geomagnetic_storm';
}

/**
 * Classify alert severity from message content.
 * NOAA uses G1–G5 for geomagnetic, S1–S5 for radiation, R1–R5 for radio blackouts.
 */
function classifyAlertSeverity(message: string): WeatherAlert['severity'] {
  const lower = message.toLowerCase();
  if (lower.includes('extreme') || lower.includes('g5') || lower.includes('s5') || lower.includes('r5')) return 'extreme';
  if (lower.includes('severe') || lower.includes('g4') || lower.includes('s4') || lower.includes('r4') || lower.includes('major')) return 'major';
  if (lower.includes('strong') || lower.includes('g3') || lower.includes('s3') || lower.includes('r3') || lower.includes('moderate')) return 'moderate';
  return 'minor';
}

export default {
  fetchSolarWind,
  fetchKpIndex,
  fetchXrayFlux,
  fetchSpaceWeather,
  fetchWeatherAlerts,
};
