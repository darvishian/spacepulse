/**
 * Celestrak Service (Next.js API)
 * Fetches and parses TLE (Two-Line Element) orbital data from Celestrak.
 * Uses native fetch with ISR caching (revalidate: 3600).
 * Supports active satellites, constellation-specific queries, and position lookups.
 */

export interface TleRecord {
  satelliteId: string;
  satelliteName: string;
  line1: string;
  line2: string;
  epochYear: number;
  epochDay: number;
  epochTime: string; // ISO string (JSON serializable)
  meanMotion: number;
  inclination: number;
  eccentricity: number;
  argumentOfPerigee: number;
  meanAnomaly: number;
  ascendingNode: number;
}

const CELESTRAK_BASE = 'https://celestrak.org';

/** Map constellation names to Celestrak GP endpoints (TLE format). */
const CONSTELLATION_ENDPOINTS: Record<string, string> = {
  starlink: '/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle',
  oneweb: '/NORAD/elements/gp.php?GROUP=oneweb&FORMAT=tle',
  iridium: '/NORAD/elements/gp.php?GROUP=iridium-NEXT&FORMAT=tle',
  globalstar: '/NORAD/elements/gp.php?GROUP=globalstar&FORMAT=tle',
  gps: '/NORAD/elements/gp.php?GROUP=gps-ops&FORMAT=tle',
  glonass: '/NORAD/elements/gp.php?GROUP=glo-ops&FORMAT=tle',
  galileo: '/NORAD/elements/gp.php?GROUP=galileo&FORMAT=tle',
  beidou: '/NORAD/elements/gp.php?GROUP=beidou&FORMAT=tle',
  planet: '/NORAD/elements/gp.php?GROUP=planet&FORMAT=tle',
  spire: '/NORAD/elements/gp.php?GROUP=spire&FORMAT=tle',
  ses: '/NORAD/elements/gp.php?GROUP=ses&FORMAT=tle',
  telesat: '/NORAD/elements/gp.php?GROUP=telesat&FORMAT=tle',
  active: '/NORAD/elements/gp.php?GROUP=active&FORMAT=tle',
};

/**
 * Parse raw 3-line TLE text into an array of TleRecord objects.
 * Celestrak returns TLE data as alternating lines: name, line1, line2.
 */
export function parseTleFormat(rawText: string): TleRecord[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const records: TleRecord[] = [];

  for (let i = 0; i + 2 < lines.length; i += 3) {
    const line0 = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    // Validate: line1 starts with '1 ', line2 starts with '2 '
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      continue;
    }

    const parsed = parseTleLines(line0, line1, line2);
    if (parsed) {
      records.push(parsed);
    }
  }

  return records;
}

/**
 * Parse three TLE lines into a TleRecord.
 * Extracts all orbital elements from standard TLE fixed-width format.
 */
export function parseTleLines(line0: string, line1: string, line2: string): TleRecord | null {
  try {
    // Line 1 fields (fixed-width)
    const satelliteId = line1.substring(2, 7).trim();
    const epochYearRaw = parseInt(line1.substring(18, 20), 10);
    const epochDay = parseFloat(line1.substring(20, 32));

    // Convert 2-digit year: 57-99 → 1957-1999, 00-56 → 2000-2056
    const epochYear = epochYearRaw >= 57 ? 1900 + epochYearRaw : 2000 + epochYearRaw;

    // Calculate epoch Date from year + fractional day
    const epochDate = new Date(Date.UTC(epochYear, 0, 1));
    epochDate.setTime(epochDate.getTime() + (epochDay - 1) * 86400000);

    // Line 2 fields (fixed-width)
    const inclination = parseFloat(line2.substring(8, 16).trim());
    const ascendingNode = parseFloat(line2.substring(17, 25).trim());
    const eccentricityStr = line2.substring(26, 33).trim();
    const eccentricity = parseFloat(`0.${eccentricityStr}`);
    const argumentOfPerigee = parseFloat(line2.substring(34, 42).trim());
    const meanAnomaly = parseFloat(line2.substring(43, 51).trim());
    const meanMotion = parseFloat(line2.substring(52, 63).trim());

    // Validate parsed values
    if (isNaN(inclination) || isNaN(meanMotion) || meanMotion <= 0) {
      return null;
    }

    return {
      satelliteId,
      satelliteName: line0.trim(),
      line1: line1.trim(),
      line2: line2.trim(),
      epochYear: epochYearRaw,
      epochDay,
      epochTime: epochDate.toISOString(),
      meanMotion,
      inclination,
      eccentricity,
      argumentOfPerigee,
      meanAnomaly,
      ascendingNode,
    };
  } catch (error) {
    console.error('[CelestrakService] Error parsing TLE lines:', error);
    return null;
  }
}

