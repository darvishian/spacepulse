/**
 * Weather Service Library
 * Frontend API layer for space weather data using native fetch
 */

const NOAA_BASE = 'https://services.swpc.noaa.gov';

export interface SolarWind {
  timestamp: string;
  speed: number;
  temperature: number;
  density: number;
  pressure: number;
  source: string;
}

export interface KpIndex {
  timestamp: string;
  kpIndex: number;
  estimatedKp: number;
  observedKp: number;
  gIndex: number;
  source: string;
}

export interface XrayFlux {
  timestamp: string;
  shortWave: number;
  longWave: number;
  classLabel: string;
  source: string;
}

export interface WeatherAlert {
  id: string;
  type: 'solar_flare' | 'geomagnetic_storm' | 'radiation' | 'coronal_mass_ejection';
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  timestamp: string;
  description: string;
}

// ── Solar Wind ──────────────────────────────────────────────────────────

/**
 * Fetch real-time solar wind plasma data from NOAA SWPC.
 * Returns latest non-null speed entry with calculated dynamic pressure.
 */
export async function fetchSolarWind(): Promise<SolarWind> {
  try {
    const url = `${NOAA_BASE}/products/solar-wind/plasma-7-day.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return fallbackSolarWind();
    }

    const rows: string[][] = await response.json();

    // rows[0] is the header, find latest row with non-null speed
    let latest: SolarWind | null = null;
    for (let i = rows.length - 1; i >= 1; i--) {
      const [timeTag, density, speed, temperature] = rows[i];
      const spd = parseFloat(speed);
      if (isNaN(spd)) continue;

      const dens = parseFloat(density) || 0;
      latest = {
        timestamp: new Date(timeTag).toISOString(),
        speed: spd,
        temperature: parseFloat(temperature) || 0,
        density: dens,
        // Approximate dynamic pressure: P = 1.6726e-6 * n * v^2 (in nPa)
        pressure: 1.6726e-6 * dens * spd * spd,
        source: 'NOAA SWPC',
      };
      break;
    }

    return latest || fallbackSolarWind();
  } catch (error) {
    console.error('[WeatherService] Error fetching solar wind:', error);
    return fallbackSolarWind();
  }
}

function fallbackSolarWind(): SolarWind {
  return {
    timestamp: new Date().toISOString(),
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
 * Returns latest entry from the Kp index array.
 */
export async function fetchKpIndex(): Promise<KpIndex> {
  try {
    const url = `${NOAA_BASE}/products/noaa-planetary-k-index.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return fallbackKpIndex();
    }

    const rows: string[][] = await response.json();

    // rows[0] is the header, rows[last] is the latest
    let latest: KpIndex | null = null;
    for (let i = rows.length - 1; i >= 1; i--) {
      const [timeTag, kpStr] = rows[i];
      const kp = parseFloat(kpStr);
      if (isNaN(kp)) continue;

      // G index approximation: Kp * 50 (simplified mapping)
      const gIndex = Math.round(kp * 50);

      latest = {
        timestamp: new Date(timeTag).toISOString(),
        kpIndex: Math.round(kp),
        estimatedKp: kp,
        observedKp: kp,
        gIndex,
        source: 'NOAA SWPC',
      };
      break;
    }

    return latest || fallbackKpIndex();
  } catch (error) {
    console.error('[WeatherService] Error fetching Kp index:', error);
    return fallbackKpIndex();
  }
}

function fallbackKpIndex(): KpIndex {
  return {
    timestamp: new Date().toISOString(),
    kpIndex: 3,
    estimatedKp: 3,
    observedKp: 2,
    gIndex: 45,
    source: 'NOAA SWPC (fallback)',
  };
}

// ── X-ray Flux ──────────────────────────────────────────────────────────

/**
 * Classify X-ray flux by intensity.
 * X >= 1e-4, M >= 1e-5, C >= 1e-6, B >= 1e-7, else A
 */
function classifyXrayFlux(flux: number): string {
  if (flux >= 1e-4) return 'X';
  if (flux >= 1e-5) return 'M';
  if (flux >= 1e-6) return 'C';
  if (flux >= 1e-7) return 'B';
  return 'A';
}

/**
 * Fetch GOES X-ray flux from NOAA SWPC.
 * Returns latest short-wave and long-wave measurements with classification.
 */
