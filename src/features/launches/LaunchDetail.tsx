/**
 * Launch detail panel component.
 * Shows comprehensive launch info with a live T± countdown timer.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Launch, LaunchStatus, STATUS_COLORS, STATUS_LABELS, PROVIDER_LABELS } from './types';
import { useGlobeStore } from '../globe/store';
import { Calendar, MapPin, Rocket, Package, Clock, ExternalLink } from 'lucide-react';
import { Cartesian3 } from 'cesium';

interface LaunchDetailProps {
  launch: Launch;
  onClose?: () => void; // eslint-disable-line @typescript-eslint/no-unused-vars
}

/** Format a duration in ms to "Xd Xh Xm Xs" countdown string. */
function formatCountdown(ms: number): string {
  const abs = Math.abs(ms);
  const days = Math.floor(abs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((abs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((abs % (1000 * 60)) / 1000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function LaunchDetail({ launch, onClose: _onClose }: LaunchDetailProps): React.ReactElement {
  const [countdown, setCountdown] = useState<string>('');
  const [isPast, setIsPast] = useState<boolean>(false);
  const viewer = useGlobeStore((s) => s.viewerRef);

  // Live countdown timer
  useEffect(() => {
    const update = (): void => {
      const now = Date.now();
      const target = launch.scheduledTime.getTime();
      const diff = target - now;

      setIsPast(diff < 0);
      setCountdown(formatCountdown(diff));
    };

    update();
    const interval = setInterval(update, 1000);
    return (): void => clearInterval(interval);
  }, [launch.scheduledTime]);

  // "View on Map" handler
  const handleViewOnMap = useCallback((): void => {
    if (!viewer || viewer.isDestroyed()) return;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        launch.launchSite.longitude,
        launch.launchSite.latitude,
        1500000, // 1500km altitude
      ),
      duration: 1.5,
    });
  }, [viewer, launch.launchSite]);

  const statusColor = STATUS_COLORS[launch.status] ?? '#888';
  const statusLabel = STATUS_LABELS[launch.status] ?? 'Unknown';
  const providerLabel = PROVIDER_LABELS[launch.provider] ?? launch.provider;

  const launchDate = launch.scheduledTime;
  const isUpcoming = launch.status === LaunchStatus.GO ||
    launch.status === LaunchStatus.TBD ||
    launch.status === LaunchStatus.HOLD;

  return (
    <div className="space-y-4">
      {/* Header with status badge */}
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold flex-1">{launch.name}</h3>
        <span
          className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
          style={{ backgroundColor: statusColor + '22', color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* T± Countdown */}
      <div className="bg-space-darker/60 rounded-lg p-3 text-center border border-space-accent/20">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-space-accent" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            {isPast ? 'T+ Since Launch' : 'T- To Launch'}
          </span>
        </div>
        <div
          className="text-2xl font-mono font-bold tracking-wider"
          style={{ color: isUpcoming ? '#00d4ff' : '#888' }}
        >
          {isPast ? 'T+ ' : 'T- '}{countdown}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-space-accent shrink-0" />
          <div>
            <div className="text-gray-400">Launch Date</div>
            <div>
              {launchDate.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              {launchDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </div>
            {launch.launchWindow && (
              <div className="text-xs text-gray-500">
                Window:{' '}
                {launch.launchWindow.start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' – '}
                {launch.launchWindow.end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MapPin className="w-4 h-4 text-space-accent shrink-0" />
          <div>
            <div className="text-gray-400">Launch Site</div>
            <div>{launch.launchSite.name}</div>
            <div className="text-xs text-gray-500">
              {launch.launchSite.latitude.toFixed(4)}°, {launch.launchSite.longitude.toFixed(4)}°
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Rocket className="w-4 h-4 text-space-accent shrink-0" />
          <div>
            <div className="text-gray-400">Vehicle</div>
            <div>{launch.rocketType}</div>
            <div className="text-xs text-gray-500">{providerLabel}</div>
          </div>
        </div>

        {launch.payload && (
          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-space-accent shrink-0" />
            <div>
              <div className="text-gray-400">Payload</div>
              <div>{launch.payload.name}</div>
              <div className="text-xs text-gray-500">
                {launch.payload.mass && `${launch.payload.mass.toLocaleString()} kg`}
                {launch.payload.mass && launch.payload.destination && ' · '}
                {launch.payload.destination}
              </div>
            </div>
          </div>
        )}

        {launch.missionDescription && (
          <div className="pt-2 border-t border-space-accent/10">
            <div className="text-gray-400 text-xs mb-1">Mission</div>
            <p className="text-gray-300 text-xs leading-relaxed">
              {launch.missionDescription}
            </p>
          </div>
        )}

        {launch.probability !== undefined && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Launch probability:</span>
            <span className="text-space-accent font-bold">{launch.probability}%</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-space-accent/20 space-y-2">
        <button
          onClick={handleViewOnMap}
          className="w-full px-4 py-2 bg-space-accent/20 hover:bg-space-accent/30 rounded-lg transition-colors text-sm font-medium"
        >
          View on Map
        </button>

        {launch.webcastUrl && (
          <a
            href={launch.webcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-3 h-3" />
            Watch Webcast
          </a>
        )}
      </div>
    </div>
  );
}
