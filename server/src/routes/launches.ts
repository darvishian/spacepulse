import { Router, Request, Response } from 'express';
import launchesService from '../services/launches.service';

/**
 * Launches API Routes
 * IMPORTANT: Named routes (/recent, /summary) must be defined BEFORE /:id
 * to prevent Express from matching them as ID parameters.
 */

const router = Router();

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
