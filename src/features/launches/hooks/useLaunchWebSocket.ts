/**
 * WebSocket hook for real-time launch updates.
 * Subscribes to the /launches namespace and updates React Query cache
 * when the server pushes new data.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNamespaceSocket, disconnectNamespace } from '@/lib/api/websocket';

interface LaunchUpdatePayload {
  status: string;
  data: unknown[];
  timestamp: string;
}

/**
 * Subscribe to real-time launch updates via WebSocket.
 * Automatically invalidates the React Query cache when updates arrive,
 * triggering a re-fetch of launch data.
 */
export function useLaunchWebSocket(enabled: boolean = true): {
  isConnected: boolean;
} {
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  const handleLaunchUpdate = useCallback(
    (_payload: LaunchUpdatePayload) => {
      console.log('[LaunchWS] Received update, invalidating queries');
      // Invalidate all launch queries so React Query re-fetches
      queryClient.invalidateQueries({ queryKey: ['launches'] });
    },
    [queryClient],
  );

  const handleLaunchCreated = useCallback(
    (payload: { data: unknown[] }) => {
      console.log(`[LaunchWS] ${payload.data.length} new launch(es) added`);
      queryClient.invalidateQueries({ queryKey: ['launches'] });
    },
    [queryClient],
  );

  const handleLaunchUpdated = useCallback(
    (payload: { data: unknown[] }) => {
      console.log(`[LaunchWS] ${payload.data.length} launch(es) updated`);
      queryClient.invalidateQueries({ queryKey: ['launches'] });
    },
    [queryClient],
  );

  const handleLaunchRemoved = useCallback(
    (payload: { data: unknown[] }) => {
      console.log(`[LaunchWS] ${payload.data.length} launch(es) removed`);
      queryClient.invalidateQueries({ queryKey: ['launches'] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (!enabled) return;

    const socket = getNamespaceSocket('/launches');
    if (!socket) return; // No WebSocket URL configured (e.g. Vercel) — skip

    socket.on('connect', () => {
      connectedRef.current = true;
      socket.emit('subscribe_launches');
    });

    socket.on('launches_update', handleLaunchUpdate);
    socket.on('launches_created', handleLaunchCreated);
    socket.on('launches_updated', handleLaunchUpdated);
    socket.on('launches_removed', handleLaunchRemoved);

    // If already connected, subscribe immediately
    if (socket.connected) {
      connectedRef.current = true;
      socket.emit('subscribe_launches');
    }

    return () => {
      socket.off('launches_update', handleLaunchUpdate);
      socket.off('launches_created', handleLaunchCreated);
      socket.off('launches_updated', handleLaunchUpdated);
      socket.off('launches_removed', handleLaunchRemoved);
      socket.emit('unsubscribe_launches');
      disconnectNamespace('/launches');
      connectedRef.current = false;
    };
  }, [enabled, handleLaunchUpdate, handleLaunchCreated, handleLaunchUpdated, handleLaunchRemoved]);

  return { isConnected: connectedRef.current };
}
