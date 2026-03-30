import { NextResponse } from 'next/server';
import { fetchWeatherAlerts } from '../../_lib/weather';

export async function GET(_request: Request) {
  try {
    const data = await fetchWeatherAlerts();

    return NextResponse.json({
      status: 'success',
      data,
      count: data.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch weather alerts',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
