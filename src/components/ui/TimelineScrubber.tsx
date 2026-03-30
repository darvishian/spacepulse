/**
 * Timeline scrubber — drives the Cesium clock for past/future simulation.
 *
 * Reads clock state from GlobeStore and dispatches play/pause, skip,
 * and time-scale changes that GlobeContainer syncs to the Cesium Clock.
 */

'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useGlobeStore } from '@/features/globe/store';
import type { TimeScale } from '@/features/globe/types';

const SKIP_HOURS = 1;

export function TimelineScrubber(): React.ReactElement {
  const clock = useGlobeStore((s) => s.clock);
  const setIsPlaying = useGlobeStore((s) => s.setIsPlaying);
  const setTimeScale = useGlobeStore((s) => s.setTimeScale);
  const setCurrentTime = useGlobeStore((s) => s.setCurrentTime);
  const skipTime = useGlobeStore((s) => s.skipTime);

  // Avoid hydration mismatch: start with null, set real time only on client
  const [displayTime, setDisplayTime] = React.useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set initial time on mount (client only) and sync on store changes
  useEffect(() => {
    setDisplayTime(clock.currentTime);
  }, [clock.currentTime]);

  useEffect(() => {
    if (clock.isPlaying) {
      timerRef.current = setInterval(() => {
        setDisplayTime(new Date());
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clock.isPlaying]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!clock.isPlaying);
  }, [clock.isPlaying, setIsPlaying]);

  const handleSkip = useCallback(
    (direction: 'forward' | 'backward') => {
      skipTime(direction, SKIP_HOURS);
    },
    [skipTime]
  );

  const handleReset = useCallback(() => {
    setCurrentTime(new Date());
    setIsPlaying(true);
    setTimeScale('real-time');
  }, [setCurrentTime, setIsPlaying, setTimeScale]);

  const handleTimeScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTimeScale(e.target.value as TimeScale);
    },
    [setTimeScale]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-space-dark/80 backdrop-blur-md border-t border-space-accent/20 p-4 z-30">
      <div className="max-w-6xl mx-auto space-y-3">
        {/* Time and controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-mono text-space-accent">
            {displayTime ? displayTime.toISOString() : '\u00A0'}
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSkip('backward')}
              className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors"
              title={`Skip back ${SKIP_HOURS}h`}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handlePlayPause}
              className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors"
              title={clock.isPlaying ? 'Pause' : 'Play'}
            >
              {clock.isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>

            <button
              onClick={() => handleSkip('forward')}
              className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors"
              title={`Skip forward ${SKIP_HOURS}h`}
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="hover:bg-space-accent/10 p-2 rounded-lg transition-colors ml-2"
              title="Reset to now"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Time scale selector */}
            <select
              value={clock.timeScale}
              onChange={handleTimeScaleChange}
              className="ml-4 px-3 py-1 bg-space-dark/50 border border-space-accent/30 rounded text-sm outline-none focus:border-space-accent/80"
            >
              <option value="real-time">Real-time</option>
              <option value="1x">1x Speed</option>
              <option value="2x">2x Speed</option>
              <option value="10x">10x Speed</option>
              <option value="60x">60x Speed</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
