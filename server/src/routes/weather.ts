import { Router, Request, Response } from 'express';
import weatherService from '../services/weather.service';

/**
 * Space Weather API Routes
 * TODO: Add request validation
 * TODO: Add historical data endpoints
 * TODO: Add forecasting endpoints
 */

const router = Router();

/**
 * GET /api/weather/solar-wind
 * Get current solar wind data
 * TODO: Add parameters:
 * - source: filter by data source
 */
router.get('/solar-wind', async (req: Request, res: Response) => {
  try {
    const solarWind = await weatherService.fetchSolarWind();

    if (!solarWind) {
      res.status(500).json({
        status: 'error',
        message: 'Unable to fetch solar wind data',
      });
      return;
    }

    res.json({
      status: 'success',
      data: solarWind,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch solar wind data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/weather/kp-index
 * Get current Kp index (geomagnetic activity)
 * Kp index ranges from 0-9, with higher values indicating more geomagnetic activity
 * TODO: Add parameters:
 * - source: filter by data source
 * - include_forecast: include Kp forecast
 */
router.get('/kp-index', async (req: Request, res: Response) => {
  try {
    const { include_forecast = false } = req.query;

    const kpIndex = await weatherService.fetchKpIndex();

    if (!kpIndex) {
      res.status(500).json({
        status: 'error',
        message: 'Unable to fetch Kp index',
      });
      return;
    }

    // TODO: Fetch Kp forecast if requested
    const response: any = {
      status: 'success',
      data: kpIndex,
      timestamp: new Date().toISOString(),
    };

    if (include_forecast) {
      // TODO: Implement forecast fetching
      response.forecast = null;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch Kp index',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/weather/xray
 * Get current X-ray flux from the sun
 * Used to detect solar flares (classified A, B, C, M, X)
 * TODO: Add parameters:
 * - source: filter by data source
 */
router.get('/xray', async (req: Request, res: Response) => {
  try {
    const xrayFlux = await weatherService.fetchXrayFlux();

    if (!xrayFlux) {
      res.status(500).json({
        status: 'error',
        message: 'Unable to fetch X-ray flux data',
      });
      return;
    }

    res.json({
      status: 'success',
      data: xrayFlux,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch X-ray flux data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/weather/current
 * Get all current space weather data in one call
 * Combines solar wind, Kp index, and X-ray flux
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const spaceWeather = await weatherService.fetchSpaceWeather();

    if (!spaceWeather) {
      res.status(500).json({
        status: 'error',
        message: 'Unable to fetch space weather data',
      });
      return;
    }

    res.json({
      status: 'success',
      data: spaceWeather,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch space weather data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/weather/alerts
 * Get active space weather alerts and warnings
 * TODO: Include:
 * - Solar flare warnings
 * - Geomagnetic storm watches/warnings
 * - Radiation storm watches
 * - CME arrival notices
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await weatherService.fetchWeatherAlerts();

    res.json({
      status: 'success',
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch weather alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