export async function fetchXrayFlux(): Promise<XrayFlux> {
  try {
    const url = `${NOAA_BASE}/json/goes/primary/xrays-7-day.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return fallbackXrayFlux();
    }

    const data: Array<{ time_tag?: string; timestamp?: string; short_wave?: string | number; long_wave?: string | number }> =
      await response.json();

    // Find latest valid entry with both short and long wave data
    let latest: XrayFlux | null = null;
    for (let i = data.length - 1; i >= 0; i--) {
      const entry = data[i];
      const timestamp = entry.time_tag || entry.timestamp;
      const shortWave = typeof entry.short_wave === 'string' ? parseFloat(entry.short_wave) : entry.short_wave;
      const longWave = typeof entry.long_wave === 'string' ? parseFloat(entry.long_wave) : entry.long_wave;

      if (timestamp && !isNaN(shortWave || 0) && !isNaN(longWave || 0)) {
        const sw = shortWave || 0;
        const lw = longWave || 0;
        latest = {
          timestamp: new Date(timestamp).toISOString(),
          shortWave: sw,
          longWave: lw,
          classLabel: classifyXrayFlux(Math.max(sw, lw)),
          source: 'NOAA SWPC',
        };
        break;
      }
    }

    return latest || fallbackXrayFlux();
  } catch (error) {
    console.error('[WeatherService] Error fetching X-ray flux:', error);
    return fallbackXrayFlux();
  }
}

function fallbackXrayFlux(): XrayFlux {
  return {
    timestamp: new Date().toISOString(),
    shortWave: 1e-7,
    longWave: 1e-7,
    classLabel: 'A',
    source: 'NOAA SWPC (fallback)',
  };
}

// ── Alerts ──────────────────────────────────────────────────────────────

/**
 * Classify alert type from message content.
 */
function classifyAlertType(message: string): 'solar_flare' | 'geomagnetic_storm' | 'radiation' | 'coronal_mass_ejection' {
  const lower = message.toLowerCase();
  if (lower.includes('solar flare') || lower.includes('x-ray')) return 'solar_flare';
  if (lower.includes('geomagnetic') || lower.includes('k-index')) return 'geomagnetic_storm';
  if (lower.includes('radiation') || lower.includes('proton')) return 'radiation';
  if (lower.includes('coronal mass ejection') || lower.includes('cme')) return 'coronal_mass_ejection';
  return 'geomagnetic_storm';
}

/**
 * Classify alert severity from message content.
 */
function classifyAlertSeverity(message: string): 'minor' | 'moderate' | 'major' | 'extreme' {
  const lower = message.toLowerCase();
  if (lower.includes('extreme') || lower.includes('g5') || lower.includes('s5') || lower.includes('r5')) return 'extreme';
  if (lower.includes('major') || lower.includes('g4') || lower.includes('s4') || lower.includes('r4') || lower.includes('m-class') || lower.includes('x-class'))
    return 'major';
  if (lower.includes('moderate') || lower.includes('g3') || lower.includes('s3') || lower.includes('r3') || lower.includes('c-class'))
    return 'moderate';
  return 'minor';
}

/**
 * Fetch space weather alerts from NOAA SWPC.
 * Parses the 20 most recent alerts and classifies type/severity.
 */
export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    const url = `${NOAA_BASE}/products/alerts.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return [];
    }

    const data: Array<{ issue_time?: string; phenomena?: string; message?: string }> = await response.json();

    const alerts: WeatherAlert[] = data.slice(0, 20).map((alert, idx) => ({
      id: `alert_${alert.issue_time || idx}`,
      type: classifyAlertType(alert.message || ''),
      severity: classifyAlertSeverity(alert.message || ''),
      timestamp: new Date(alert.issue_time || Date.now()).toISOString(),
      description: alert.message || 'Alert',
    }));

    return alerts;
  } catch (error) {
    console.error('[WeatherService] Error fetching weather alerts:', error);
    return [];
  }
}

// ── Combined ────────────────────────────────────────────────────────────

/**
 * Fetch all space weather data in parallel.
 */
export async function fetchSpaceWeather(): Promise<{
  timestamp: string;
  solarWind: SolarWind;
  kpIndex: KpIndex;
  xrayFlux: XrayFlux;
}> {
  const [solarWind, kpIndex, xrayFlux] = await Promise.all([fetchSolarWind(), fetchKpIndex(), fetchXrayFlux()]);

  return {
    timestamp: new Date().toISOString(),
    solarWind,
    kpIndex,
    xrayFlux,
  };
}
