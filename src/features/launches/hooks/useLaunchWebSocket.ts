/**
 * WebSocket hook for real-time launch updates.
 * Subscribes to the /launches namespace and updates React Query cache
 * when the server pushes new data.
 *
 * FIX (2026-03-30): Debounce cache invalidation and use stable effect
 * deps to prevent re-registration loops.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNamespaceSocket, disconnectNamespace } from '@/lib/api/websocket';

/**
 * Subscribe to real-time launch updates via WebSocket.
 * Automatically invalidates the React Query cache when updates arrive,
 * triggering a re-fetch of launch data.
 *
 * Uses debounced invalidation to coalesce rapid events into a single refetch.
 */
export function useLaunchWebSocket(enabled: boolean = true): {
  isConnected: boolean;
} {
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  // Debounce: coalesce multiple events per frame into one invalidation
  const pendingRef = useRef(false);
  const rafId = useRef<number | null>(null);

  const scheduleInvalidation = useCallback(() => {
    pendingRef.current = true;
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (pendingRef.current) {
          pendingRef.current = false;
          queryClient.invalidateQueries({ queryKey: ['launches'] });
        }
      });
    }
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;

    const socket = getNamespaceSocket('/launches');
    if (!socket) return; // No WebSocket URL configured — skip

    const handleConnect = (): void => {
      connectedRef.current = true;
      socket.emit('subscribe_launches');
    };

    const handleLaunchUpdate = (): void => {
      console.log('[LaunchWS] Received update, invalidating queries');
      scheduleInvalidation();
    };

    const handleLaunchCreated = (payload: { data: unknown[] }): void => {
      console.log(`[LaunchWS] ${payload.data.length} new launch(es) added`);
      scheduleInvalidation();
    };

    const handleLaunchUpdated = (payload: { data: unknown[] }): void => {
      console.log(`[LaunchWS] ${payload.data.length} launch(es) updated`);
      scheduleInvalidation();
    };

    const handleLaunchRemoved = (payload: { data: unknown[] }): void => {
      console.log(`[LaunchWS] ${payload.data.length} launch(es) removed`);
      scheduleInvalidation();
    };

    socket.on('connect', handleConnect);
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
      socket.off('connect', handleConnect);
      socket.off('launches_update', handleLaunchUpdate);
      socket.off('launches_created', handleLaunchCreated);
      socket.off('launches_updated', handleLaunchUpdated);
      socket.off('launches_removed', handleLaunchRemoved);
      socket.emit('unsubscribe_launches');
      disconnectNamespace('/launches');
      connectedRef.current = false;
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [enabled, scheduleInvalidation]);

  return { isConnected: connectedRef.current };
}
