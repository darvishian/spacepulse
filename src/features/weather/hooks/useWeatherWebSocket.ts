/**
 * WebSocket hook for real-time space weather updates.
 * Subscribes to the /weather namespace and updates React Query cache
 * + Zustand store when the server pushes new weather data or alerts.
 *
 * FIX (2026-03-30): Debounce cache invalidation and use stable callback
 * refs to prevent render loops and layout thrashing.
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
 *
 * Uses debounced invalidation to prevent rapid refetch cascades
 * when multiple weather events arrive in quick succession.
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

  // Store latest callback refs to avoid re-registering socket listeners
  // when callback identity changes (which would tear down and rebuild the connection).
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;
  const onSignificantChangeRef = useRef(onSignificantChange);
  onSignificantChangeRef.current = onSignificantChange;

  // Debounce invalidation: collect which keys need invalidating,
  // then flush once per animation frame instead of per-event.
  const pendingInvalidations = useRef<Set<string>>(new Set());
  const rafId = useRef<number | null>(null);

  const scheduleInvalidation = useCallback(
    (...queryKeys: string[]) => {
      for (const key of queryKeys) {
        pendingInvalidations.current.add(key);
      }
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          const keys = Array.from(pendingInvalidations.current);
          pendingInvalidations.current.clear();
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

    const socket = getNamespaceSocket('/weather');
    if (!socket) return; // No WebSocket URL configured — skip

    const handleWeatherUpdate = (_payload: WeatherUpdatePayload): void => {
      scheduleInvalidation(
        'space-weather-solar-wind',
        'space-weather-kp-index',
        'space-weather-xray',
      );
    };

    const handleWeatherAlert = (payload: WeatherAlertPayload): void => {
      console.log(`[WeatherWS] Alert (${payload.severity}):`, payload.data);
      scheduleInvalidation('space-weather-alerts');
      onAlertRef.current?.(payload);
    };

    const handleKpChange = (data: unknown): void => {
      console.log('[WeatherWS] Significant Kp index change:', data);
      scheduleInvalidation('space-weather-kp-index');
      onSignificantChangeRef.current?.('kp_index_significant_change', data);
    };

    const handleSolarWindSurge = (data: unknown): void => {
      console.log('[WeatherWS] Solar wind surge:', data);
      scheduleInvalidation('space-weather-solar-wind');
      onSignificantChangeRef.current?.('solar_wind_surge', data);
    };

    const handleXrayEscalation = (data: unknown): void => {
      console.log('[WeatherWS] X-ray flux escalation:', data);
      scheduleInvalidation('space-weather-xray');
      onSignificantChangeRef.current?.('xray_flux_escalation', data);
    };

    const handleConnect = (): void => {
      connectedRef.current = true;
      socket.emit('subscribe_weather');
      socket.emit('subscribe_alerts');
    };

    socket.on('connect', handleConnect);
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
      socket.off('connect', handleConnect);
      socket.off('weather_update', handleWeatherUpdate);
      socket.off('weather_alert', handleWeatherAlert);
      socket.off('kp_index_significant_change', handleKpChange);
      socket.off('solar_wind_surge', handleSolarWindSurge);
      socket.off('xray_flux_escalation', handleXrayEscalation);
      socket.emit('unsubscribe_weather');
      socket.emit('unsubscribe_alerts');
      disconnectNamespace('/weather');
      connectedRef.current = false;
      // Cancel any pending invalidation
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [enabled, scheduleInvalidation]);

  return { isConnected: connectedRef.current };
}
