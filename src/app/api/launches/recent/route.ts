/**
 * GET /api/launches/recent
 * Return recent launches (last N days, default 30)
 */

import { NextResponse } from 'next/server';
import { fetchRecentLaunches } from '../../_lib/launches';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid "days" parameter. Must be a positive integer.',
        },
        { status: 400 }
      );
    }

    const launches = await fetchRecentLaunches(days);

    return NextResponse.json({
      status: 'success',
      data: launches,
      count: launches.length,
      query: { days },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/launches/recent] Error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch recent launches',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
