import axios from 'axios';
import { Launch, LaunchProvider, LaunchStatus } from '../types/launch';
import { Constellation, OrbitType } from '../types/satellite';
import config from '../config';
import { getCache } from '../cache';
import celestrakService from './celestrak.service';

/**
 * SpaceX Service
 * Provides SpaceX-specific data by combining SpaceX API v4 with Celestrak TLE data.
 *
 * NOTE: General launch fetching (including SpaceX launches) is handled by
 * launches.service.ts which already integrates SpaceX API v4 as an enrichment
 * source alongside RocketLaunch.Live. This service provides SpaceX-specific
 * extras: Starlink constellation stats derived from Celestrak TLEs.
 */

const cache = getCache();

/**
 * Fetch SpaceX launches from the SpaceX API v4.
 * In practice, launches.service.ts handles this via dual-source aggregation.
 * This function is kept for direct SpaceX-only queries.
 */
export async function fetchSpacexLaunches(): Promise<Launch[]> {
  try {
    const cacheKey = 'launches_spacex';
    const cached = await cache.get<Launch[]>(cacheKey);
    if (cached) return cached;

    const response = await axios.get(`${config.spacexApiUrl}/launches/upcoming`, {
      timeout: 10000,
    });

    const launchpadsResponse = await axios.get(`${config.spacexApiUrl}/launchpads`, {
      timeout: 10000,
    });
    const launchpads = new Map<string, any>(
      launchpadsResponse.data.map((lp: any) => [lp.id, lp]),
    );

    const launches: Launch[] = response.data
      .slice(0, 10)
      .map((raw: any) => mapSpaceXLaunchToLaunch(raw, launchpads))
      .filter((l: Launch | null): l is Launch => l !== null);

    await cache.set(cacheKey, launches, config.cacheTtlLaunches);
    return launches;
  } catch (error) {
    console.error('[SpaceXService] Error fetching SpaceX launches:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Fetch Starlink constellation data by querying Celestrak TLEs.
 * Derives live satellite counts from actual TLE records.
 */
export async function fetchStarlinkConstellation(): Promise<Constellation | null> {
  try {
    const cacheKey = 'constellation_starlink';
    const cached = await cache.get<Constellation>(cacheKey);
    if (cached) return cached;

    // Use Celestrak TLE data for live Starlink satellite counts
    const tles = await celestrakService.fetchConstellationTles('starlink');
    const activeSatellites = tles.length;

    const constellation: Constellation = {
      id: 'starlink',
      name: 'Starlink',
      operatorName: 'SpaceX',
      purpose: 'Global broadband internet coverage',
      orbitType: OrbitType.LEO,
      satellites: [],
      totalSatellites: activeSatellites,
      activeSatellites,
      launchDate: new Date('2019-05-23'),
      website: 'https://www.starlink.com',
    };

    await cache.set(cacheKey, constellation, config.cacheTtlTle);
    return constellation;
  } catch (error) {
    console.error('[SpaceXService] Error fetching Starlink constellation:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Map SpaceX API v4 launch response to our Launch format.
 */
function mapSpaceXLaunchToLaunch(
  raw: any,
  launchpads: Map<string, any>,
): Launch | null {
  try {
    const launchpad = launchpads.get(raw.launchpad);

    return {
      id: `spacex-${raw.id}`,
      name: raw.name || 'Unknown SpaceX Mission',
      provider: LaunchProvider.SPACEX,
      scheduledTime: new Date(raw.date_utc),
      launchWindow: {
        start: new Date(raw.date_utc),
        end: new Date(new Date(raw.date_utc).getTime() + 4 * 60 * 60 * 1000), // +4h window
      },
      location: {
        id: raw.launchpad || 'unknown',
        name: launchpad?.full_name || launchpad?.name || 'Unknown Site',
        country: launchpad?.locality ? 'USA' : 'Unknown',
        latitude: launchpad?.latitude || 28.3922,
        longitude: launchpad?.longitude || -80.6077,
      },
      vehicle: {
        id: 'falcon9',
        name: 'Falcon 9',
        type: 'orbital',
        family: 'Falcon',
      },
      payloads: (raw.payloads || []).map((pid: string, idx: number) => ({
        id: pid,
        name: `Payload ${idx + 1}`,
        type: 'satellite',
        orbit: 'LEO',
      })),
      status: raw.date_precision === 'hour' ? LaunchStatus.GO : LaunchStatus.TBD,
      missionDescription: raw.details || `SpaceX mission: ${raw.name}`,
      webcastUrl: raw.links?.webcast || undefined,
      apiUrl: `https://api.spacexdata.com/v4/launches/${raw.id}`,
      lastUpdated: new Date(),
    };
  } catch {
    return null;
  }
}

export default {
  fetchSpacexLaunches,
  fetchStarlinkConstellation,
};
