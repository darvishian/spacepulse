import { NextRequest, NextResponse } from 'next/server';
import { fetchConstellationTles } from '../../_lib/celestrak';

/** Known constellations with static metadata. */
const CONSTELLATION_META: Record<
  string,
  { name: string; operator: string; purpose: string; orbitType: string; website: string }
> = {
  starlink: {
    name: 'Starlink',
    operator: 'SpaceX',
    purpose: 'Broadband internet',
    orbitType: 'leo',
    website: 'https://www.starlink.com',
  },
  oneweb: {
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    purpose: 'Broadband internet',
    orbitType: 'leo',
    website: 'https://oneweb.net',
  },
  iridium: {
    name: 'Iridium NEXT',
    operator: 'Iridium Communications',
    purpose: 'Mobile communications',
    orbitType: 'leo',
    website: 'https://www.iridium.com',
  },
  globalstar: {
    name: 'Globalstar',
    operator: 'Globalstar Inc.',
    purpose: 'Mobile communications',
    orbitType: 'leo',
    website: 'https://www.globalstar.com',
  },
  gps: {
    name: 'GPS',
    operator: 'US Space Force',
    purpose: 'Navigation',
    orbitType: 'meo',
    website: 'https://www.gps.gov',
  },
  glonass: {
    name: 'GLONASS',
    operator: 'Roscosmos',
    purpose: 'Navigation',
    orbitType: 'meo',
    website: 'https://www.glonass-iac.ru',
  },
  galileo: {
    name: 'Galileo',
    operator: 'European Space Agency',
    purpose: 'Navigation',
    orbitType: 'meo',
    website: 'https://www.gsc-europa.eu',
  },
  planet: {
    name: 'Planet Labs',
    operator: 'Planet Labs PBC',
    purpose: 'Earth observation',
    orbitType: 'leo',
    website: 'https://www.planet.com',
  },
  spire: {
    name: 'Spire',
    operator: 'Spire Global',
    purpose: 'Weather & maritime tracking',
    orbitType: 'leo',
    website: 'https://spire.com',
  },
  telesat: {
    name: 'Telesat',
    operator: 'Telesat',
    purpose: 'Broadband internet',
    orbitType: 'leo',
    website: 'https://www.telesat.com',
  },
};

/**
 * GET /api/satellites/constellations
 * Returns metadata for all known constellations with live satellite counts from Celestrak.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const constellations = await Promise.all(
      Object.entries(CONSTELLATION_META).map(async ([key, meta]) => {
        // Fetch real TLE count for each constellation
        let satelliteCount = 0;
        try {
          const tles = await fetchConstellationTles(key);
          satelliteCount = tles.length;
        } catch {
          // If fetch fails, count stays 0
        }

        return {
          id: key,
          name: meta.name,
          operator: meta.operator,
          purpose: meta.purpose,
          orbitType: meta.orbitType,
          satelliteCount,
          website: meta.website,
        };
      })
    );

    return NextResponse.json(
      {
        status: 'success',
        data: constellations,
        count: constellations.length,
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch constellations',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
