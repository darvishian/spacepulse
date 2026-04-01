/**
 * SpaceWeatherPanel — full dashboard panel for the right column.
 * Displays live solar wind, Kp index, X-ray flux with severity indicators,
 * trend arrows, and an alert count badge.
 * Designed to sit inside a react-resizable-panels Panel.
 */

'use client';

import React from 'react';
import { Sun, Wind, Activity, Zap, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useSpaceWeather, useWeatherAlerts } from './hooks/useSpaceWeather';
import type { KpIndex, XrayFlux } from './types';

// ── Severity helpers ────────────────────────────────────────────────────

function getKpColor(kp: number): string {
  if (kp <= 3) return 'text-space-success';
  if (kp <= 4) return 'text-yellow-400';
  if (kp <= 6) return 'text-space-warning';
  if (kp <= 7) return 'text-orange-500';
  return 'text-red-500';
}

function getKpBgColor(kp: number): string {
  if (kp <= 3) return 'bg-space-success/15';
  if (kp <= 4) return 'bg-yellow-400/15';
  if (kp <= 6) return 'bg-space-warning/15';
  if (kp <= 7) return 'bg-orange-500/15';
  return 'bg-red-500/15';
}

function getKpBarColor(kp: number): string {
  if (kp <= 3) return 'bg-space-success';
  if (kp <= 4) return 'bg-yellow-400';
  if (kp <= 6) return 'bg-space-warning';
  if (kp <= 7) return 'bg-orange-500';
  return 'bg-red-500';
}

function getFlareColor(cls: string): string {
  switch (cls) {
    case 'X': return 'text-red-500';
    case 'M': return 'text-orange-500';
    case 'C': return 'text-yellow-400';
    case 'B': return 'text-space-success';
    default:  return 'text-white/50';
  }
}

function getFlareBgColor(cls: string): string {
  switch (cls) {
    case 'X': return 'bg-red-500/15';
    case 'M': return 'bg-orange-500/15';
    case 'C': return 'bg-yellow-400/15';
    case 'B': return 'bg-space-success/15';
    default:  return 'bg-white/5';
  }
}

function getWindColor(speed: number): string {
  if (speed < 400) return 'text-space-success';
  if (speed < 500) return 'text-yellow-400';
  if (speed < 700) return 'text-space-warning';
  return 'text-red-500';
}

/** Returns true when current conditions are considered "dangerous" for sats. */
export function isDangerousWeather(
  kpIndex: KpIndex | null,
  xrayFlux: XrayFlux | null,
): boolean {
  if (!kpIndex && !xrayFlux) return false;
  const kpDangerous = (kpIndex?.value ?? 0) >= 5;
  const flareDangerous = (xrayFlux?.classification ?? 'A') === 'M' || (xrayFlux?.classification ?? 'A') === 'X';
  return kpDangerous || flareDangerous;
}

// ── Trend icon helper ───────────────────────────────────────────────────

function TrendIcon({ value, threshold }: { value: number; threshold: number }): React.ReactElement {
  if (Math.abs(value) < threshold) {
    return <Minus className="h-3 w-3 text-white/30" />;
  }
  if (value > 0) {
    return <TrendingUp className="h-3 w-3 text-space-warning" />;
  }
  return <TrendingDown className="h-3 w-3 text-space-success" />;
}

// ── Main Panel ──────────────────────────────────────────────────────────

