/**
 * GET /api/launches
 * Return all upcoming launches
 */

import { NextResponse } from 'next/server';
import { fetchUpcomingLaunches } from '../_lib/launches';

export async function GET(_request: Request) {
  try {
    const launches = await fetchUpcomingLaunches();

    return NextResponse.json({
      status: 'success',
      data: launches,
      count: launches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/launches] Error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch launches',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
