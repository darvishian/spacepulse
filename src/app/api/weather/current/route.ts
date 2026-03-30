import { NextResponse } from 'next/server';
import { fetchSpaceWeather } from '../../_lib/weather';

export async function GET(_request: Request) {
  try {
    const data = await fetchSpaceWeather();

    return NextResponse.json({
      status: 'success',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch space weather data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
