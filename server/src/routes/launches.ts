import { Router, Request, Response } from 'express';
import launchesService from '../services/launches.service';
import youtubeService from '../services/youtube.service';

/**
 * Launches API Routes
 * IMPORTANT: Named routes (/recent, /summary, /livestream) must be defined
 * BEFORE /:id to prevent Express from matching them as ID parameters.
 */

const router = Router();

/**
 * GET /api/launches/livestream?query=<launch name>&webcastUrl=<optional existing url>
 * Search YouTube for the best live stream for a launch.
 * Returns the stream with the highest concurrent viewer count.
 */
router.get('/livestream', async (req: Request, res: Response) => {
  try {
    const { query, webcastUrl } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'Missing required "query" parameter (launch name)',
      });
      return;
    }

    // If an existing webcast URL is a YouTube link, we can try to use it directly
    let existingVideoId: string | null = null;
    if (webcastUrl && typeof webcastUrl === 'string') {
      existingVideoId = youtubeService.extractYouTubeVideoId(webcastUrl);
    }

    // Always search YouTube for the best live stream (may have higher viewer count)
    const bestStream = await youtubeService.searchLiveStream(query);

    if (bestStream) {
      res.json({
        status: 'success',
        data: bestStream,
        source: 'youtube_search',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Fallback: if we have an existing YouTube video ID, use that
    if (existingVideoId) {
      res.json({
        status: 'success',
        data: {
          videoId: existingVideoId,
          title: query,
          channelTitle: '',
          thumbnailUrl: `https://img.youtube.com/vi/${existingVideoId}/hqdefault.jpg`,
          concurrentViewers: 0,
          embedUrl: `https://www.youtube.com/embed/${existingVideoId}?autoplay=1&rel=0`,
        },
        source: 'webcast_url',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.json({
      status: 'success',
      data: null,
      message: 'No live streams found for this launch',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to search for live stream',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/launches/recent
 * Get recent launches (last N days, default 30)
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string, 10);

    const launches = await launchesService.fetchRecentLaunches(daysNum);

    res.json({
      status: 'success',
      data: launches,
      count: launches.length,
      query: { days: daysNum },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent launches',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/launches/summary
 * Get lightweight summary for dashboard list
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const summaries = await launchesService.getLaunchSummary();

    res.json({
      status: 'success',
      data: summaries,
      count: summaries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch launch summary',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/launches
 * Get all upcoming launches
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const launches = await launchesService.fetchUpcomingLaunches();
    res.json({
      status: 'success',
      data: launches,
      count: launches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch launches',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/launches/:id
 * Get launch details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const launch = await launchesService.fetchLaunchById(id);

    if (!launch) {
      res.status(404).json({
        status: 'error',
        message: `Launch with ID ${id} not found`,
      });
      return;
    }

    res.json({
      status: 'success',
      data: launch,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch launch',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
