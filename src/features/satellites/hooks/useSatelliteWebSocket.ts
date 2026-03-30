/**
 * WebSocket hook for real-time satellite/TLE updates.
 * Subscribes to the /satellites namespace and updates React Query cache
 * when the server pushes new TLE data.
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
 */
export function useSatelliteWebSocket(enabled: boolean = true): {
  isConnected: boolean;
} {
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  const handleTleUpdate = useCallback(
    (payload: TleUpdatePayload) => {
      console.log(`[SatelliteWS] TLE update: ${payload.count} records`);
      queryClient.invalidateQueries({ queryKey: ['satellite-tle'] });
    },
    [queryClient],
  );

  const handleSatellitesAdded = useCallback(
    (payload: { data: unknown[]; count: number }) => {
      console.log(`[SatelliteWS] ${payload.count} new satellites detected`);
      queryClient.invalidateQueries({ queryKey: ['satellite-tle'] });
      queryClient.invalidateQueries({ queryKey: ['constellations'] });
    },
    [queryClient],
  );

  const handleSatellitesUpdated = useCallback(
    (payload: { data: unknown[]; count: number }) => {
      console.log(`[SatelliteWS] ${payload.count} satellites updated`);
      queryClient.invalidateQueries({ queryKey: ['satellite-tle'] });
    },
    [queryClient],
  );

  const handleSatellitesRemoved = useCallback(
    (payload: { data: unknown[]; count: number }) => {
      console.log(`[SatelliteWS] ${payload.count} satellites decayed/removed`);
      queryClient.invalidateQueries({ queryKey: ['satellite-tle'] });
      queryClient.invalidateQueries({ queryKey: ['constellations'] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!enabled) return;

    const socket = getNamespaceSocket('/satellites');
    if (!socket) return; // No WebSocket URL configured (e.g. Vercel) — skip

    socket.on('connect', () => {
      connectedRef.current = true;
      socket.emit('subscribe_tle_updates');
    });

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
      socket.off('tle_update', handleTleUpdate);
      socket.off('satellites_added', handleSatellitesAdded);
      socket.off('satellites_updated', handleSatellitesUpdated);
      socket.off('satellites_removed', handleSatellitesRemoved);
      disconnectNamespace('/satellites');
      connectedRef.current = false;
    };
  }, [enabled, handleTleUpdate, handleSatellitesAdded, handleSatellitesUpdated, handleSatellitesRemoved]);

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
    if (!socket) return; // No WebSocket URL configured (e.g. Vercel) — skip

    const handleConstellationUpdate = (payload: {
      constellation: string;
      data: unknown[];
      count: number;
    }) => {
      if (payload.constellation === constellationName) {
        console.log(`[SatelliteWS] Constellation ${constellationName} update: ${payload.count} TLEs`);
        queryClient.invalidateQueries({ queryKey: ['constellation', constellationName] });
      }
    };

    socket.on('connect', () => {
      connectedRef.current = true;
      socket.emit('subscribe_constellation', constellationName);
    });

    socket.on('constellation_tle_update', handleConstellationUpdate);

    if (socket.connected) {
      connectedRef.current = true;
      socket.emit('subscribe_constellation', constellationName);
    }

    return () => {
      socket.off('constellation_tle_update', handleConstellationUpdate);
      socket.emit('unsubscribe_constellation', constellationName);
      connectedRef.current = false;
    };
  }, [constellationName, queryClient]);

  return { isConnected: connectedRef.current };
}
