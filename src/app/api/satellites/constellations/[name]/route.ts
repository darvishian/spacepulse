import { NextResponse } from 'next/server';
import { fetchConstellationTles } from '../../../_lib/celestrak';

/** Known constellations with static metadata. */
const CONSTELLATION_META: Record<
  string,
  { name: string; operator: string; purpose: string; orbitType: string; website: string }
> = {
  starlink: { name: 'Starlink', operator: 'SpaceX', purpose: 'Broadband internet', orbitType: 'leo', website: 'https://www.starlink.com' },
  oneweb: { name: 'OneWeb', operator: 'Eutelsat OneWeb', purpose: 'Broadband internet', orbitType: 'leo', website: 'https://oneweb.net' },
  iridium: { name: 'Iridium NEXT', operator: 'Iridium Communications', purpose: 'Mobile communications', orbitType: 'leo', website: 'https://www.iridium.com' },
  globalstar: { name: 'Globalstar', operator: 'Globalstar Inc.', purpose: 'Mobile communications', orbitType: 'leo', website: 'https://www.globalstar.com' },
  gps: { name: 'GPS', operator: 'US Space Force', purpose: 'Navigation', orbitType: 'meo', website: 'https://www.gps.gov' },
  glonass: { name: 'GLONASS', operator: 'Roscosmos', purpose: 'Navigation', orbitType: 'meo', website: 'https://www.glonass-iac.ru' },
  galileo: { name: 'Galileo', operator: 'European Space Agency', purpose: 'Navigation', orbitType: 'meo', website: 'https://www.gsc-europa.eu' },
  planet: { name: 'Planet Labs', operator: 'Planet Labs PBC', purpose: 'Earth observation', orbitType: 'leo', website: 'https://www.planet.com' },
  spire: { name: 'Spire', operator: 'Spire Global', purpose: 'Weather & maritime tracking', orbitType: 'leo', website: 'https://spire.com' },
  telesat: { name: 'Telesat', operator: 'Telesat', purpose: 'Broadband internet', orbitType: 'leo', website: 'https://www.telesat.com' },
};

/**
 * GET /api/satellites/constellations/[name]
 * Detailed constellation info with full TLE list.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
): Promise<NextResponse> {
  try {
    const { name } = await params;
    const key = name.toLowerCase();
    const meta = CONSTELLATION_META[key];

    if (!meta) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Constellation "${name}" not found. Available: ${Object.keys(CONSTELLATION_META).join(', ')}`,
        },
        { status: 404 }
      );
    }

    const tles = await fetchConstellationTles(key);

    return NextResponse.json({
      status: 'success',
      data: {
        id: key,
        ...meta,
        totalSatellites: tles.length,
        activeSatellites: tles.length,
        satellites: tles.map((t) => ({
          id: t.satelliteId,
          name: t.satelliteName,
          status: 'active' as const,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch constellation details',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
