import axios from 'axios';
import config from '../config';
import { getCache } from '../cache';

/**
 * YouTube Data API v3 service.
 *
 * Searches for live streams related to a rocket launch and returns the
 * stream with the highest concurrent viewer count.  Results are cached
 * for 10 minutes to keep quota usage low (~2 units per search call).
 */

const cache = getCache();

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_SECONDS = 600; // 10 min — live viewer counts change, but we don't need per-second freshness

export interface LiveStreamResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  concurrentViewers: number;
  embedUrl: string;
}

// ── Query cleanup ──────────────────────────────────────────────────────
// Launch names often contain parenthetical designators, slashes, and
// internal codes that hurt YouTube search relevance.
// "Artemis II (EM-2)" → "Artemis II"
// "Falcon 9 | Starlink Group 12-3" → "Falcon 9 Starlink Group 12-3"

function cleanQuery(raw: string): string {
  return raw
    .replace(/\(.*?\)/g, '')       // strip parentheticals: "(EM-2)", "(Block 5)"
    .replace(/[|/\\•·]/g, ' ')     // replace separators with spaces
    .replace(/\s{2,}/g, ' ')       // collapse multiple spaces
    .trim();
}

/**
 * Build a set of progressively broader search queries from the launch name.
 * We try the most specific query first; if it returns nothing we fall back
 * to broader terms. This keeps quota usage low (usually the first query
 * hits) while ensuring we find streams that use slightly different naming.
 *
 * Example for "Artemis II (EM-2)":
 *   1. "Artemis II launch"
 *   2. "Artemis II"
 *   3. "Artemis launch live"
 */
function buildSearchQueries(raw: string): string[] {
  const cleaned = cleanQuery(raw);
  const queries: string[] = [];

  // Full cleaned name + "launch"
  queries.push(`${cleaned} launch`);

  // Full cleaned name alone (catches "Artemis II live stream" titles)
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
 * Returns raw search result items or an empty array.
 */
async function youtubeSearchLive(
  query: string,
  apiKey: string,
  maxResults: number = 5,
): Promise<Array<{ id: { videoId: string }; snippet: Record<string, unknown> }>> {
  const res = await axios.get(`${YOUTUBE_API_BASE}/search`, {
    params: {
      part: 'snippet',
      q: query,
      type: 'video',
      eventType: 'live',
      order: 'viewCount',
      maxResults,
      key: apiKey,
    },
    timeout: 8000,
  });

  return res.data?.items ?? [];
}

/**
 * Search YouTube for a live stream matching the given launch query.
 * Returns the stream with the highest concurrent viewer count, or null
 * if no live streams are found.
 *
 * Tries multiple progressively broader search queries to handle
 * naming mismatches (e.g. "Artemis II (EM-2)" vs "Artemis 2 Launch").
 */
async function searchLiveStream(query: string): Promise<LiveStreamResult | null> {
  const apiKey = config.youtubeApiKey;
  if (!apiKey) {
    console.warn('[YouTube] No YOUTUBE_API_KEY configured — skipping live stream search');
    return null;
  }

  const cacheKey = `youtube:livestream:${query.toLowerCase().replace(/\s+/g, '-')}`;

  // Check cache first
  const cached = await cache.get<LiveStreamResult>(cacheKey);
  if (cached) return cached;

  try {
    // Step 1: Try progressively broader search queries until we get results
    const queries = buildSearchQueries(query);
    let allItems: Array<{ id: { videoId: string }; snippet: Record<string, unknown> }> = [];

    for (const q of queries) {
      console.log(`[YouTube] Searching: "${q}"`);
      const items = await youtubeSearchLive(q, apiKey);

      if (items.length > 0) {
        allItems = items;
        console.log(`[YouTube] Found ${items.length} live streams for "${q}"`);
        break; // Use the first query that returns results
      }
    }

    if (allItems.length === 0) {
      console.log(`[YouTube] No live streams found for any query variant of "${query}"`);
      return null;
    }

    // Step 2: Get live streaming details (concurrent viewer count) for all candidates
    const videoIds = allItems.map((item) => item.id.videoId).join(',');

    const detailsRes = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'liveStreamingDetails,snippet,statistics',
        id: videoIds,
        key: apiKey,
      },
      timeout: 8000,
    });

    const videos = detailsRes.data?.items;
    if (!videos || videos.length === 0) return null;

    // Step 3: Pick the stream with the highest concurrent viewer count
    let best: LiveStreamResult | null = null;
    let bestViewers = -1;

    for (const video of videos) {
      const viewers = parseInt(
        video.liveStreamingDetails?.concurrentViewers ?? '0',
        10,
      );

      if (viewers > bestViewers) {
        bestViewers = viewers;
        best = {
          videoId: video.id,
          title: video.snippet?.title ?? '',
          channelTitle: video.snippet?.channelTitle ?? '',
          thumbnailUrl:
            video.snippet?.thumbnails?.high?.url ??
            video.snippet?.thumbnails?.default?.url ??
            '',
          concurrentViewers: viewers,
          embedUrl: `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`,
        };
      }
    }

    // Cache the result
    if (best) {
      await cache.set(cacheKey, best, CACHE_TTL_SECONDS);
    }

    console.log(
      `[YouTube] Best live stream for "${query}": ${best?.title} (${best?.concurrentViewers} viewers)`,
    );

    return best;
  } catch (error) {
    console.error('[YouTube] API error:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Given an existing webcast URL, extract a YouTube video ID if present.
 * This lets us embed known webcast URLs directly without a search.
 */
function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/@[^/]+\/live/,  // Channel live page — can't extract video ID
  ];
  const match = url.match(patterns[0]);
  return match?.[1] ?? null;
}

export default {
  searchLiveStream,
  extractYouTubeVideoId,
};
