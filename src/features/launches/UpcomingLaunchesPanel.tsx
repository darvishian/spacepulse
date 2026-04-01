/**
 * UpcomingLaunchesPanel — shows the next 3 upcoming launches with
 * countdown timers, operator info, and payload details.
 * Expandable to show more launches.
 *
 * Designed as a Bloomberg-style panel for the dashboard grid.
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Rocket,
  Clock,
  ChevronDown,
  ChevronUp,
  MapPin,
  Package,
  ExternalLink,
  Satellite,
  Radio,
} from 'lucide-react';
import { useLaunches } from './hooks/useLaunches';
import { useGlobeStore } from '../globe/store';
import { useLivestreamStore } from './livestreamStore';
import type { Launch } from './types';
import { STATUS_COLORS, STATUS_LABELS, PROVIDER_LABELS } from './types';
import { Cartesian3 } from 'cesium';

// ── Shared countdown timer ──────────────────────────────────────────────
// FIX: Single shared timer at the panel level instead of one per card.
// This prevents N independent setIntervals from causing N independent
// re-renders per second, which cascades through react-grid-layout.

/**
 * Single hook for the panel to own the "now" tick. Returns a Date that
 * updates every second. All cards receive this as a prop instead of
 * running their own timers.
 */
function useSharedNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

