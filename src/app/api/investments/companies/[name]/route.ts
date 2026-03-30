import { NextResponse } from 'next/server';
import { fetchCompanyProfile } from '../../../_lib/investments';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { status: 'error', message: 'Company name is required' },
        { status: 400 }
      );
    }

    const profile = await fetchCompanyProfile(name);

    if (!profile) {
      return NextResponse.json(
        { status: 'error', message: `Company ${name} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'success',
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to fetch company profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
