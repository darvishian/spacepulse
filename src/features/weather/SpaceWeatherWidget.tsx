/**
 * Space weather widget component
 * TODO: Display real-time space weather indicators
 */

'use client';

import React from 'react';
import { useSpaceWeather, useMagneticStorms } from './hooks/useSpaceWeather';
import { AlertTriangle, Activity, Zap } from 'lucide-react';

/**
 * TODO: Implement space weather indicators
 * TODO: Show Kp index gauge
 * TODO: Display solar wind speed and density
 * TODO: Show X-ray flux classification
 */
export function SpaceWeatherWidget() {
  const { solarWind, kpIndex, xrayFlux, isLoading } = useSpaceWeather();
  const { data: storms } = useMagneticStorms();

  if (isLoading) {
    return (
      <div className="glass rounded-lg p-4">
        <div className="text-sm text-gray-400">Loading space weather...</div>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider">
        Space Weather
      </h3>

      {/* Kp Index */}
      {kpIndex && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Kp Index</span>
            <div
              className={`px-2 py-1 rounded text-xs font-semibold ${
                kpIndex.severity === 'low'
                  ? 'bg-space-success/20 text-space-success'
                  : kpIndex.severity === 'moderate'
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : kpIndex.severity === 'high'
                      ? 'bg-space-warning/20 text-space-warning'
                      : 'bg-red-500/20 text-red-500'
              }`}
            >
              {kpIndex.value} - {kpIndex.label}
            </div>
          </div>
          <div className="w-full bg-space-dark/50 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-space-success via-space-warning to-red-500 h-2 rounded-full"
              style={{ width: `${(kpIndex.value / 9) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Solar Wind */}
      {solarWind && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-space-accent" />
            <span className="text-xs text-gray-400">Solar Wind</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-gray-500">Speed</div>
              <div className="text-space-accent font-semibold">
                {solarWind.speed} km/s
              </div>
            </div>
            <div>
              <div className="text-gray-500">Density</div>
              <div className="text-space-accent font-semibold">
                {solarWind.density} p/cm³
              </div>
            </div>
          </div>
        </div>
      )}

      {/* X-ray Flux */}
      {xrayFlux && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-space-warning" />
            <span className="text-xs text-gray-400">X-ray Classification</span>
          </div>
          <div className="px-3 py-1 bg-space-warning/20 rounded text-xs font-semibold text-space-warning">
            {xrayFlux.classification}
          </div>
        </div>
      )}

      {/* Alerts */}
      {storms && storms.length > 0 && (
        <div className="pt-3 border-t border-space-accent/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-space-warning" />
            <span className="text-xs font-semibold text-space-warning">
              Active Storms: {storms.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
