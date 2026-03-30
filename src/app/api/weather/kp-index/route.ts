import { NextResponse } from 'next/server';
import { fetchKpIndex } from '../../_lib/weather';

export async function GET(_request: Request) {
  try {
    const data = await fetchKpIndex();

    return NextResponse.json({
      status: 'success',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch Kp index data',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
