import { Router, Request, Response } from 'express';
import investmentsService from '../services/investments.service';

/**
 * Space Industry Investments API Routes
 * TODO: Add request validation
 * TODO: Add advanced filtering
 * TODO: Add analytics endpoints
 */

const router = Router();

/**
 * GET /api/investments/funding
 * Get recent funding rounds in space industry
 * TODO: Add query parameters:
 * - days: time period (default: 30)
 * - sector: filter by sector (launch, satellite, infrastructure, etc.)
 * - stage: filter by company stage
 * - minimum_amount: filter by funding amount
 * - sort: sort order
 */
router.get('/funding', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string, 10);

    const rounds = await investmentsService.fetchRecentFundingRounds(daysNum);

    res.json({
      status: 'success',
      data: rounds,
      count: rounds.length,
      query: { days: daysNum },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch funding data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/investments/recent
 * Alias for /funding - get recent funding rounds
 * TODO: Deprecated - use /funding instead
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string, 10);

    const rounds = await investmentsService.fetchRecentFundingRounds(daysNum);

    res.json({
      status: 'success',
      data: rounds,
      count: rounds.length,
      query: { days: daysNum },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent investments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/investments/events
 * Get investment events (M&A, partnerships, milestones)
 * TODO: Add query parameters:
 * - days: time period
 * - type: event type filter
 * - companies: comma-separated company names
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string, 10);

    const events = await investmentsService.fetchRecentInvestmentEvents(daysNum);

    res.json({
      status: 'success',
      data: events,
      count: events.length,
      query: { days: daysNum },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch investment events',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/investments/companies/:name
 * Get detailed profile for a space company
 * TODO: Include:
 * - Company metadata
 * - Funding history
 * - Investors
 * - Recent events
 */
router.get('/companies/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const profile = await investmentsService.fetchCompanyProfile(name);

    if (!profile) {
      res.status(404).json({
        status: 'error',
        message: `Company ${name} not found`,
      });
      return;
    }

    res.json({
      status: 'success',
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch company profile',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/investments/trends
 * Get funding trends by year and sector
 * TODO: Include:
 * - Total funding by year
 * - Growth rate
 * - Sector breakdown
 * - Average deal size
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const trends = await investmentsService.getFundingTrends();

    res.json({
      status: 'success',
      data: trends,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch funding trends',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
