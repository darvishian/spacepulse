/**
 * WebSocket hook for real-time satellite/TLE updates.
 * Subscribes to the /satellites namespace and updates React Query cache
 * when the server pushes new TLE data.
 *
 * FIX (2026-03-30): Debounce cache invalidation and use stable effect
 * deps to prevent re-registration loops.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNamespaceSocket, disconnectNamespace } from '@/lib/api/websocket';

interface TleUpdatePayload {
  status: string;
  data: unknown[];
  count: number;
  timestamp: string;
}

/**
 * Subscribe to real-time TLE updates via WebSocket.
 * Invalidates satellite React Query cache when bulk TLE updates arrive.
 *
 * Uses debounced invalidation to coalesce rapid events.
 */
export function useSatelliteWebSocket(enabled: boolean = true): {
  isConnected: boolean;
} {
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  // Debounce: coalesce multiple events per frame into one invalidation
  const pendingKeys = useRef<Set<string>>(new Set());
  const rafId = useRef<number | null>(null);

  const scheduleInvalidation = useCallback(
    (...queryKeys: string[]) => {
      for (const key of queryKeys) {
        pendingKeys.current.add(key);
      }
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          const keys = Array.from(pendingKeys.current);
          pendingKeys.current.clear();
          rafId.current = null;
          for (const key of keys) {
            queryClient.invalidateQueries({ queryKey: [key] });
          }
        });
      }
    },
    [queryClient],
  );

  useEffect(() => {
    if (!enabled) return;

    const socket = getNamespaceSocket('/satellites');
    if (!socket) return; // No WebSocket URL configured — skip

    const handleConnect = (): void => {
      connectedRef.current = true;
      socket.emit('subscribe_tle_updates');
    };

    const handleTleUpdate = (payload: TleUpdatePayload): void => {
      console.log(`[SatelliteWS] TLE update: ${payload.count} records`);
      scheduleInvalidation('satellite-tle');
    };

    const handleSatellitesAdded = (payload: { data: unknown[]; count: number }): void => {
      console.log(`[SatelliteWS] ${payload.count} new satellites detected`);
      scheduleInvalidation('satellite-tle', 'constellations');
    };

    const handleSatellitesUpdated = (payload: { data: unknown[]; count: number }): void => {
      console.log(`[SatelliteWS] ${payload.count} satellites updated`);
      scheduleInvalidation('satellite-tle');
    };

    const handleSatellitesRemoved = (payload: { data: unknown[]; count: number }): void => {
      console.log(`[SatelliteWS] ${payload.count} satellites decayed/removed`);
      scheduleInvalidation('satellite-tle', 'constellations');
    };

    socket.on('connect', handleConnect);
    socket.on('tle_update', handleTleUpdate);
    socket.on('satellites_added', handleSatellitesAdded);
    socket.on('satellites_updated', handleSatellitesUpdated);
    socket.on('satellites_removed', handleSatellitesRemoved);

    // If already connected, subscribe immediately
    if (socket.connected) {
      connectedRef.current = true;
      socket.emit('subscribe_tle_updates');
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('tle_update', handleTleUpdate);
      socket.off('satellites_added', handleSatellitesAdded);
      socket.off('satellites_updated', handleSatellitesUpdated);
      socket.off('satellites_removed', handleSatellitesRemoved);
      disconnectNamespace('/satellites');
      connectedRef.current = false;
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [enabled, scheduleInvalidation]);

  return { isConnected: connectedRef.current };
}

/**
 * Subscribe to real-time updates for a specific constellation.
 */
export function useConstellationWebSocket(
  constellationName: string | null,
): { isConnected: boolean } {
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (!constellationName) return;

    const socket = getNamespaceSocket('/satellites');
    if (!socket) return;

    const handleConstellationUpdate = (payload: {
      constellation: string;
      data: unknown[];
      count: number;
    }): void => {
      if (payload.constellation === constellationName) {
        console.log(`[SatelliteWS] Constellation ${constellationName} update: ${payload.count} TLEs`);
        queryClient.invalidateQueries({ queryKey: ['constellation', constellationName] });
      }
    };

    const handleConnect = (): void => {
      connectedRef.current = true;
      socket.emit('subscribe_constellation', constellationName);
    };

    socket.on('connect', handleConnect);
    socket.on('constellation_tle_update', handleConstellationUpdate);

    if (socket.connected) {
      connectedRef.current = true;
      socket.emit('subscribe_constellation', constellationName);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('constellation_tle_update', handleConstellationUpdate);
      socket.emit('unsubscribe_constellation', constellationName);
      connectedRef.current = false;
    };
  }, [constellationName, queryClient]);

  return { isConnected: connectedRef.current };
}
