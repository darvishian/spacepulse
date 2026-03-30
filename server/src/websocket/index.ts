import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { setupLaunchesNamespace, setupSatellitesNamespace, setupWeatherNamespace } from './handlers';

/**
 * WebSocket setup with Socket.io
 * Provides real-time updates for launches, satellites, and space weather.
 *
 * Namespaces:
 *   /launches   — launch schedule updates, new/cancelled launches
 *   /satellites  — TLE updates, constellation data, position tracking
 *   /weather     — solar wind, Kp index, X-ray flux, alerts
 */
export function setupWebSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        process.env.FRONTEND_URL || '',
      ].filter(Boolean),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Global connection logging
  io.on('connection', (socket: Socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    socket.on('disconnect', (reason: string) => {
      console.log(`[WebSocket] Client disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (error: Error) => {
      console.error('[WebSocket] Socket error:', error.message);
    });
  });

  // Setup data namespaces
  setupLaunchesNamespace(io);
  setupSatellitesNamespace(io);
  setupWeatherNamespace(io);

  return io;
}

export default setupWebSocket;
