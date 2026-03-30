import { Router } from 'express';
import launchesRouter from './launches';
import satellitesRouter from './satellites';
import weatherRouter from './weather';
import investmentsRouter from './investments';

/**
 * Route aggregator
 * Mounts all sub-routers under their respective paths
 */

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
router.use('/launches', launchesRouter);
router.use('/satellites', satellitesRouter);
router.use('/weather', weatherRouter);
router.use('/investments', investmentsRouter);

// TODO: Add additional endpoints:
// - /api/czml - CZML visualization endpoints
// - /api/notifications - Notification preferences
// - /api/users - User profiles and preferences
// - /api/analytics - Dashboard analytics

export default router;
