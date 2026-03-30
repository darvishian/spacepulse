/**
 * WebSocket hook for real-time space weather updates.
 * Subscribes to the /weather namespace and updates React Query cache
 * + Zustand store when the server pushes new weather data or alerts.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getNamespaceSocket, disconnectNamespace } from '@/lib/api/websocket';

interface WeatherUpdatePayload {
  status: string;
  data: {
    solarWind: unknown;
    kpIndex: unknown;
    xrayFlux: unknown;
  };
  timestamp: string;
}

interface WeatherAlertPayload {
  status: string;
  data: unknown;
  severity: string;
  timestamp: string;
}

/**
 * Subscribe to real-time space weather updates via WebSocket.
 * Invalidates React Query weather caches when updates arrive.
 * Also listens for significant events (Kp changes, solar wind surges, flares).
 */
export function useWeatherWebSocket(
  enabled: boolean = true,
  onAlert?: (alert: WeatherAlertPayload) => void,
  onSignificantChange?: (event: string, data: unknown) => void,
): {
  isConnected: boolean;
} {
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  const handleWeatherUpdate = useCallback(
    (_payload: WeatherUpdatePayload) => {
      // Invalidate all weather queries so components re-fetch
      queryClient.invalidateQueries({ queryKey: ['space-weather-solar-wind'] });
      queryClient.invalidateQueries({ queryKey: ['space-weather-kp-index'] });
      queryClient.invalidateQueries({ queryKey: ['space-weather-xray'] });
    },
    [queryClient],
  );

  const handleWeatherAlert = useCallback(
    (payload: WeatherAlertPayload) => {
      console.log(`[WeatherWS] Alert (${payload.severity}):`, payload.data);
      queryClient.invalidateQueries({ queryKey: ['space-weather-alerts'] });
      onAlert?.(payload);
    },
    [queryClient, onAlert],
  );

  const handleKpChange = useCallback(
    (data: unknown) => {
      console.log('[WeatherWS] Significant Kp index change:', data);
      queryClient.invalidateQueries({ queryKey: ['space-weather-kp-index'] });
      onSignificantChange?.('kp_index_significant_change', data);
    },
    [queryClient, onSignificantChange],
  );

  const handleSolarWindSurge = useCallback(
    (data: unknown) => {
      console.log('[WeatherWS] Solar wind surge:', data);
      queryClient.invalidateQueries({ queryKey: ['space-weather-solar-wind'] });
      onSignificantChange?.('solar_wind_surge', data);
    },
    [queryClient, onSignificantChange],
  );

  const handleXrayEscalation = useCallback(
    (data: unknown) => {
      console.log('[WeatherWS] X-ray flux escalation:', data);
      queryClient.invalidateQueries({ queryKey: ['space-weather-xray'] });
      onSignificantChange?.('xray_flux_escalation', data);
    },
    [queryClient, onSignificantChange],
  );

  useEffect(() => {
    if (!enabled) return;

    const socket = getNamespaceSocket('/weather');

    socket.on('connect', () => {
      connectedRef.current = true;
      socket.emit('subscribe_weather');
      socket.emit('subscribe_alerts');
    });

    socket.on('weather_update', handleWeatherUpdate);
    socket.on('weather_alert', handleWeatherAlert);
    socket.on('kp_index_significant_change', handleKpChange);
    socket.on('solar_wind_surge', handleSolarWindSurge);
    socket.on('xray_flux_escalation', handleXrayEscalation);

    // If already connected, subscribe immediately
    if (socket.connected) {
      connectedRef.current = true;
      socket.emit('subscribe_weather');
      socket.emit('subscribe_alerts');
    }

    return () => {
      socket.off('weather_update', handleWeatherUpdate);
      socket.off('weather_alert', handleWeatherAlert);
      socket.off('kp_index_significant_change', handleKpChange);
      socket.off('solar_wind_surge', handleSolarWindSurge);
      socket.off('xray_flux_escalation', handleXrayEscalation);
      socket.emit('unsubscribe_weather');
      socket.emit('unsubscribe_alerts');
      disconnectNamespace('/weather');
      connectedRef.current = false;
    };
  }, [
    enabled,
    handleWeatherUpdate,
    handleWeatherAlert,
    handleKpChange,
    handleSolarWindSurge,
    handleXrayEscalation,
  ]);

  return { isConnected: connectedRef.current };
}