export const SpaceWeatherPanel = React.memo(function SpaceWeatherPanel(): React.ReactElement {
  const { solarWind, kpIndex, xrayFlux, isLoading } = useSpaceWeather();
  const { alerts } = useWeatherAlerts();

  // Track previous values for trend arrows
  const prevRef = React.useRef<{
    speed: number;
    kp: number;
  }>({ speed: 0, kp: 0 });

  const speedTrend = solarWind ? solarWind.speed - prevRef.current.speed : 0;
  const kpTrend = kpIndex ? kpIndex.value - prevRef.current.kp : 0;

  React.useEffect(() => {
    if (solarWind) prevRef.current.speed = solarWind.speed;
    if (kpIndex) prevRef.current.kp = kpIndex.value;
  }, [solarWind, kpIndex]);

  const dangerous = isDangerousWeather(kpIndex, xrayFlux);
  const alertCount = alerts.length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-space-darker/60">
      {/* Header */}
      <div className={`flex shrink-0 items-center justify-between border-b px-4 py-2.5 ${
        dangerous ? 'border-red-500/30 bg-red-500/5' : 'border-white/5'
      }`}>
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-space-accent/80">
          <Sun className="h-3.5 w-3.5" />
          Space Weather
          {dangerous && (
            <span className="ml-1 flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400 animate-pulse">
              <AlertTriangle className="h-3 w-3" />
              Storm
            </span>
          )}
        </span>
        {alertCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-space-warning/15 px-2 py-0.5 text-[10px] font-semibold text-space-warning">
            <AlertTriangle className="h-3 w-3" />
            {alertCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-space-accent/30 border-t-space-accent" />
          </div>
        ) : (
          <>
            {/* ── Solar Wind ───────────────────────────────────── */}
            {solarWind && (
              <MetricRow
                icon={<Wind className="h-4 w-4 text-space-accent" />}
                label="Solar Wind"
                value={`${Math.round(solarWind.speed)} km/s`}
                valueColor={getWindColor(solarWind.speed)}
                trend={<TrendIcon value={speedTrend} threshold={10} />}
                bar={
                  <ProgressBar
                    value={Math.min(solarWind.speed / 1000, 1)}
                    color={getWindColor(solarWind.speed)}
                  />
                }
                details={[
                  { label: 'Density', value: `${solarWind.density.toFixed(1)} p/cm³` },
                  { label: 'Temp', value: `${(solarWind.temperature / 1000).toFixed(0)}K` },
                ]}
              />
            )}

            {/* ── Kp Index ─────────────────────────────────────── */}
            {kpIndex && (
              <MetricRow
                icon={<Activity className="h-4 w-4 text-space-accent" />}
                label="Kp Index"
                value={`${kpIndex.value}`}
                valueColor={getKpColor(kpIndex.value)}
                badge={
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${getKpColor(kpIndex.value)} ${getKpBgColor(kpIndex.value)}`}>
                    {kpIndex.label}
                  </span>
                }
                trend={<TrendIcon value={kpTrend} threshold={1} />}
                bar={
                  <div className="relative h-1.5 w-full rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getKpBarColor(kpIndex.value)}`}
                      style={{ width: `${(kpIndex.value / 9) * 100}%` }}
                    />
                    {/* Danger threshold marker at Kp=5 */}
                    <div
                      className="absolute top-0 h-full w-px bg-red-500/50"
                      style={{ left: `${(5 / 9) * 100}%` }}
                      title="Storm threshold (Kp=5)"
                    />
                  </div>
                }
              />
            )}

            {/* ── X-ray Flux / Flare Class ─────────────────────── */}
            {xrayFlux && (
              <MetricRow
                icon={<Zap className="h-4 w-4 text-yellow-400" />}
                label="X-ray Flux"
                value={xrayFlux.classification}
                valueColor={getFlareColor(xrayFlux.classification)}
                badge={
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${getFlareColor(xrayFlux.classification)} ${getFlareBgColor(xrayFlux.classification)}`}>
                    {xrayFlux.classification}-class
                  </span>
                }
                bar={
                  <FlareClassBar current={xrayFlux.classification} />
                }
                details={[
                  { label: 'Short', value: xrayFlux.flux_short.toExponential(1) },
                  { label: 'Long', value: xrayFlux.flux_long.toExponential(1) },
                ]}
              />
            )}

            {/* ── Alert Summary ─────────────────────────────────── */}
            {alertCount > 0 && (
              <div className="mt-1 rounded-lg border border-space-warning/20 bg-space-warning/5 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-space-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {alertCount} Active Alert{alertCount !== 1 ? 's' : ''}
                </div>
                <div className="mt-1.5 max-h-20 overflow-y-auto space-y-1">
                  {alerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="text-[10px] text-white/40 leading-tight truncate">
                      {alert.description?.slice(0, 80)}
                    </div>
                  ))}
                  {alertCount > 3 && (
                    <div className="text-[10px] text-white/25">+{alertCount - 3} more</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// ── Sub-components ──────────────────────────────────────────────────────

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor: string;
  badge?: React.ReactNode;
  trend?: React.ReactNode;
  bar?: React.ReactNode;
  details?: Array<{ label: string; value: string }>;
}

function MetricRow({ icon, label, value, valueColor, badge, trend, bar, details }: MetricRowProps): React.ReactElement {
  return (
    <div className="rounded-lg bg-white/[0.02] p-2.5 space-y-1.5">
      {/* Top row: icon + label + value + trend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] text-white/50">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <span className={`text-sm font-bold tabular-nums ${valueColor}`}>
            {value}
          </span>
          {trend}
        </div>
      </div>

      {/* Progress bar */}
      {bar}

      {/* Detail stats row */}
      {details && details.length > 0 && (
        <div className="flex gap-4">
          {details.map((d) => (
            <div key={d.label} className="text-[10px]">
              <span className="text-white/30">{d.label}: </span>
              <span className="text-white/60 tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }): React.ReactElement {
  // Translate text color to bg color for the bar fill
  const bgColor = color
    .replace('text-space-success', 'bg-space-success')
    .replace('text-yellow-400', 'bg-yellow-400')
    .replace('text-space-warning', 'bg-space-warning')
    .replace('text-red-500', 'bg-red-500')
    .replace('text-orange-500', 'bg-orange-500');

  return (
    <div className="h-1.5 w-full rounded-full bg-white/5">
      <div
        className={`h-full rounded-full transition-all duration-500 ${bgColor}`}
        style={{ width: `${Math.max(value * 100, 2)}%` }}
      />
    </div>
  );
}

function FlareClassBar({ current }: { current: string }): React.ReactElement {
  const classes = ['A', 'B', 'C', 'M', 'X'];
  const currentIdx = classes.indexOf(current);

  return (
    <div className="flex gap-0.5 h-1.5">
      {classes.map((cls, idx) => (
        <div
          key={cls}
          className={`flex-1 rounded-sm transition-all duration-300 ${
            idx <= currentIdx
              ? idx >= 3 ? 'bg-red-500' : idx >= 2 ? 'bg-yellow-400' : 'bg-space-success'
              : 'bg-white/5'
          }`}
          title={`${cls}-class`}
        />
      ))}
    </div>
  );
}
