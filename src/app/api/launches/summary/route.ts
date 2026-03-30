/**
 * GET /api/launches/summary
 * Return lightweight launch summaries for dashboard list views
 */

import { NextResponse } from 'next/server';
import { getLaunchSummary } from '../../_lib/launches';

export async function GET(_request: Request) {
  try {
    const summaries = await getLaunchSummary();

    return NextResponse.json({
      status: 'success',
      data: summaries,
      count: summaries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/launches/summary] Error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch launch summary',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
