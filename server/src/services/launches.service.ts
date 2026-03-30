import axios from 'axios';
import { Launch, LaunchProvider, LaunchStatus, LaunchSummary, LaunchSite } from '../types/launch';
import config from '../config';
import { getCache } from '../cache';

/**
 * Launches Service
 * Dual-source: RocketLaunch.Live (primary) + SpaceX API (enrichment) + mock fallback.
 */

const cache = getCache();

// ── Well-known launch-site coordinates ───────────────────────────────────
// Free APIs rarely include lat/lon, so we maintain a lookup table.
const KNOWN_SITES: Record<string, { latitude: number; longitude: number; country: string }> = {
  'cape canaveral':       { latitude: 28.3922, longitude: -80.6077, country: 'USA' },
  'kennedy space center': { latitude: 28.5721, longitude: -80.6480, country: 'USA' },
  'vandenberg':           { latitude: 34.7420, longitude: -120.5724, country: 'USA' },
  'boca chica':           { latitude: 25.9972, longitude: -97.1560, country: 'USA' },
  'starbase':             { latitude: 25.9972, longitude: -97.1560, country: 'USA' },
  'wallops':              { latitude: 37.9402, longitude: -75.4664, country: 'USA' },
  'kourou':               { latitude: 5.2360, longitude: -52.7686, country: 'French Guiana' },
  'baikonur':             { latitude: 45.6200, longitude: 63.3050, country: 'Kazakhstan' },
  'vostochny':            { latitude: 51.8840, longitude: 128.3340, country: 'Russia' },
  'plesetsk':             { latitude: 62.9271, longitude: 40.5777, country: 'Russia' },
  'jiuquan':              { latitude: 40.9583, longitude: 100.2910, country: 'China' },
  'xichang':              { latitude: 28.2463, longitude: 102.0263, country: 'China' },
  'wenchang':             { latitude: 19.6145, longitude: 110.9510, country: 'China' },
  'taiyuan':              { latitude: 38.8490, longitude: 111.6080, country: 'China' },
  'tanegashima':          { latitude: 30.4010, longitude: 130.9755, country: 'Japan' },
  'sriharikota':          { latitude: 13.7330, longitude: 80.2353, country: 'India' },
  'mahia':                { latitude: -39.2615, longitude: 177.8649, country: 'New Zealand' },
  'alcantara':            { latitude: -2.3730, longitude: -44.3964, country: 'Brazil' },
  'kodiak':               { latitude: 57.4358, longitude: -152.3378, country: 'USA' },
  'mid-atlantic':         { latitude: 37.8337, longitude: -75.4881, country: 'USA' },
  'semnan':               { latitude: 35.2345, longitude: 53.9210, country: 'Iran' },
  'palmachim':            { latitude: 31.8840, longitude: 34.6830, country: 'Israel' },
  'naro':                 { latitude: 34.4316, longitude: 127.5350, country: 'South Korea' },
};

