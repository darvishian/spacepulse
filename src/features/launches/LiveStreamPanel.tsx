/**
 * LiveStreamPanel — Bloomberg-style panel with an embedded YouTube player.
 *
 * Shows a live stream of an upcoming launch when the launch is within
 * 4 hours of its scheduled time. The stream is selected by the backend
 * via YouTube Data API v3 (highest concurrent viewer count wins).
 *
 * The panel is opened from the UpcomingLaunchesPanel via a "Watch Live"
 * button, which sets the active stream in a shared Zustand slice.
 */

'use client';

import React, { useMemo } from 'react';
import {
  Radio,
  Users,
  Tv,
  Loader2,
  Rocket,
} from 'lucide-react';
import { useLivestreamSearch } from './hooks/useLivestreamSearch';
import { useLivestreamStore } from './livestreamStore';

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
        <p className="text-xs font-medium text-white/50">Finding best stream…</p>
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

// ── Embedded Player ────────────────────────────────────────────────────

interface PlayerProps {
  embedUrl: string;
  title: string;
  channelTitle: string;
  concurrentViewers: number;
}

function Player({
  embedUrl,
  title,
  channelTitle,
  concurrentViewers,
}: PlayerProps): React.ReactElement {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Video container — fills available space */}
      <div className="relative flex-1 min-h-0 bg-black">
        <iframe
          src={embedUrl}
          title={title}
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
      </div>

      {/* Info bar below video */}
      <div className="shrink-0 flex items-center justify-between border-t border-white/[0.06] bg-space-darker/80 px-2.5 py-1.5">
        <div className="flex-1 min-w-0 mr-2">
          <p className="text-[10px] font-medium text-white/70 truncate">{title}</p>
          {channelTitle && (
            <p className="text-[9px] text-white/30 truncate">{channelTitle}</p>
          )}
        </div>
        {concurrentViewers > 0 && (
          <div className="flex shrink-0 items-center gap-1 rounded bg-white/[0.04] px-1.5 py-0.5">
            <Users className="h-2.5 w-2.5 text-red-400/70" />
            <span className="text-[9px] font-mono font-semibold text-white/50">
              {concurrentViewers >= 1000
                ? `${(concurrentViewers / 1000).toFixed(1)}k`
                : concurrentViewers}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────

export const LiveStreamPanel = React.memo(function LiveStreamPanel(): React.ReactElement {
  const activeLaunch = useLivestreamStore((s) => s.activeLaunch);

  // Only search when we have an active launch
  const searchOptions = useMemo(() => {
    if (!activeLaunch) return null;
    return {
      launchName: activeLaunch.name,
      scheduledTime: activeLaunch.scheduledTime,
      webcastUrl: activeLaunch.webcastUrl,
    };
  }, [activeLaunch]);

  const { data: stream, isLoading } = useLivestreamSearch(
    searchOptions ?? {
      launchName: '',
      scheduledTime: new Date(0),
      webcastUrl: undefined,
      forceEnable: false,
    },
  );

  // No launch selected
  if (!activeLaunch) {
    return <IdleState />;
  }

  // Loading stream data
  if (isLoading) {
    return <LoadingState launchName={activeLaunch.name} />;
  }

  // No stream found
  if (!stream) {
    return <NoStreamState launchName={activeLaunch.name} />;
  }

  // Stream found — show embedded player
  return (
    <Player
      embedUrl={stream.embedUrl}
      title={stream.title}
      channelTitle={stream.channelTitle}
      concurrentViewers={stream.concurrentViewers}
    />
  );
});
