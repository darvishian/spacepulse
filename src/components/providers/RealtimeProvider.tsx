/**
 * RealtimeProvider
 * Activates WebSocket subscriptions for all real-time data feeds.
 * Place this inside the React Query provider but outside the dashboard layout
 * so WebSocket connections persist across layout changes.
 *
 * FIX: Checks backend reachability before enabling WebSocket connections.
 * On Vercel (or when backend is down), WebSockets are disabled entirely
 * to prevent reconnection loops that cause jitter.
 */

'use client';

import { useEffect, useState } from 'react';
import { useLaunchWebSocket } from '@/features/launches/hooks/useLaunchWebSocket';
import { useSatelliteWebSocket } from '@/features/satellites/hooks/useSatelliteWebSocket';
import { useWeatherWebSocket } from '@/features/weather/hooks/useWeatherWebSocket';
import { disconnectAll, checkBackendReachable } from '@/lib/api/websocket';

export function RealtimeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [wsEnabled, setWsEnabled] = useState(false);

  // Check if backend is reachable before enabling WebSocket connections
  useEffect(() => {
    let cancelled = false;
    checkBackendReachable().then((reachable) => {
      if (!cancelled) {
        setWsEnabled(reachable);
        if (!reachable) {
          console.log('[RealtimeProvider] Backend unreachable — WebSocket disabled');
        }
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Activate WebSocket subscriptions only when backend is reachable
  useLaunchWebSocket(wsEnabled);
  useSatelliteWebSocket(wsEnabled);
  useWeatherWebSocket(wsEnabled);

  // Cleanup all WebSocket connections on unmount
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, []);

  return <>{children}</>;
}
