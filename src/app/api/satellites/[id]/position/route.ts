import { NextResponse } from 'next/server';
import { fetchSatellitePosition } from '../../../_lib/celestrak';

/**
 * GET /api/satellites/[id]/position
 * Current position of a specific satellite via server-side propagation.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const position = await fetchSatellitePosition(id, new Date());

    if (!position) {
      return NextResponse.json(
        { status: 'error', message: `Satellite ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: {
        satelliteId: id,
        ...position,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch satellite position',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