/**
 * Fetch TLE data for all active satellites from Celestrak.
 * Uses the "active" group which contains ~8000-9000 satellites.
 * Falls back to constellation-level fetches on 403.
 * Falls back to mock data on complete failure.
 */
export async function fetchTleData(): Promise<TleRecord[]> {
  try {
    const url = `${CELESTRAK_BASE}/NORAD/elements/gp.php?GROUP=active&FORMAT=tle`;
    console.log('[CelestrakService] Fetching active TLEs from Celestrak...');

    const response = await fetch(url, {
      headers: { 'User-Agent': 'SpacePulse/1.0 (space-monitoring-dashboard)' },
      next: { revalidate: 3600 }, // 1 hour ISR cache
    });

    // Handle 403: Celestrak data unchanged — use constellation fallback
    if (response.status === 403) {
      const body = await response.text();
      if (body.includes('has not updated')) {
        console.log('[CelestrakService] Celestrak 403: data unchanged, fetching by constellation');
        return fetchConstellationsFallback();
      }
    }

    if (!response.ok) {
      throw new Error(`Celestrak responded with ${response.status}`);
    }

    const rawText = await response.text();
    const tles = parseTleFormat(rawText);

    console.log(`[CelestrakService] Parsed ${tles.length} active TLE records`);

    if (tles.length > 0) {
      return tles;
    }

    // Fallback to constellation fetches if Celestrak returned nothing
    console.warn('[CelestrakService] Celestrak returned 0 records, using constellation fallback');
    return fetchConstellationsFallback();
  } catch (error) {
    console.error('[CelestrakService] Error fetching TLE data:', error);
    return fetchConstellationsFallback();
  }
}

/**
 * Fallback: fetch TLEs by individual constellation when the bulk "active" group
 * is unavailable (403 rate-limit or other error). Aggregates results.
 */
async function fetchConstellationsFallback(): Promise<TleRecord[]> {
  const groups = ['starlink', 'oneweb', 'iridium', 'gps', 'glonass', 'galileo', 'beidou', 'planet', 'spire'];
  const results = await Promise.allSettled(groups.map((g) => fetchConstellationTles(g)));

  const allTles: TleRecord[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      allTles.push(...result.value);
    }
  }

  if (allTles.length > 0) {
    console.log(`[CelestrakService] Constellation fallback: ${allTles.length} TLEs from ${groups.length} groups`);
    return allTles;
  }

  console.warn('[CelestrakService] All constellation fetches failed, using mock data');
  return getMockTleData();
}

/**
 * Fetch TLE data for a specific constellation.
 */
export async function fetchConstellationTles(constellationName: string): Promise<TleRecord[]> {
  try {
    const key = constellationName.toLowerCase();
    const endpoint = CONSTELLATION_ENDPOINTS[key];

    if (!endpoint) {
      console.warn(`[CelestrakService] Unknown constellation: ${constellationName}`);
      return [];
    }

    const url = `${CELESTRAK_BASE}${endpoint}`;
    console.log(`[CelestrakService] Fetching TLEs for ${constellationName}...`);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'SpacePulse/1.0 (space-monitoring-dashboard)' },
      next: { revalidate: 3600 }, // 1 hour ISR cache
    });

    if (!response.ok) {
      throw new Error(`Celestrak responded with ${response.status}`);
    }

    const rawText = await response.text();
    const tles = parseTleFormat(rawText);

    console.log(`[CelestrakService] Parsed ${tles.length} TLEs for ${constellationName}`);

    return tles;
  } catch (error) {
    console.error(`[CelestrakService] Error fetching constellation TLEs for ${constellationName}:`, error);
    return [];
  }
}

