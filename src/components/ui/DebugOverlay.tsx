/**
 * Debug overlay for development mode
 * TODO: Display FPS, entity count, data latency, and other debug info
 */

'use client';

import React from 'react';
import { useStore } from '@/lib/store';

interface DebugInfo {
  fps: number;
  entityCount: number;
  dataLatency: number;
  memoryUsage?: number;
}

/**
 * TODO: Implement debug metrics collection
 */
export function DebugOverlay() {
  const debugMode = useStore((state) => state.debugMode);
  const [debugInfo, setDebugInfo] = React.useState<DebugInfo>({
    fps: 0,
    entityCount: 0,
    dataLatency: 0,
  });

  React.useEffect(() => {
    // TODO: Implement FPS counter
    // TODO: Implement entity count tracking
    // TODO: Implement data latency measurement
    // TODO: Implement memory usage tracking

    const interval = setInterval(() => {
      setDebugInfo({
        fps: Math.round(Math.random() * 60), // Placeholder
        entityCount: 0,
        dataLatency: 0,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!debugMode) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-50 glass border border-space-accent rounded-lg p-3 text-xs font-mono text-space-accent">
      <div className="space-y-1">
        <div>FPS: {debugInfo.fps}</div>
        <div>Entities: {debugInfo.entityCount}</div>
        <div>Latency: {debugInfo.dataLatency}ms</div>
        {debugInfo.memoryUsage && (
          <div>Memory: {(debugInfo.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
        )}
      </div>
    </div>
  );
}
