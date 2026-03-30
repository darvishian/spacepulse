import { NextRequest, NextResponse } from 'next/server';
import { fetchTleData, fetchConstellationTles } from '../../_lib/celestrak';

/**
 * GET /api/satellites/tle
 * Returns TLE records for satellites.
 * Optional ?constellation=<name> query parameter filters by constellation.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const constellation = searchParams.get('constellation');

    let tles;
    if (constellation) {
      tles = await fetchConstellationTles(constellation);
    } else {
      tles = await fetchTleData();
    }

    return NextResponse.json(
      {
        status: 'success',
        data: tles,
        count: tles.length,
        query: constellation ? { constellation } : {},
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch TLE data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
