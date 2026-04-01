/**
 * WebSocket client wrapper using Socket.io
 * Supports namespace connections for launches, satellites, and weather.
 */

import { io, Socket } from 'socket.io-client';

// WebSocket URL — only connect when explicitly configured (not on Vercel serverless)
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '';

/**
 * Shared reconnection options for all namespace sockets.
 * FIX: Reduced reconnection attempts from 10 → 3 to prevent
 * prolonged reconnect loops when backend is unreachable (e.g. Vercel).
 * After 3 failures the socket stays dormant until next manual connect.
 */
const SOCKET_OPTIONS = {
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 3,
  transports: ['websocket', 'polling'] as string[],
};

// ── Base WebSocket Client (default namespace) ──────────────────────────

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!WS_URL) {
        // No WebSocket URL configured (e.g. Vercel deployment) — skip silently
        resolve();
        return;
      }
      try {
        this.socket = io(WS_URL, SOCKET_OPTIONS);

        this.socket.on('connect', () => {
          console.log('[WebSocket] Connected');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[WebSocket] Connection error:', error.message);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('[WebSocket] Disconnected:', reason);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      if (this.socket) {
        this.socket.on(event, (...args: unknown[]) => {
          this.listeners.get(event)?.forEach((cb) => cb(...args));
        });
      }
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown): void {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.warn('[WebSocket] Not connected, cannot emit event:', event);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsClient = new WebSocketClient();

// ── Backend reachability tracker ──────────────────────────────────────
// Tracks whether the backend API is reachable so React Query hooks can
// disable refetchInterval and avoid endless loading↔error cycling.

let backendReachable = true;
let lastCheck = 0;
const CHECK_COOLDOWN = 30_000; // Re-check at most every 30s

/**
 * Quick health check: try to reach the backend API root.
 * Result is cached for CHECK_COOLDOWN ms to avoid spamming.
 */
export async function checkBackendReachable(): Promise<boolean> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  if (!apiBase) {
    backendReachable = false;
    return false;
  }

  const now = Date.now();
  if (now - lastCheck < CHECK_COOLDOWN) return backendReachable;
  lastCheck = now;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiBase}/launches/summary`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    backendReachable = res.ok;
  } catch {
    backendReachable = false;
  }
  return backendReachable;
}

export function isBackendReachable(): boolean {
  return backendReachable;
}

export function setBackendReachable(reachable: boolean): void {
  backendReachable = reachable;
}

// ── Namespace Socket Manager ───────────────────────────────────────────

/**
 * Creates and manages Socket.io connections to specific namespaces.
 * Each namespace gets its own socket connection (Socket.io multiplexing).
 */

const namespaceSockets = new Map<string, Socket>();

/**
 * Get or create a socket connection for a specific namespace.
 * Socket.io namespaces share the same underlying transport.
 */
export function getNamespaceSocket(namespace: string): Socket | null {
  if (!WS_URL) return null; // No WebSocket URL — skip on serverless deployments

  const existing = namespaceSockets.get(namespace);
  // Return the existing socket if it's connected OR still connecting.
  // Only recreate if it's fully disconnected. Previously this only checked
  // `connected`, which destroyed sockets mid-handshake and caused
  // connect/disconnect loops on initial load.
  if (existing && (existing.connected || !existing.disconnected)) return existing;

  // Clean up fully disconnected socket
  if (existing) {
    existing.removeAllListeners();
    existing.disconnect();
  }

  const socket = io(`${WS_URL}${namespace}`, SOCKET_OPTIONS);

  socket.on('connect', () => {
    console.log(`[WS:${namespace}] Connected`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[WS:${namespace}] Disconnected: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    console.error(`[WS:${namespace}] Connection error:`, error.message);
  });

  socket.on('error', (error: { message: string }) => {
    console.error(`[WS:${namespace}] Error:`, error.message);
  });

  namespaceSockets.set(namespace, socket);
  return socket;
}

/**
 * Disconnect a specific namespace socket.
 */
export function disconnectNamespace(namespace: string): void {
  const socket = namespaceSockets.get(namespace);
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    namespaceSockets.delete(namespace);
  }
}

/**
 * Disconnect all namespace sockets.
 */
export function disconnectAll(): void {
  for (const [, socket] of namespaceSockets) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  namespaceSockets.clear();
  wsClient.disconnect();
}