/**
 * Classify orbit type based on mean motion (revolutions/day).
 * meanMotion > 11.25 → LEO, 2-11.25 → MEO, ~1 → GEO
 */
export function classifyOrbit(meanMotion: number): string {
  if (meanMotion > 11.25) return 'leo';
  if (meanMotion > 2.0) return 'meo';
  if (meanMotion > 0.9 && meanMotion < 1.1) return 'geo';
  return 'unknown';
}

/**
 * Fetch satellite position at a specific time using simplified orbital mechanics.
 * Full SGP4 propagation is done client-side with satellite.js.
 * This endpoint provides a quick server-side position for single-satellite lookups.
 */
export async function fetchSatellitePosition(
  satelliteId: string,
  timestamp: Date,
): Promise<{ latitude: number; longitude: number; altitude: number; velocity: number } | null> {
  try {
    // Fetch TLE for this satellite
    const allTles = await fetchTleData();
    const tle = allTles.find((t) => t.satelliteId === satelliteId);

    if (!tle) {
      return null;
    }

    // Server-side simplified propagation using orbital mechanics
    const { meanMotion, inclination } = tle;

    // Approximate altitude from mean motion (revs/day)
    // n = sqrt(mu / a^3), period = 86400/meanMotion seconds
    const periodSeconds = 86400 / meanMotion;
    const mu = 398600.4418; // km^3/s^2
    const semiMajorAxis = Math.pow(mu * Math.pow(periodSeconds / (2 * Math.PI), 2), 1 / 3);
    const altitudeKm = semiMajorAxis - 6371; // Earth radius

    // Approximate velocity from vis-viva
    const velocity = Math.sqrt(mu / semiMajorAxis);

    // Rough position based on elapsed time since epoch
    const epochDate = new Date(tle.epochTime);
    const elapsed = (timestamp.getTime() - epochDate.getTime()) / 1000;
    const orbitsCompleted = elapsed / periodSeconds;
    const currentAngle = (orbitsCompleted * 360) % 360;

    // Simplified: latitude oscillates with inclination, longitude drifts with Earth rotation
    const latitude = inclination * Math.sin((currentAngle * Math.PI) / 180);
    const longitude = ((currentAngle * 2 - elapsed * (360 / 86400)) % 360) - 180;

    return {
      latitude: Math.max(-90, Math.min(90, latitude)),
      longitude: ((longitude + 540) % 360) - 180, // Normalize to [-180, 180]
      altitude: Math.max(0, altitudeKm),
      velocity,
    };
  } catch (error) {
    console.error(`[CelestrakService] Error computing position for satellite ${satelliteId}:`, error);
    return null;
  }
}

/**
 * Mock TLE data fallback — ISS and Chinese Space Station.
 */
export function getMockTleData(): TleRecord[] {
  const now = new Date();
  const issEpoch = new Date(now.getFullYear(), 0, 1);
  const cssEpoch = new Date(now.getFullYear(), 0, 1);
  cssEpoch.setHours(12);

  return [
    {
      satelliteId: '25544',
      satelliteName: 'ISS (ZARYA)',
      line1: '1 25544U 98067A   24001.00000000  .00016717  00000-0  28682-3 0  9005',
      line2: '2 25544  51.6409 339.8014 0002571  34.5857 120.4689 15.54539662378353',
      epochYear: 24,
      epochDay: 1.0,
      epochTime: issEpoch.toISOString(),
      meanMotion: 15.54539662,
      inclination: 51.6409,
      eccentricity: 0.0002571,
      argumentOfPerigee: 34.5857,
      meanAnomaly: 120.4689,
      ascendingNode: 339.8014,
    },
    {
      satelliteId: '48274',
      satelliteName: 'CSS (TIANHE)',
      line1: '1 48274U 21035A   24001.50000000  .00020000  00000-0  30000-3 0  9990',
      line2: '2 48274  41.4700 100.0000 0001000  90.0000 270.0000 15.60000000100000',
      epochYear: 24,
      epochDay: 1.5,
      epochTime: cssEpoch.toISOString(),
      meanMotion: 15.6,
      inclination: 41.47,
      eccentricity: 0.0001,
      argumentOfPerigee: 90.0,
      meanAnomaly: 270.0,
      ascendingNode: 100.0,
    },
  ];
}