function formatCountdown(targetDate: Date, now: Date): string {
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return 'T+ ' + formatDuration(-diff);
  return 'T- ' + formatDuration(diff);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${String(seconds).padStart(2, '0')}s`);
  return parts.join(' ');
}

// ── Launch Card ─────────────────────────────────────────────────────────

interface LaunchCardProps {
  launch: Launch;
  rank: number;
  isExpanded: boolean;
  now: Date;
  onToggle: () => void;
  onFlyTo: () => void;
  onWatchLive: () => void;
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function LaunchCard({
  launch,
  rank,
  isExpanded,
  now,
  onToggle,
  onFlyTo,
  onWatchLive,
}: LaunchCardProps): React.ReactElement {
  const countdown = formatCountdown(launch.scheduledTime, now);
  const isPast = launch.scheduledTime.getTime() < Date.now();
  const statusColor = STATUS_COLORS[launch.status] || '#888';
  const providerLabel = PROVIDER_LABELS[launch.provider] || launch.provider;

  // Determine if this is an "imminent" launch (< 24h)
  const hoursUntil = (launch.scheduledTime.getTime() - Date.now()) / (1000 * 60 * 60);
  const isImminent = !isPast && hoursUntil < 24;

  return (
    <div
      className={`rounded-lg border transition-all duration-200 ${
        isImminent
          ? 'border-space-accent/30 bg-space-accent/[0.03]'
          : 'border-white/[0.04] bg-white/[0.015]'
      }`}
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
      >
        {/* Rank badge */}
        <div
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
            rank === 1
              ? 'bg-space-accent/20 text-space-accent'
              : 'bg-white/5 text-white/30'
          }`}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + provider */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white/85 truncate">
              {launch.rocketType}
            </span>
            <span
              className="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase"
              style={{
                color: statusColor,
                backgroundColor: `${statusColor}15`,
              }}
            >
              {STATUS_LABELS[launch.status]}
            </span>
          </div>

          {/* Mission name */}
          <div className="mt-0.5 text-[11px] text-white/50 truncate">
            {launch.name}
          </div>

          {/* Countdown + Live badge */}
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 text-xs font-mono font-bold tabular-nums ${
                isImminent ? 'text-space-accent animate-pulse' : isPast ? 'text-white/25' : 'text-white/60'
              }`}
            >
              <Clock className="h-3 w-3" />
              {countdown}
            </div>
            {Math.abs(launch.scheduledTime.getTime() - now.getTime()) < FOUR_HOURS_MS && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchLive();
                }}
                className="flex items-center gap-1 rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                Live
              </button>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        <div className="mt-1 text-white/20">
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-white/[0.04] px-3 py-2.5 space-y-2">
          {/* Operator */}
          <DetailItem
            icon={<Rocket className="h-3 w-3" />}
            label="Operator"
            value={providerLabel}
          />

          {/* Launch site */}
          <DetailItem
            icon={<MapPin className="h-3 w-3" />}
            label="Launch Site"
            value={launch.launchSite.name}
          />

          {/* Payload / Satellites */}
          {launch.payload && (
            <DetailItem
              icon={<Satellite className="h-3 w-3" />}
              label="Payload"
              value={`${launch.payload.name}${launch.payload.destination ? ` → ${launch.payload.destination}` : ''}`}
            />
          )}

          {launch.payload?.mass && (
            <DetailItem
              icon={<Package className="h-3 w-3" />}
              label="Mass"
              value={`${launch.payload.mass.toLocaleString()} kg`}
            />
          )}

          {/* Mission type */}
          <DetailItem
            icon={<Package className="h-3 w-3" />}
            label="Mission"
            value={launch.missionType}
          />

          {/* Schedule */}
          <DetailItem
            icon={<Clock className="h-3 w-3" />}
            label="Scheduled"
            value={launch.scheduledTime.toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short',
            })}
          />

          {/* Probability if available */}
          {launch.probability !== undefined && launch.probability > 0 && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-white/25">Probability</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-space-success transition-all"
                  style={{ width: `${launch.probability}%` }}
                />
              </div>
              <span className="text-white/50 font-mono text-[10px]">{launch.probability}%</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFlyTo();
              }}
              className="flex items-center gap-1 rounded bg-space-accent/10 px-2 py-1 text-[10px] font-semibold text-space-accent/80 hover:bg-space-accent/20 transition-colors"
            >
              <MapPin className="h-3 w-3" />
              View on Globe
            </button>

            {/* Watch Live — only when launch is within 4 hours */}
            {Math.abs(launch.scheduledTime.getTime() - now.getTime()) < FOUR_HOURS_MS && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWatchLive();
                }}
                className="flex items-center gap-1 rounded bg-red-500/15 px-2 py-1 text-[10px] font-semibold text-red-400/90 hover:bg-red-500/25 transition-colors animate-pulse"
              >
                <Radio className="h-3 w-3" />
                Watch Live
              </button>
            )}

            {launch.webcastUrl && (
              <a
                href={launch.webcastUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[10px] font-semibold text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Webcast
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span className="mt-0.5 text-white/20">{icon}</span>
      <span className="shrink-0 text-white/30 w-16">{label}</span>
      <span className="text-white/60">{value}</span>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────

const DEFAULT_VISIBLE = 3;

export const UpcomingLaunchesPanel = React.memo(function UpcomingLaunchesPanel(): React.ReactElement {
  const { data: launches, isLoading } = useLaunches();
  const viewer = useGlobeStore((s) => s.viewerRef);
  const setSelectedGlobeEntity = useGlobeStore((s) => s.setSelectedGlobeEntity);
  const setActiveLaunch = useLivestreamStore((s) => s.setActiveLaunch);
  const now = useSharedNow();

  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sort by scheduledTime, upcoming first
  const sortedLaunches = useMemo(() => {
    if (!launches) return [];
    const now = Date.now();
    return [...launches]
      .filter((l) => l.scheduledTime.getTime() > now - 1000 * 60 * 60 * 24) // Include launches from last 24h
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }, [launches]);

  const visibleLaunches = showAll
    ? sortedLaunches
    : sortedLaunches.slice(0, DEFAULT_VISIBLE);

  const handleWatchLive = useCallback(
    (launch: Launch) => {
      setActiveLaunch({
        id: launch.id,
        name: launch.name,
        scheduledTime: launch.scheduledTime,
        webcastUrl: launch.webcastUrl,
      });
    },
    [setActiveLaunch],
  );

  const handleFlyTo = useCallback(
    (launch: Launch) => {
      if (!viewer || viewer.isDestroyed()) return;

      setSelectedGlobeEntity({
        id: launch.id,
        name: launch.name,
        type: 'launch',
        position: {
          latitude: launch.launchSite.latitude,
          longitude: launch.launchSite.longitude,
          altitude: 0,
        },
        properties: {
          provider: launch.provider,
          rocketType: launch.rocketType,
          status: launch.status,
        },
      });

      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(
          launch.launchSite.longitude,
          launch.launchSite.latitude,
          2000000,
        ),
        duration: 1.5,
      });
    },
    [viewer, setSelectedGlobeEntity],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-space-darker/60">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-space-accent/30 border-t-space-accent" />
          </div>
        ) : sortedLaunches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-white/20">
            <Rocket className="h-8 w-8 mb-2" />
            <span className="text-xs">No upcoming launches</span>
          </div>
        ) : (
          <>
            {visibleLaunches.map((launch, index) => (
              <LaunchCard
                key={launch.id}
                launch={launch}
                rank={index + 1}
                isExpanded={expandedId === launch.id}
                now={now}
                onToggle={() =>
                  setExpandedId(expandedId === launch.id ? null : launch.id)
                }
                onFlyTo={() => handleFlyTo(launch)}
                onWatchLive={() => handleWatchLive(launch)}
              />
            ))}

            {/* Show more / less */}
            {sortedLaunches.length > DEFAULT_VISIBLE && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex w-full items-center justify-center gap-1 rounded bg-white/[0.02] py-2 text-[10px] uppercase tracking-wider text-white/25 hover:bg-white/[0.04] hover:text-white/40 transition-colors"
              >
                {showAll ? (
                  <>
                    Show Less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    +{sortedLaunches.length - DEFAULT_VISIBLE} More Launches{' '}
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
