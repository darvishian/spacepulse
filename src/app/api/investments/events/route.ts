import { NextResponse } from 'next/server';
import { fetchRecentInvestmentEvents } from '../../_lib/investments';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Invalid days parameter',
        },
        { status: 400 }
      );
    }

    const data = await fetchRecentInvestmentEvents(days);

    return NextResponse.json({
      status: 'success',
      data,
      count: data.length,
      query: { days },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch investment events',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
