/**
 * RealtimeProvider
 * Activates WebSocket subscriptions for all real-time data feeds.
 * Place this inside the React Query provider but outside the dashboard layout
 * so WebSocket connections persist across layout changes.
 *
 * This component renders no UI — it just manages WebSocket lifecycles.
 */

'use client';

import { useEffect } from 'react';
import { useLaunchWebSocket } from '@/features/launches/hooks/useLaunchWebSocket';
import { useSatelliteWebSocket } from '@/features/satellites/hooks/useSatelliteWebSocket';
import { useWeatherWebSocket } from '@/features/weather/hooks/useWeatherWebSocket';
import { disconnectAll } from '@/lib/api/websocket';

export function RealtimeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  // Activate WebSocket subscriptions for each namespace
  useLaunchWebSocket(true);
  useSatelliteWebSocket(true);
  useWeatherWebSocket(true);

  // Cleanup all WebSocket connections on unmount
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, []);

  return <>{children}</>;
}
