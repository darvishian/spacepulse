import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';

import config from './config';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import createRateLimiter from './middleware/rateLimiter';
import setupWebSocket from './websocket';
import { initializeCache } from './cache';
import * as scheduler from './jobs/scheduler';
import pollLaunches from './jobs/pollLaunches';
import pollTle from './jobs/pollTle';
import pollWeather from './jobs/pollWeather';

/**
 * SpacePulse Server
 * Real-time space activity monitoring dashboard
 * TODO: Add structured logging
 * TODO: Add metrics/monitoring
 * TODO: Add graceful shutdown
 */

async function startServer(): Promise<void> {
  const app: Express = express();

  // Create HTTP server for Socket.io
  const httpServer = http.createServer(app);

  try {
    // Initialize cache
    console.log('[Server] Initializing cache...');
    await initializeCache();

    // Middleware
    console.log('[Server] Setting up middleware...');
    app.use(helmet());
    app.use(compression());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Rate limiting
    app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 100 }));

    // API routes
    console.log('[Server] Mounting routes...');
    app.use('/api', apiRoutes);

    // Health check
    app.get('/', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        service: 'SpacePulse Server',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      });
    });

    // WebSocket setup
    console.log('[Server] Setting up WebSocket...');
    const io = setupWebSocket(httpServer);

    // Error handling middleware (must be last)
    app.use(notFoundHandler);
    app.use(errorHandler);

    // Start polling jobs
    console.log('[Server] Registering polling jobs...');
    scheduler.registerJob('pollLaunches', () => pollLaunches(io), config.pollLaunchesInterval);
    scheduler.registerJob('pollTle', () => pollTle(io), config.pollTleInterval);
    scheduler.registerJob('pollWeather', () => pollWeather(io), config.pollWeatherInterval);

    // TODO: Register additional jobs
    // - Job cleanup scheduler
    // - Cache invalidation scheduler
    // - Health check scheduler
    // - Analytics aggregation job

    // Start scheduler
    console.log('[Server] Starting job scheduler...');
    scheduler.startScheduler();

    // Start server
    httpServer.listen(config.port, () => {
      console.log(`[Server] SpacePulse server running on port ${config.port}`);
      console.log(`[Server] API available at http://localhost:${config.port}/api`);
      console.log(`[Server] Health check at http://localhost:${config.port}/`);
      console.log(`[Server] WebSocket available at ws://localhost:${config.port}`);
      console.log(`[Server] Environment: ${config.nodeEnv}`);

      // Print job status
      const jobStatus = scheduler.getJobStatus();
      console.log('[Server] Active jobs:');
      jobStatus.forEach((job) => {
        console.log(`  - ${job.name}: ${job.schedule}`);
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('[Server] SIGTERM received, shutting down gracefully...');
      scheduler.stopScheduler();
      httpServer.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('[Server] SIGINT received, shutting down gracefully...');
      scheduler.stopScheduler();
      httpServer.close(() => {
        console.log('[Server] Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('[Server] Uncaught exception:', error);
      // TODO: Log to monitoring service
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      console.error('[Server] Unhandled rejection:', reason);
      // TODO: Log to monitoring service
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
}

// Start server
startServer().catch((error) => {
  console.error('[Server] Fatal error:', error);
  process.exit(1);
});

export default startServer;
