import { NextResponse } from 'next/server';
import { fetchXrayFlux } from '../../_lib/weather';

export async function GET(_request: Request) {
  try {
    const data = await fetchXrayFlux();

    return NextResponse.json({
      status: 'success',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch X-ray flux data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
