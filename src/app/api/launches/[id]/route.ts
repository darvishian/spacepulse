/**
 * GET /api/launches/[id]
 * Return a single launch by ID
 */

import { NextResponse } from 'next/server';
import { fetchLaunchById } from '../../_lib/launches';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { status: 'error', message: 'Invalid launch ID' },
        { status: 400 }
      );
    }

    const launch = await fetchLaunchById(id);

    if (!launch) {
      return NextResponse.json(
        { status: 'error', message: `Launch with ID "${id}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: launch,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/launches/[id]] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch launch',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
