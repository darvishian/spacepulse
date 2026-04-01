/**
 * LiveStreamPanel — Bloomberg-style panel with an embedded YouTube player.
 *
 * Shows up to 3 live streams for an upcoming launch (within 4 hours of
 * scheduled time), sorted by concurrent viewer count. Users can cycle
 * between streams using left/right arrows in the info bar.
 *
 * The panel is opened from the UpcomingLaunchesPanel via a "Watch Live"
 * button, which sets the active stream in a shared Zustand slice.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Radio,
  Users,
  Tv,
  Loader2,
  Rocket,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useLivestreamSearch } from './hooks/useLivestreamSearch';
import { useLivestreamStore } from './livestreamStore';
import type { LiveStreamResult } from './types';

// ── Idle State (no launch selected) ────────────────────────────────────

function IdleState(): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="relative">
        <Tv className="h-10 w-10 text-white/10" />
        <Radio className="absolute -right-1 -top-1 h-4 w-4 text-red-500/30" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/40">No Live Stream</p>
        <p className="text-[10px] leading-relaxed text-white/20">
          When a launch is less than 4 hours away, click{' '}
          <span className="text-red-400/50">Watch Live</span> on any
          upcoming launch to stream it here.
        </p>
      </div>
    </div>
  );
}

// ── Loading State ──────────────────────────────────────────────────────

function LoadingState({ launchName }: { launchName: string }): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-space-accent/60" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/50">Finding streams…</p>
        <p className="text-[10px] text-white/25 truncate max-w-[200px]">{launchName}</p>
      </div>
    </div>
  );
}

// ── No Stream Found ────────────────────────────────────────────────────

function NoStreamState({ launchName }: { launchName: string }): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
      <Rocket className="h-8 w-8 text-white/10" />
      <div className="space-y-1">
        <p className="text-xs font-medium text-white/40">No Stream Available</p>
        <p className="text-[10px] leading-relaxed text-white/20 max-w-[220px]">
          No live YouTube streams found for <span className="text-white/40">{launchName}</span>.
          Check back closer to launch time.
        </p>
      </div>
    </div>
  );
}

// ── Format viewer count ────────────────────────────────────────────────

function formatViewers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}

// ── Embedded Player with stream cycling ────────────────────────────────

interface PlayerProps {
  streams: LiveStreamResult[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

function Player({
  streams,
  activeIndex,
  onPrev,
  onNext,
}: PlayerProps): React.ReactElement {
  const stream = streams[activeIndex];
  const total = streams.length;
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < total - 1;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Video container — fills available space */}
      <div className="relative flex-1 min-h-0 bg-black">
        <iframe
          src={stream.embedUrl}
          title={stream.title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: 'none' }}
        />

        {/* Live badge */}
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded bg-red-600/90 px-1.5 py-0.5 shadow-lg">
          <Radio className="h-2.5 w-2.5 animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-wider text-white">
            Live
          </span>
        </div>

        {/* Stream navigation arrows — overlaid on video edges */}
        {total > 1 && (
          <>
            {hasPrev && (
              <button
                onClick={onPrev}
                className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white/70 hover:bg-black/80 hover:text-white transition-all backdrop-blur-sm"
                title="Previous stream"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {hasNext && (
              <button
                onClick={onNext}
                className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 p-1 text-white/70 hover:bg-black/80 hover:text-white transition-all backdrop-blur-sm"
                title="Next stream"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Info bar below video */}
      <div className="shrink-0 flex items-center border-t border-white/[0.06] bg-space-darker/80 px-2.5 py-1.5 gap-2">
        {/* Stream info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium text-white/70 truncate">{stream.title}</p>
          {stream.channelTitle && (
            <p className="text-[9px] text-white/30 truncate">{stream.channelTitle}</p>
          )}
        </div>

        {/* Viewer count */}
        {stream.concurrentViewers > 0 && (
          <div className="flex shrink-0 items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5">
            <Users className="h-2.5 w-2.5 text-red-400/70" />
            <span className="text-[9px] font-mono font-semibold text-white/50">
              {formatViewers(stream.concurrentViewers)}
            </span>
          </div>
        )}

        {/* Stream position indicator + arrows */}
        {total > 1 && (
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className={`rounded p-0.5 transition-colors ${
                hasPrev
                  ? 'text-white/50 hover:bg-white/10 hover:text-white/80'
                  : 'text-white/10 cursor-default'
              }`}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-[9px] font-mono text-white/30 tabular-nums min-w-[20px] text-center">
              {activeIndex + 1}/{total}
            </span>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className={`rounded p-0.5 transition-colors ${
                hasNext
                  ? 'text-white/50 hover:bg-white/10 hover:text-white/80'
                  : 'text-white/10 cursor-default'
              }`}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────

export const LiveStreamPanel = React.memo(function LiveStreamPanel(): React.ReactElement {
  const activeLaunch = useLivestreamStore((s) => s.activeLaunch);
  const [activeIndex, setActiveIndex] = useState(0);

  // Only search when we have an active launch
  const searchOptions = useMemo(() => {
    if (!activeLaunch) return null;
    return {
      launchName: activeLaunch.name,
      scheduledTime: activeLaunch.scheduledTime,
      webcastUrl: activeLaunch.webcastUrl,
    };
  }, [activeLaunch]);

  const { streams, isLoading } = useLivestreamSearch(
    searchOptions ?? {
      launchName: '',
      scheduledTime: new Date(0),
      webcastUrl: undefined,
      forceEnable: false,
    },
  );

  // Reset index when streams change (new launch selected or new data)
  const streamKey = streams.map((s) => s.videoId).join(',');
  const [lastStreamKey, setLastStreamKey] = useState('');
  if (streamKey !== lastStreamKey) {
    setLastStreamKey(streamKey);
    if (activeIndex >= streams.length) {
      setActiveIndex(0);
    }
  }

  const handlePrev = useCallback((): void => {
    setActiveIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback((): void => {
    setActiveIndex((i) => Math.min(streams.length - 1, i + 1));
  }, [streams.length]);

  // No launch selected
  if (!activeLaunch) {
    return <IdleState />;
  }

  // Loading stream data
  if (isLoading) {
    return <LoadingState launchName={activeLaunch.name} />;
  }

  // No streams found
  if (streams.length === 0) {
    return <NoStreamState launchName={activeLaunch.name} />;
  }

  // Streams found — show embedded player with cycling
  return (
    <Player
      streams={streams}
      activeIndex={activeIndex}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  );
});
