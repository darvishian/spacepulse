/**
 * Constellation group component — displays a list of satellite constellations
 * with satellite counts, orbit types, and filter toggles.
 *
 * When a constellation is selected, the satellite layer filters to show only
 * that constellation's satellites on the globe.
 */

'use client';

import React, { useCallback } from 'react';
import { useSatelliteStore } from './store';
import { useConstellationData } from './hooks/useSatelliteData';
import { OrbitType } from './types';

interface ConstellationGroupProps {
  constellationId?: string;
  onSelect?: (constellationId: string | null) => void;
}

/** Color map matching the SatelliteLayer constellation colors. */
const CONSTELLATION_BADGE_COLORS: Record<string, string> = {
  starlink: 'bg-[#00d4ff]/20 text-[#00d4ff]',
  oneweb: 'bg-[#ff6b35]/20 text-[#ff6b35]',
  iridium: 'bg-[#00ff88]/20 text-[#00ff88]',
  gps: 'bg-[#ffd700]/20 text-[#ffd700]',
  glonass: 'bg-[#ff4444]/20 text-[#ff4444]',
  galileo: 'bg-[#aa88ff]/20 text-[#aa88ff]',
  beidou: 'bg-[#ff88aa]/20 text-[#ff88aa]',
  globalstar: 'bg-[#88ffaa]/20 text-[#88ffaa]',
  planet: 'bg-[#ffaa44]/20 text-[#ffaa44]',
  spire: 'bg-[#44aaff]/20 text-[#44aaff]',
  telesat: 'bg-[#ff44aa]/20 text-[#ff44aa]',
};

/** Orbit type display labels. */
const ORBIT_LABELS: Record<OrbitType, string> = {
  [OrbitType.LEO]: 'LEO',
  [OrbitType.MEO]: 'MEO',
  [OrbitType.GEO]: 'GEO',
  [OrbitType.HEO]: 'HEO',
};

export function ConstellationGroup({
  constellationId: controlledId,
  onSelect,
}: ConstellationGroupProps): React.ReactElement {
  const { data: constellations, isLoading } = useConstellationData();
  const filters = useSatelliteStore((state) => state.filters);
  const setFilters = useSatelliteStore((state) => state.setFilters);

  const activeId = controlledId ?? filters.constellationId ?? null;

  const handleSelectConstellation = useCallback(
    (id: string) => {
      // Toggle: clicking the active constellation deselects it (show all)
      const newId = activeId === id ? null : id;

      // Map constellation id to the name used by SatelliteLayer's guessConstellation
      setFilters({
        constellationId: newId ? id.toUpperCase() : undefined,
      });
      onSelect?.(newId);
    },
    [activeId, setFilters, onSelect],
  );

  const handleShowAll = useCallback(() => {
    setFilters({ constellationId: undefined });
    onSelect?.(null);
  }, [setFilters, onSelect]);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!constellations || constellations.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-500">
        No constellation data available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Show All button */}
      <button
        onClick={handleShowAll}
        className={`w-full text-left p-2 rounded text-sm transition-colors ${
          !activeId
            ? 'bg-space-accent/20 text-space-accent'
            : 'hover:bg-white/5 text-gray-400'
        }`}
      >
        <div className="font-medium">All Satellites</div>
        <div className="text-xs opacity-70">
          {constellations.reduce((sum, c) => sum + c.satelliteCount, 0).toLocaleString()} tracked
        </div>
      </button>

      {/* Constellation list */}
      {constellations
        .filter((c) => c.satelliteCount > 0)
        .sort((a, b) => b.satelliteCount - a.satelliteCount)
        .map((constellation) => {
          const isActive = activeId?.toLowerCase() === constellation.id.toLowerCase()
            || activeId?.toUpperCase() === constellation.id.toUpperCase();
          const badgeColor =
            CONSTELLATION_BADGE_COLORS[constellation.id.toLowerCase()] ||
            'bg-white/10 text-gray-400';

          return (
            <button
              key={constellation.id}
              onClick={() => handleSelectConstellation(constellation.id)}
              className={`w-full text-left p-2 rounded transition-colors ${
                isActive
                  ? 'bg-white/10 ring-1 ring-space-accent/50'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-200">
                  {constellation.name}
                </span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>
                  {ORBIT_LABELS[constellation.orbitType] || constellation.orbitType}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-gray-500">{constellation.operator}</span>
                <span className="text-xs text-gray-400">
                  {constellation.satelliteCount.toLocaleString()} sats
                </span>
              </div>
            </button>
          );
        })}
    </div>
  );
}
