import { Server as SocketIOServer, Socket } from 'socket.io';
import launchesService from '../services/launches.service';
import celestrakService from '../services/celestrak.service';
import weatherService from '../services/weather.service';

/**
 * WebSocket event handlers for real-time data namespaces.
 *
 * Architecture:
 * - Each namespace manages its own room-based subscriptions
 * - Clients join rooms on subscribe, leave on unsubscribe/disconnect
 * - Polling jobs broadcast to namespace → all connected clients get updates
 * - Per-entity subscriptions (e.g., single satellite) use room-based filtering
 */

// ── Subscription tracking ───────────────────────────────────────────────

/** Track active subscriptions per socket for cleanup on disconnect. */
const socketSubscriptions = new Map<string, Set<string>>();

function trackSubscription(socketId: string, room: string): void {
  if (!socketSubscriptions.has(socketId)) {
    socketSubscriptions.set(socketId, new Set());
  }
  socketSubscriptions.get(socketId)!.add(room);
}

function cleanupSubscriptions(socketId: string): void {
  socketSubscriptions.delete(socketId);
}

// ── Launches namespace ──────────────────────────────────────────────────

/**
 * /launches namespace
 * Events emitted by server (from polling jobs):
 *   - launches_update       (full snapshot)
 *   - launches_created      (new launches added)
 *   - launches_updated      (launch status/time changed)
 *   - launches_removed      (launches cancelled)
 *
 * Events from client:
 *   - subscribe_launches    → joins 'launches' room, gets initial data
 *   - unsubscribe_launches  → leaves 'launches' room
 */
export function setupLaunchesNamespace(io: SocketIOServer): void {
  const ns = io.of('/launches');

  ns.on('connection', (socket: Socket) => {
    console.log('[Launches WS] Client connected:', socket.id);

    socket.on('subscribe_launches', async (filters?: { provider?: string }) => {
      try {
        const room = filters?.provider ? `launches:${filters.provider}` : 'launches';
        socket.join(room);
        trackSubscription(socket.id, room);
        console.log(`[Launches WS] ${socket.id} subscribed to ${room}`);

        // Send initial data snapshot
        const launches = await launchesService.fetchUpcomingLaunches();
        socket.emit('launches_data', {
          status: 'success',
          data: launches,
          count: launches.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch launches',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    socket.on('unsubscribe_launches', () => {
      socket.leave('launches');
      console.log(`[Launches WS] ${socket.id} unsubscribed`);
    });

    socket.on('disconnect', () => {
      cleanupSubscriptions(socket.id);
      console.log('[Launches WS] Client disconnected:', socket.id);
    });
  });
}

// ── Satellites namespace ────────────────────────────────────────────────

/**
 * /satellites namespace
 * Events emitted by server (from polling jobs):
 *   - tle_update              (full TLE snapshot)
 *   - satellites_added        (new satellites detected)
 *   - satellites_updated      (orbital elements changed)
 *   - satellites_removed      (satellites decayed)
 *   - constellation_tle_update (per-constellation)
 *
 * Events from client:
 *   - subscribe_satellite       → gets position for single sat
 *   - subscribe_constellation   → joins constellation room
 *   - subscribe_tle_updates     → joins 'tle_updates' room for bulk updates
 */
export function setupSatellitesNamespace(io: SocketIOServer): void {
  const ns = io.of('/satellites');

  ns.on('connection', (socket: Socket) => {
    console.log('[Satellites WS] Client connected:', socket.id);

    // Subscribe to all TLE updates (used by SatelliteLayer)
    socket.on('subscribe_tle_updates', async () => {
      try {
        socket.join('tle_updates');
        trackSubscription(socket.id, 'tle_updates');
        console.log(`[Satellites WS] ${socket.id} subscribed to TLE updates`);

        // Send initial TLE data
        const tles = await celestrakService.fetchTleData();
        socket.emit('tle_update', {
          status: 'success',
          data: tles,
          count: tles.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch TLE data',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Subscribe to a single satellite's position
    socket.on('subscribe_satellite', async (satelliteId: string) => {
      try {
        const room = `satellite:${satelliteId}`;
        socket.join(room);
        trackSubscription(socket.id, room);
        console.log(`[Satellites WS] ${socket.id} subscribed to satellite ${satelliteId}`);

        const position = await celestrakService.fetchSatellitePosition(satelliteId, new Date());
        socket.emit('satellite_position', {
          satelliteId,
          position,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', {
          message: `Failed to fetch position for satellite ${satelliteId}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Subscribe to a constellation's TLE updates
    socket.on('subscribe_constellation', async (constellationName: string) => {
      try {
        const room = `constellation:${constellationName}`;
        socket.join(room);
        trackSubscription(socket.id, room);
        console.log(`[Satellites WS] ${socket.id} subscribed to constellation ${constellationName}`);

        const tles = await celestrakService.fetchConstellationTles(constellationName);
        socket.emit('constellation_data', {
          constellation: constellationName,
          data: tles,
          count: tles.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', {
          message: `Failed to fetch constellation data for ${constellationName}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    socket.on('unsubscribe_satellite', (satelliteId: string) => {
      socket.leave(`satellite:${satelliteId}`);
    });

    socket.on('unsubscribe_constellation', (constellationName: string) => {
      socket.leave(`constellation:${constellationName}`);
    });

    socket.on('disconnect', () => {
      cleanupSubscriptions(socket.id);
      console.log('[Satellites WS] Client disconnected:', socket.id);
    });
  });
}

// ── Weather namespace ───────────────────────────────────────────────────

/**
 * /weather namespace
 * Events emitted by server (from polling jobs):
 *   - weather_update              (full weather snapshot)
 *   - weather_alert               (new alert detected)
 *   - kp_index_significant_change (geomagnetic storm indicator)
 *   - solar_wind_surge            (rapid speed increase)
 *   - xray_flux_escalation        (solar flare class escalation)
 *
 * Events from client:
 *   - subscribe_weather  → joins 'weather' room, gets initial data
 *   - subscribe_alerts   → joins 'alerts' room, gets current alerts
 */
export function setupWeatherNamespace(io: SocketIOServer): void {
  const ns = io.of('/weather');

  ns.on('connection', (socket: Socket) => {
    console.log('[Weather WS] Client connected:', socket.id);

    socket.on('subscribe_weather', async () => {
      try {
        socket.join('weather');
        trackSubscription(socket.id, 'weather');
        console.log(`[Weather WS] ${socket.id} subscribed to weather updates`);

        // Send initial weather snapshot
        const spaceWeather = await weatherService.fetchSpaceWeather();
        socket.emit('weather_data', {
          status: 'success',
          data: spaceWeather,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch space weather data',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    socket.on('subscribe_alerts', async () => {
      try {
        socket.join('alerts');
        trackSubscription(socket.id, 'alerts');
        console.log(`[Weather WS] ${socket.id} subscribed to alerts`);

        const alerts = await weatherService.fetchWeatherAlerts();
        socket.emit('alerts_data', {
          data: alerts,
          count: alerts.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        socket.emit('error', {
          message: 'Failed to fetch weather alerts',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    socket.on('unsubscribe_weather', () => {
      socket.leave('weather');
    });

    socket.on('unsubscribe_alerts', () => {
      socket.leave('alerts');
    });

    socket.on('disconnect', () => {
      cleanupSubscriptions(socket.id);
      console.log('[Weather WS] Client disconnected:', socket.id);
    });
  });
}

export default {
  setupLaunchesNamespace,
  setupSatellitesNamespace,
  setupWeatherNamespace,
};
