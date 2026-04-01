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

/**
 * Search YouTube for a live stream matching the given launch query.
 * Returns the stream with the highest concurrent viewer count, or null
 * if no live streams are found.
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
    // Step 1: Search for live videos matching the launch name
    const searchRes = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        q: `${query} launch live`,
        type: 'video',
        eventType: 'live',
        order: 'viewCount',
        maxResults: 5,
        key: apiKey,
      },
      timeout: 8000,
    });

    const items = searchRes.data?.items;
    if (!items || items.length === 0) {
      console.log(`[YouTube] No live streams found for "${query}"`);
      return null;
    }

    // Step 2: Get live streaming details (concurrent viewer count) for all candidates
    const videoIds = items.map((item: { id: { videoId: string } }) => item.id.videoId).join(',');

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