function lookupSiteCoordinates(
  siteName: string
): { latitude: number; longitude: number; country: string } | null {
  const lower = siteName.toLowerCase();
  for (const [key, value] of Object.entries(KNOWN_SITES)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

// ── Provider identification ─────────────────────────────────────────────
function identifyProvider(providerName: string): LaunchProvider {
  const lower = providerName.toLowerCase();
  if (lower.includes('spacex')) return LaunchProvider.SPACEX;
  if (lower.includes('rocket lab')) return LaunchProvider.ROCKET_LAB;
  if (lower.includes('blue origin')) return LaunchProvider.BLUE_ORIGIN;
  if (lower.includes('ula') || lower.includes('united launch')) return LaunchProvider.ULA;
  if (lower.includes('arianespace') || lower.includes('esa')) return LaunchProvider.ARIANESPACE;
  if (lower.includes('roscosmos')) return LaunchProvider.ROSCOSMOS;
  if (lower.includes('isro')) return LaunchProvider.ISRO;
  if (lower.includes('casc') || lower.includes('china')) return LaunchProvider.CASC;
  if (lower.includes('jaxa')) return LaunchProvider.JAXA;
  return LaunchProvider.OTHER;
}

// ── Status mapping ──────────────────────────────────────────────────────
function mapRllStatus(statusId: number): LaunchStatus {
  // RocketLaunch.Live status IDs (approximate mapping):
  // 1 = Go, 2 = TBD, 3 = Success, 4 = Failure, 5 = Hold, 6 = In Flight, 8 = TBC
  switch (statusId) {
    case 1: return LaunchStatus.GO;
    case 2: return LaunchStatus.TBD;
    case 3: return LaunchStatus.SUCCESS;
    case 4: return LaunchStatus.FAILURE;
    case 5: return LaunchStatus.HOLD;
    case 6: return LaunchStatus.IN_FLIGHT;
    case 8: return LaunchStatus.TBD;
    default: return LaunchStatus.UNKNOWN;
  }
}

// ── RocketLaunch.Live types ─────────────────────────────────────────────
interface RllLaunch {
  id: number;
  cospar_id?: string;
  sort_date: string;
  name: string;
  provider?: { id: number; name: string; slug?: string };
  vehicle?: { id: number; name: string; company_id?: number; slug?: string };
  pad?: {
    id: number;
    name: string;
    location?: {
      id: number;
      name: string;
      state?: string;
      statename?: string;
      country?: string;
      slug?: string;
    };
  };
  missions?: Array<{
    id: number;
    name: string;
    description?: string;
  }>;
  launch_description?: string;
  win_open?: string;
  win_close?: string;
  date_str?: string;
  tags?: Array<{ id: number; text: string }>;
  slug?: string;
  weather_summary?: string | null;
  quicktext?: string;
  result?: number;     // status code
  modified?: string;
}

interface RllApiResponse {
  valid_auth: boolean;
  count: number;
  limit: number;
  total: number;
  last_page: number;
  result: RllLaunch[];
}

// ── SpaceX v4 types ─────────────────────────────────────────────────────
interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  date_precision: string;
  upcoming: boolean;
  success?: boolean | null;
  details?: string | null;
  flight_number: number;
  rocket?: string;
  launchpad?: string;
  payloads?: string[];
  links?: {
    webcast?: string | null;
    wikipedia?: string | null;
    article?: string | null;
    patch?: { small?: string | null; large?: string | null };
  };
  cores?: Array<{
    landing_attempt?: boolean;
    landing_success?: boolean | null;
    reused?: boolean;
  }>;
}

interface SpaceXLaunchpad {
  id: string;
  name: string;
  full_name: string;
  locality: string;
  region: string;
  latitude: number;
  longitude: number;
}

// ── Fetch from RocketLaunch.Live ────────────────────────────────────────
async function fetchRocketLaunchLive(mode: 'next' | 'previous', count: number = 10): Promise<Launch[]> {
  const url = `https://fdo.rocketlaunch.live/json/launches/${mode}/${count}`;

  console.log(`[LaunchesService] Fetching ${mode} ${count} from RocketLaunch.Live...`);
  const response = await axios.get<RllApiResponse>(url, { timeout: 15000 });

  if (!response.data || !response.data.result) {
    console.warn('[LaunchesService] RocketLaunch.Live returned empty result');
    return [];
  }

  return response.data.result.map((rll): Launch => {
    const providerName = rll.provider?.name ?? 'Unknown';
    const locationName = rll.pad?.location?.name ?? rll.pad?.name ?? 'Unknown';
    const coords = lookupSiteCoordinates(locationName);

    const site: LaunchSite = {
      id: `rll-pad-${rll.pad?.id ?? 0}`,
      name: locationName,
      country: coords?.country ?? rll.pad?.location?.country ?? 'Unknown',
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    };

    // Parse mission info from the launch name (format: "Vehicle | Mission")
    const nameParts = rll.name.split(' | ');
    const vehicleName = nameParts[0]?.trim() ?? rll.vehicle?.name ?? 'Unknown';
    const missionName = nameParts[1]?.trim() ?? rll.name;

    const scheduledTime = new Date(rll.sort_date);

    // Determine status: for past launches check result, for future use sort_date
    let status: LaunchStatus;
    if (rll.result !== undefined && rll.result !== null) {
      status = mapRllStatus(rll.result);
    } else if (scheduledTime.getTime() < Date.now()) {
      status = LaunchStatus.UNKNOWN;
    } else {
      status = LaunchStatus.GO;
    }

    return {
      id: `rll-${rll.id}`,
      name: missionName,
      provider: identifyProvider(providerName),
      scheduledTime,
      launchWindow: rll.win_open
        ? {
            start: new Date(rll.win_open),
            end: rll.win_close ? new Date(rll.win_close) : new Date(rll.win_open),
          }
        : undefined,
      location: site,
      vehicle: {
        id: `rll-vehicle-${rll.vehicle?.id ?? 0}`,
        name: vehicleName,
        type: 'orbital',
        family: rll.vehicle?.name,
      },
      payloads: rll.missions
        ? rll.missions.map((m) => ({
            id: `rll-mission-${m.id}`,
            name: m.name,
            type: m.description ?? 'Unknown',
          }))
        : [],
      status,
      missionDescription: rll.launch_description ?? rll.quicktext ?? undefined,
      lastUpdated: new Date(),
    };
  });
}

// ── Fetch from SpaceX API v4 ────────────────────────────────────────────
// Cached launchpad data to avoid repeated calls
let spacexLaunchpads: SpaceXLaunchpad[] | null = null;

async function getSpacexLaunchpads(): Promise<SpaceXLaunchpad[]> {
  if (spacexLaunchpads) return spacexLaunchpads;
  try {
    const response = await axios.get<SpaceXLaunchpad[]>(
      `${config.spacexApiUrl}/launchpads`,
      { timeout: 10000 }
    );
    spacexLaunchpads = response.data;
    return spacexLaunchpads;
  } catch {
    return [];
  }
}

async function fetchSpacexLaunches(mode: 'upcoming' | 'past'): Promise<Launch[]> {
  const url = `${config.spacexApiUrl}/launches/${mode}`;

  console.log(`[LaunchesService] Fetching SpaceX ${mode} launches...`);
  const response = await axios.get<SpaceXLaunch[]>(url, { timeout: 10000 });

  if (!response.data || !Array.isArray(response.data)) {
    return [];
  }

  const pads = await getSpacexLaunchpads();
  const padMap = new Map(pads.map((p) => [p.id, p]));

  return response.data.map((sx): Launch => {
    const pad = sx.launchpad ? padMap.get(sx.launchpad) : undefined;
    const coords = pad
      ? { latitude: pad.latitude, longitude: pad.longitude }
      : lookupSiteCoordinates('cape canaveral');

    const site: LaunchSite = {
      id: sx.launchpad ?? 'unknown',
      name: pad?.full_name ?? pad?.name ?? 'Unknown',
      country: 'USA',
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    };

    let status: LaunchStatus;
    if (sx.upcoming) {
      status = LaunchStatus.GO;
    } else if (sx.success === true) {
      status = LaunchStatus.SUCCESS;
    } else if (sx.success === false) {
      status = LaunchStatus.FAILURE;
    } else {
      status = LaunchStatus.UNKNOWN;
    }

    return {
      id: `spacex-${sx.id}`,
      name: sx.name,
      provider: LaunchProvider.SPACEX,
      scheduledTime: new Date(sx.date_utc),
      location: site,
      vehicle: {
        id: sx.rocket ?? 'unknown',
        name: 'Falcon 9', // Most SpaceX launches; could resolve rocket ID
        type: 'orbital',
        family: 'Falcon',
      },
      payloads: [],
      status,
      missionDescription: sx.details ?? undefined,
      webcastUrl: sx.links?.webcast ?? undefined,
      lastUpdated: new Date(),
    };
  });
}

// ── Mock data fallback ──────────────────────────────────────────────────
function getMockUpcomingLaunches(): Launch[] {
  const now = Date.now();
  return [
    {
      id: 'mock-001',
      name: 'Starlink Group 12-3',
      provider: LaunchProvider.SPACEX,
      scheduledTime: new Date(now + 2 * 24 * 60 * 60 * 1000),
      launchWindow: {
        start: new Date(now + 2 * 24 * 60 * 60 * 1000),
        end: new Date(now + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      },
      location: { id: 'site-cc', name: 'Cape Canaveral SFS, FL', country: 'USA', latitude: 28.3922, longitude: -80.6077 },
      vehicle: { id: 'f9', name: 'Falcon 9 Block 5', type: 'orbital', family: 'Falcon' },
      payloads: [{ id: 'sl-12-3', name: 'Starlink Group 12-3', type: 'satellite constellation', mass: 17400, orbit: 'LEO' }],
      status: LaunchStatus.GO,
      probability: 95,
      missionDescription: 'Deploy 23 Starlink V2 Mini satellites to low Earth orbit.',
      webcastUrl: 'https://www.youtube.com/@SpaceX',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-002',
      name: 'NROL-186',
      provider: LaunchProvider.ULA,
      scheduledTime: new Date(now + 5 * 24 * 60 * 60 * 1000),
      location: { id: 'site-vafb', name: 'Vandenberg SFB, CA', country: 'USA', latitude: 34.7420, longitude: -120.5724 },
      vehicle: { id: 'vulcan', name: 'Vulcan Centaur', type: 'orbital', family: 'Vulcan' },
      payloads: [{ id: 'nrol-186', name: 'NROL-186', type: 'national security', orbit: 'classified' }],
      status: LaunchStatus.GO,
      missionDescription: 'National Reconnaissance Office mission.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-003',
      name: 'Electron · Kinéis 6',
      provider: LaunchProvider.ROCKET_LAB,
      scheduledTime: new Date(now + 8 * 24 * 60 * 60 * 1000),
      location: { id: 'site-mahia', name: 'Onenui Station, Mahia Peninsula', country: 'New Zealand', latitude: -39.2615, longitude: 177.8649 },
      vehicle: { id: 'electron', name: 'Electron', type: 'orbital', family: 'Electron' },
      payloads: [{ id: 'kineis-6', name: 'Kinéis 6', type: 'IoT constellation', orbit: 'LEO' }],
      status: LaunchStatus.TBD,
      missionDescription: 'Deploy Kinéis IoT constellation satellites.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-004',
      name: 'CZ-5B · Wentian Module',
      provider: LaunchProvider.CASC,
      scheduledTime: new Date(now + 12 * 24 * 60 * 60 * 1000),
      location: { id: 'site-wenchang', name: 'Wenchang Space Launch Site', country: 'China', latitude: 19.6145, longitude: 110.9510 },
      vehicle: { id: 'cz5b', name: 'Long March 5B', type: 'orbital', family: 'Long March' },
      payloads: [{ id: 'wentian', name: 'Wentian Lab Module', type: 'space station module', mass: 23000, orbit: 'LEO' }],
      status: LaunchStatus.GO,
      missionDescription: 'Chinese Space Station module delivery.',
      lastUpdated: new Date(),
    },
  ];
}

function getMockRecentLaunches(): Launch[] {
  const now = Date.now();
  return [
    {
      id: 'mock-past-001',
      name: 'Starlink Group 11-7',
      provider: LaunchProvider.SPACEX,
      scheduledTime: new Date(now - 1 * 24 * 60 * 60 * 1000),
      location: { id: 'site-cc', name: 'Cape Canaveral SFS, FL', country: 'USA', latitude: 28.3922, longitude: -80.6077 },
      vehicle: { id: 'f9', name: 'Falcon 9 Block 5', type: 'orbital', family: 'Falcon' },
      payloads: [{ id: 'sl-11-7', name: 'Starlink Group 11-7', type: 'satellite constellation', mass: 17400, orbit: 'LEO' }],
      status: LaunchStatus.SUCCESS,
      missionDescription: 'Deployed 23 Starlink V2 Mini satellites. Booster landed on ASDS.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-past-002',
      name: 'OneWeb #20',
      provider: LaunchProvider.ARIANESPACE,
      scheduledTime: new Date(now - 3 * 24 * 60 * 60 * 1000),
      location: { id: 'site-kourou', name: 'Guiana Space Centre, Kourou', country: 'French Guiana', latitude: 5.2360, longitude: -52.7686 },
      vehicle: { id: 'ariane6', name: 'Ariane 6', type: 'orbital', family: 'Ariane' },
      payloads: [{ id: 'ow-20', name: 'OneWeb #20', type: 'satellite constellation', mass: 6000, orbit: 'LEO' }],
      status: LaunchStatus.SUCCESS,
      missionDescription: 'Deployed 36 OneWeb broadband satellites.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-past-003',
      name: 'GPS III SV07',
      provider: LaunchProvider.ULA,
      scheduledTime: new Date(now - 5 * 24 * 60 * 60 * 1000),
      location: { id: 'site-cc', name: 'Cape Canaveral SFS, FL', country: 'USA', latitude: 28.3922, longitude: -80.6077 },
      vehicle: { id: 'vulcan', name: 'Vulcan Centaur', type: 'orbital', family: 'Vulcan' },
      payloads: [{ id: 'gps-iii-7', name: 'GPS III SV07', type: 'navigation satellite', mass: 4400, orbit: 'MEO' }],
      status: LaunchStatus.SUCCESS,
      missionDescription: 'GPS III Space Vehicle 07 to medium Earth orbit.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-past-004',
      name: 'Transporter-12',
      provider: LaunchProvider.SPACEX,
      scheduledTime: new Date(now - 7 * 24 * 60 * 60 * 1000),
      location: { id: 'site-vafb', name: 'Vandenberg SFB, CA', country: 'USA', latitude: 34.7420, longitude: -120.5724 },
      vehicle: { id: 'f9', name: 'Falcon 9 Block 5', type: 'orbital', family: 'Falcon' },
      payloads: [{ id: 'trans-12', name: 'Transporter-12 Rideshare', type: 'rideshare', orbit: 'SSO' }],
      status: LaunchStatus.SUCCESS,
      missionDescription: 'Dedicated rideshare mission deploying multiple small satellites to SSO.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-past-005',
      name: 'Electron · BlackSky',
      provider: LaunchProvider.ROCKET_LAB,
      scheduledTime: new Date(now - 9 * 24 * 60 * 60 * 1000),
      location: { id: 'site-mahia', name: 'Onenui Station, Mahia Peninsula', country: 'New Zealand', latitude: -39.2615, longitude: 177.8649 },
      vehicle: { id: 'electron', name: 'Electron', type: 'orbital', family: 'Electron' },
      payloads: [{ id: 'bsky-2', name: 'BlackSky Gen-3', type: 'Earth observation', orbit: 'LEO' }],
      status: LaunchStatus.SUCCESS,
      missionDescription: 'Deployed two BlackSky Gen-3 Earth observation satellites.',
      lastUpdated: new Date(),
    },
    {
      id: 'mock-past-006',
      name: 'Soyuz MS-27',
      provider: LaunchProvider.ROSCOSMOS,
      scheduledTime: new Date(now - 10 * 24 * 60 * 60 * 1000),
      location: { id: 'site-baikonur', name: 'Baikonur Cosmodrome', country: 'Kazakhstan', latitude: 45.6200, longitude: 63.3050 },
      vehicle: { id: 'soyuz', name: 'Soyuz 2.1a', type: 'orbital', family: 'Soyuz' },
      payloads: [{ id: 'ms27', name: 'Soyuz MS-27 Crew', type: 'crewed mission', orbit: 'LEO' }],
      status: LaunchStatus.SUCCESS,
      missionDescription: 'ISS crew rotation mission carrying 3 cosmonauts.',
      lastUpdated: new Date(),
    },
  ];
}

// ── Deduplicate by matching name similarity ─────────────────────────────
function deduplicateLaunches(primary: Launch[], secondary: Launch[]): Launch[] {
  const merged = [...primary];
  const primaryNames = new Set(primary.map((l) => l.name.toLowerCase()));

  for (const sx of secondary) {
    // Skip if a launch with a very similar name already exists
    const lowerName = sx.name.toLowerCase();
    const isDuplicate = Array.from(primaryNames).some(
      (pn) => pn.includes(lowerName) || lowerName.includes(pn)
    );
    if (!isDuplicate) {
      merged.push(sx);
    } else {
      // Enrich existing launch with SpaceX data (webcast URL, etc.)
      const existing = merged.find(
        (l) => l.name.toLowerCase().includes(lowerName) || lowerName.includes(l.name.toLowerCase())
      );
      if (existing && sx.webcastUrl && !existing.webcastUrl) {
        existing.webcastUrl = sx.webcastUrl;
      }
    }
  }

  return merged;
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Fetch upcoming launches from all providers.
 * Strategy: RocketLaunch.Live primary → SpaceX enrichment → mock fallback.
 */
export async function fetchUpcomingLaunches(): Promise<Launch[]> {
  try {
    const cacheKey = 'launches_upcoming';
    const cached = await cache.get<Launch[]>(cacheKey);

    if (cached) {
      return cached;
    }

    let rllLaunches: Launch[] = [];
    let spacexLaunches: Launch[] = [];

    // Primary: RocketLaunch.Live
    try {
      rllLaunches = await fetchRocketLaunchLive('next', 15);
      console.log(`[LaunchesService] RocketLaunch.Live: ${rllLaunches.length} upcoming`);
    } catch (error) {
      console.warn('[LaunchesService] RocketLaunch.Live failed:', (error as Error).message);
    }

    // Secondary: SpaceX enrichment
    try {
      spacexLaunches = await fetchSpacexLaunches('upcoming');
      console.log(`[LaunchesService] SpaceX API: ${spacexLaunches.length} upcoming`);
    } catch (error) {
      console.warn('[LaunchesService] SpaceX API failed:', (error as Error).message);
    }

    let allLaunches: Launch[];

    if (rllLaunches.length > 0) {
      allLaunches = deduplicateLaunches(rllLaunches, spacexLaunches);
    } else if (spacexLaunches.length > 0) {
      allLaunches = spacexLaunches;
    } else {
      console.warn('[LaunchesService] Both APIs failed, using mock data');
      allLaunches = getMockUpcomingLaunches();
    }

    // Sort by scheduled time ascending
    allLaunches.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    await cache.set(cacheKey, allLaunches, config.cacheTtlLaunches);
    return allLaunches;
  } catch (error) {
    console.error('[LaunchesService] Error fetching upcoming launches:', error);
    return getMockUpcomingLaunches();
  }
}

/**
 * Fetch recent launches (last N days).
 * Strategy: RocketLaunch.Live primary → SpaceX fallback → mock fallback.
 */
export async function fetchRecentLaunches(days: number = 30): Promise<Launch[]> {
  try {
    const cacheKey = `launches_recent_${days}d`;
    const cached = await cache.get<Launch[]>(cacheKey);

    if (cached) {
      return cached;
    }

    let rllLaunches: Launch[] = [];
    let spacexLaunches: Launch[] = [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Primary: RocketLaunch.Live past launches
    try {
      rllLaunches = await fetchRocketLaunchLive('previous', 15);
      rllLaunches = rllLaunches.filter((l) => l.scheduledTime >= cutoff);
      console.log(`[LaunchesService] RocketLaunch.Live: ${rllLaunches.length} recent (within ${days}d)`);
    } catch (error) {
      console.warn('[LaunchesService] RocketLaunch.Live (recent) failed:', (error as Error).message);
    }

    // Secondary: SpaceX past launches
    try {
      spacexLaunches = await fetchSpacexLaunches('past');
      spacexLaunches = spacexLaunches
        .filter((l) => l.scheduledTime >= cutoff)
        .slice(-10); // Only keep the most recent 10
      console.log(`[LaunchesService] SpaceX API: ${spacexLaunches.length} recent`);
    } catch (error) {
      console.warn('[LaunchesService] SpaceX API (recent) failed:', (error as Error).message);
    }

    let allLaunches: Launch[];

    if (rllLaunches.length > 0) {
      allLaunches = deduplicateLaunches(rllLaunches, spacexLaunches);
    } else if (spacexLaunches.length > 0) {
      allLaunches = spacexLaunches;
    } else {
      console.warn('[LaunchesService] Both APIs failed for recent, using mock data');
      allLaunches = getMockRecentLaunches();
    }

    // Sort by scheduled time descending (most recent first)
    allLaunches.sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());

    await cache.set(cacheKey, allLaunches, config.cacheTtlLaunches);
    return allLaunches;
  } catch (error) {
    console.error('[LaunchesService] Error fetching recent launches:', error);
    return getMockRecentLaunches();
  }
}

/**
 * Fetch a specific launch by ID.
 * Searches both upcoming and recent caches, then tries API.
 */
export async function fetchLaunchById(launchId: string): Promise<Launch | null> {
  try {
    const cacheKey = `launch_${launchId}`;
    const cached = await cache.get<Launch>(cacheKey);

    if (cached) {
      return cached;
    }

    // Search in upcoming
    const upcoming = await fetchUpcomingLaunches();
    const found = upcoming.find((l) => l.id === launchId);
    if (found) {
      await cache.set(cacheKey, found, config.cacheTtlLaunches);
      return found;
    }

    // Search in recent
    const recent = await fetchRecentLaunches(30);
    const foundRecent = recent.find((l) => l.id === launchId);
    if (foundRecent) {
      await cache.set(cacheKey, foundRecent, config.cacheTtlLaunches);
      return foundRecent;
    }

    return null;
  } catch (error) {
    console.error(`[LaunchesService] Error fetching launch ${launchId}:`, error);
    return null;
  }
}

/**
 * Format launch data as CZML for globe visualization.
 */
export function formatLaunchForCzml(launch: Launch): object {
  return {
    id: launch.id,
    name: launch.name,
    description: launch.missionDescription,
    position: {
      cartographicDegrees: [
        launch.location.longitude ?? 0,
        launch.location.latitude ?? 0,
        0,
      ],
    },
    point: {
      pixelSize: 10,
      color: { rgba: [255, 107, 53, 255] }, // #ff6b35 warning orange
    },
  };
}

/**
 * Get launch summary for dashboard.
 * Returns lightweight summaries for list views.
 */
export async function getLaunchSummary(): Promise<LaunchSummary[]> {
  const launches = await fetchUpcomingLaunches();
  return launches.map((launch) => ({
    id: launch.id,
    name: launch.name,
    provider: launch.provider,
    scheduledTime: launch.scheduledTime,
    location: launch.location.name,
    vehicle: launch.vehicle.name,
    status: launch.status,
  }));
}

export default {
  fetchUpcomingLaunches,
  fetchRecentLaunches,
  fetchLaunchById,
  formatLaunchForCzml,
  getLaunchSummary,
};
