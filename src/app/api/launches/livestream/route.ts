/**
 * GET /api/launches/livestream?query=<launch name>&webcastUrl=<optional>
 *
 * Search YouTube Data API v3 for live streams matching a launch name.
 * Returns up to 3 streams sorted by concurrent viewer count (highest first).
 *
 * This is the Vercel/Next.js equivalent of the Express route in
 * server/src/routes/launches.ts.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── YouTube API helpers ────────────────────────────────────────────────

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface LiveStreamResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  concurrentViewers: number;
  embedUrl: string;
}

// Simple in-memory cache (survives across warm Vercel function invocations)
const cache = new Map<string, { data: LiveStreamResult[]; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

/**
 * Strip parentheticals and separators from launch names so YouTube
 * search has a better chance of matching.
 * "Artemis II (EM-2)" → "Artemis II"
 * "Falcon 9 | Starlink Group 12-3" → "Falcon 9 Starlink Group 12-3"
 */
function cleanQuery(raw: string): string {
  return raw
    .replace(/\(.*?\)/g, '')       // strip parentheticals
    .replace(/[|/\\•·]/g, ' ')     // replace separators
    .replace(/\s{2,}/g, ' ')       // collapse multiple spaces
    .trim();
}

/**
 * Build progressively broader search queries.
 * Tries the most specific first; falls back to broader terms.
 */
function buildSearchQueries(raw: string): string[] {
  const cleaned = cleanQuery(raw);
  const queries: string[] = [];

  // Full cleaned name + "launch"
  queries.push(`${cleaned} launch`);

  // Full cleaned name alone
  queries.push(cleaned);

  // First word (mission family) + "launch live" as a broad fallback
  const firstWord = cleaned.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 4 && firstWord.toLowerCase() !== cleaned.toLowerCase()) {
    queries.push(`${firstWord} launch live`);
  }

  return queries;
}

/**
 * Execute a single YouTube search for live videos.
 */
async function youtubeSearchLive(
  query: string,
  apiKey: string,
): Promise<Array<{ id: { videoId: string } }>> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    eventType: 'live',
    order: 'viewCount',
    maxResults: '5',
    key: apiKey,
  });

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    console.error(`[YouTube] Search API returned ${res.status}: ${await res.text()}`);
    return [];
  }

  const data = await res.json();
  return data?.items ?? [];
}

const MAX_STREAMS = 3;

/**
 * Search for live streams. Tries multiple query variants,
 * returns up to 3 streams sorted by concurrent viewer count (highest first).
 */
async function searchLiveStreams(query: string, apiKey: string): Promise<LiveStreamResult[]> {
  const cacheKey = query.toLowerCase().replace(/\s+/g, '-');

  // Check in-memory cache
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // Try progressively broader queries
  const queries = buildSearchQueries(query);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchItems: any[] = [];

  for (const q of queries) {
    console.log(`[YouTube] Searching: "${q}"`);
    const items = await youtubeSearchLive(q, apiKey);
    if (items.length > 0) {
      searchItems = items;
      console.log(`[YouTube] Found ${items.length} live streams for "${q}"`);
      break;
    }
  }

  if (searchItems.length === 0) {
    console.log(`[YouTube] No live streams found for any variant of "${query}"`);
    return [];
  }

  // Get concurrent viewer counts for all candidates
  const videoIds = searchItems.map((item: { id: { videoId: string } }) => item.id.videoId).join(',');
  const detailParams = new URLSearchParams({
    part: 'liveStreamingDetails,snippet,statistics',
    id: videoIds,
    key: apiKey,
  });

  const detailRes = await fetch(`${YOUTUBE_API_BASE}/videos?${detailParams}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!detailRes.ok) {
    console.error(`[YouTube] Videos API returned ${detailRes.status}`);
    return [];
  }

  const detailData = await detailRes.json();
  const videos = detailData?.items;
  if (!videos || videos.length === 0) return [];

  // Map all streams, sort by concurrent viewers descending, take top 3
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streams: LiveStreamResult[] = videos.map((video: any) => ({
    videoId: video.id,
    title: video.snippet?.title ?? '',
    channelTitle: video.snippet?.channelTitle ?? '',
    thumbnailUrl:
      video.snippet?.thumbnails?.high?.url ??
      video.snippet?.thumbnails?.default?.url ?? '',
    concurrentViewers: parseInt(
      video.liveStreamingDetails?.concurrentViewers ?? '0',
      10,
    ),
    embedUrl: `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`,
  }));

  streams.sort((a, b) => b.concurrentViewers - a.concurrentViewers);
  const top = streams.slice(0, MAX_STREAMS);

  // Cache the results
  if (top.length > 0) {
    cache.set(cacheKey, { data: top, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  console.log(
    `[YouTube] Top ${top.length} streams for "${query}": ${top.map((s) => `${s.channelTitle} (${s.concurrentViewers})`).join(', ')}`,
  );

  return top;
}

/**
 * Extract YouTube video ID from an existing webcast URL.
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

// ── Route Handler ──────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get('query');
    const webcastUrl = searchParams.get('webcastUrl');

    if (!query) {
      return NextResponse.json(
        { status: 'error', message: 'Missing required "query" parameter' },
        { status: 400 },
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.warn('[/api/launches/livestream] No YOUTUBE_API_KEY env var set');
      return NextResponse.json({
        status: 'success',
        data: null,
        message: 'YouTube API key not configured',
        timestamp: new Date().toISOString(),
      });
    }

    // Search YouTube for the top live streams
    const streams = await searchLiveStreams(query, apiKey);

    if (streams.length > 0) {
      return NextResponse.json({
        status: 'success',
        data: streams,
        source: 'youtube_search',
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback: try to embed an existing YouTube webcast URL
    if (webcastUrl) {
      const videoId = extractYouTubeVideoId(webcastUrl);
      if (videoId) {
        return NextResponse.json({
          status: 'success',
          data: [{
            videoId,
            title: query,
            channelTitle: '',
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            concurrentViewers: 0,
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`,
          } satisfies LiveStreamResult],
          source: 'webcast_url',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      status: 'success',
      data: [],
      message: 'No live streams found for this launch',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[/api/launches/livestream] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to search for live stream',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
