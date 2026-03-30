/**
 * Sortable launch list table, synced with globe selection.
 * Includes "Show Last 10 Launches" toggle for historical trajectories.
 */

'use client';

import React from 'react';
import { useLaunches, useRecentLaunches } from './hooks/useLaunches';
import { useLaunchStore, useFilteredLaunches } from './store';
import { useGlobeStore } from '../globe/store';
import {
  Launch,
  STATUS_COLORS,
  STATUS_LABELS,
  PROVIDER_LABELS,
} from './types';
import { ChevronUp, ChevronDown, History } from 'lucide-react';
import { Cartesian3 } from 'cesium';
import type { GlobeEntity } from '../globe/types';

type SortKey = 'name' | 'date' | 'provider' | 'status';

function getSortValue(launch: Launch, key: SortKey): string | number {
  switch (key) {
    case 'name':
      return launch.name.toLowerCase();
    case 'date':
      return launch.scheduledTime.getTime();
    case 'provider':
      return PROVIDER_LABELS[launch.provider] ?? launch.provider;
    case 'status':
      return STATUS_LABELS[launch.status] ?? launch.status;
  }
}

/** Relative time label: "in 3d", "2h ago", etc. */
function relativeTime(date: Date): string {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const suffix = diff > 0 ? '' : ' ago';
  const prefix = diff > 0 ? 'in ' : '';

  if (abs < 60 * 60 * 1000) {
    const m = Math.round(abs / (60 * 1000));
    return `${prefix}${m}m${suffix}`;
  }
  if (abs < 24 * 60 * 60 * 1000) {
    const h = Math.round(abs / (60 * 60 * 1000));
    return `${prefix}${h}h${suffix}`;
  }
  const d = Math.round(abs / (24 * 60 * 60 * 1000));
  return `${prefix}${d}d${suffix}`;
}

export function LaunchList(): React.ReactElement {
  // Data hooks — trigger the queries
  useLaunches();
  useRecentLaunches(30);

  const filteredLaunches = useFilteredLaunches();
  const recentLaunches = useLaunchStore((s) => s.recentLaunches);
  const selectedLaunchId = useLaunchStore((s) => s.selectedLaunchId);
  const setSelectedLaunch = useLaunchStore((s) => s.setSelectedLaunch);
  const showRecentLaunches = useLaunchStore((s) => s.showRecentLaunches);
  const setShowRecentLaunches = useLaunchStore((s) => s.setShowRecentLaunches);
  const viewer = useGlobeStore((s) => s.viewerRef);

  const [sortKey, setSortKey] = React.useState<SortKey>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = React.useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir(key === 'date' ? 'asc' : 'desc');
      }
    },
    [sortKey]
  );

  // Combine upcoming + optional recent, then sort
  const allLaunches = React.useMemo(() => {
    const list = [...filteredLaunches];
    if (showRecentLaunches) {
      list.push(...recentLaunches);
    }

    return list.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [filteredLaunches, recentLaunches, showRecentLaunches, sortKey, sortDir]);

  // Select launch and fly to it on the globe
  const handleSelect = React.useCallback(
    (launch: Launch) => {
      setSelectedLaunch(launch.id);

      // Sync with globe
      const globeEntity: GlobeEntity = {
        id: launch.id,
        name: launch.name,
        type: 'launch',
        position: {
          latitude: launch.launchSite.latitude,
          longitude: launch.launchSite.longitude,
          altitude: 0,
        },
        properties: {
          provider: PROVIDER_LABELS[launch.provider],
          rocket: launch.rocketType,
          status: launch.status,
        },
      };
      useGlobeStore.getState().setSelectedGlobeEntity(globeEntity);

      // Fly to launch site
      if (viewer && !viewer.isDestroyed() && launch.launchSite.latitude !== 0) {
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(
            launch.launchSite.longitude,
            launch.launchSite.latitude,
            2000000,
          ),
          duration: 1.5,
        });
      }
    },
    [setSelectedLaunch, viewer]
  );

  const SortIcon = ({ column }: { column: SortKey }): React.ReactElement | null => {
    if (sortKey !== column) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with "Show Recent" toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-space-accent/20">
        <span className="text-xs text-gray-400 uppercase tracking-wider">
          {allLaunches.length} launch{allLaunches.length !== 1 ? 'es' : ''}
        </span>
        <button
          onClick={() => setShowRecentLaunches(!showRecentLaunches)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
            showRecentLaunches
              ? 'bg-space-accent/20 text-space-accent'
              : 'text-gray-500 hover:text-gray-300 hover:bg-space-accent/10'
          }`}
          title="Show Last 10 Launches with historical trajectories"
        >
          <History className="w-3 h-3" />
          Recent
        </button>
      </div>

      {/* Sortable table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-space-dark/80 backdrop-blur-sm border-b border-space-accent/20">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-3 py-2 text-left cursor-pointer hover:bg-space-accent/10 transition-colors text-xs text-gray-400 uppercase"
              >
                <div className="flex items-center gap-1">
                  Mission <SortIcon column="name" />
                </div>
              </th>
              <th
                onClick={() => handleSort('date')}
                className="px-3 py-2 text-left cursor-pointer hover:bg-space-accent/10 transition-colors text-xs text-gray-400 uppercase"
              >
                <div className="flex items-center gap-1">
                  Date <SortIcon column="date" />
                </div>
              </th>
              <th
                onClick={() => handleSort('provider')}
                className="px-3 py-2 text-left cursor-pointer hover:bg-space-accent/10 transition-colors text-xs text-gray-400 uppercase"
              >
                <div className="flex items-center gap-1">
                  Provider <SortIcon column="provider" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                className="px-3 py-2 text-left cursor-pointer hover:bg-space-accent/10 transition-colors text-xs text-gray-400 uppercase"
              >
                <div className="flex items-center gap-1">
                  Status <SortIcon column="status" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-accent/5">
            {allLaunches.map((launch) => {
              const statusColor = STATUS_COLORS[launch.status] ?? '#888';
              const isSelected = selectedLaunchId === launch.id;
              const isPast = launch.scheduledTime.getTime() < Date.now();

              return (
                <tr
                  key={launch.id}
                  onClick={() => handleSelect(launch)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-space-accent/15'
                      : 'hover:bg-space-accent/5'
                  } ${isPast ? 'opacity-60' : ''}`}
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-200 truncate max-w-[160px]">
                      {launch.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {launch.rocketType}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400">
                    <div>{launch.scheduledTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div className="text-xs text-gray-500">{relativeTime(launch.scheduledTime)}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 text-xs">
                    {PROVIDER_LABELS[launch.provider] ?? launch.provider}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        backgroundColor: statusColor + '22',
                        color: statusColor,
                      }}
                    >
                      {STATUS_LABELS[launch.status] ?? launch.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {allLaunches.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            No launches found
          </div>
        )}
      </div>
    </div>
  );
}
