import { NextResponse } from 'next/server';
import { getFundingTrends } from '../../_lib/investments';

export async function GET(_request: Request) {
  try {
    const data = await getFundingTrends();

    return NextResponse.json({
      status: 'success',
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch funding trends',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
