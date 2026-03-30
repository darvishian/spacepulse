/**
 * Satellite growth stacked area chart.
 * Shows satellite count over time broken down by orbit type (LEO/MEO/GEO/HEO).
 * Uses Recharts AreaChart with custom tooltip showing exact counts.
 */

'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { useSatelliteGrowthData } from './hooks/useChartData';
import { ChartTimeRange, FilterOptions } from './types';

/* ── Orbit type display config ─────────────────────────── */

const ORBIT_COLORS: Record<string, string> = {
  leo: '#00d4ff',
  meo: '#00ff88',
  geo: '#ff6b35',
  heo: '#a855f7',
};

const ORBIT_LABELS: Record<string, string> = {
  leo: 'LEO',
  meo: 'MEO',
  geo: 'GEO',
  heo: 'HEO',
};

/* ── Custom tooltip ────────────────────────────────────── */

function GrowthTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  // Sum visible orbit types for "Total" row
  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);

  return (
    <div className="rounded-lg border border-space-accent/30 bg-space-darker/95 px-4 py-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-sm font-semibold text-space-accent">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-6 text-xs"
        >
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            {ORBIT_LABELS[entry.dataKey as string] ?? entry.dataKey}
          </span>
          <span className="font-mono text-white/90">
            {(entry.value ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
      <div className="mt-1.5 flex items-center justify-between gap-6 border-t border-white/10 pt-1.5 text-xs font-semibold">
        <span className="text-white/70">Total</span>
        <span className="font-mono text-white">{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ── Main chart component ──────────────────────────────── */

interface SatelliteGrowthChartProps {
  timeRange?: ChartTimeRange;
  filters?: FilterOptions;
  height?: number;
}

export function SatelliteGrowthChart({
  timeRange = ChartTimeRange.ALL_TIME,
  filters,
  height = 300,
}: SatelliteGrowthChartProps): React.ReactElement {
  const { data: chartData, isLoading } = useSatelliteGrowthData({
    timeRange,
    filters,
  });

  /** Determine which orbit type areas to render based on active filters. */
  const visibleOrbits = React.useMemo<string[]>(() => {
    if (filters?.orbitTypes && filters.orbitTypes.length > 0) {
      return filters.orbitTypes;
    }
    return ['leo', 'meo', 'geo', 'heo'];
  }, [filters?.orbitTypes]);

  /** Format X-axis tick to show just the year. */
  const formatXTick = React.useCallback((value: string): string => {
    if (!value) return '';
    return value.slice(0, 4); // "2023-01-01" → "2023"
  }, []);

  /** Format Y-axis values for readability (1k, 2.5k, etc.). */
  const formatYTick = React.useCallback((value: number): string => {
    if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    return String(value);
  }, []);

  /* ── Loading state ───────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="flex items-center gap-2 text-sm text-white/40">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-space-accent/30 border-t-space-accent" />
          Loading growth data…
        </div>
      </div>
    );
  }

  /* ── Empty state ─────────────────────────────────────── */
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-white/30">No growth data available</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
      >
        {/* Gradient defs for each orbit type */}
        <defs>
          {Object.entries(ORBIT_COLORS).map(([key, color]) => (
            <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.7} />
              <stop offset="95%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(0, 212, 255, 0.08)"
          vertical={false}
        />
        <XAxis
          dataKey="timestamp"
          tickFormatter={formatXTick}
          stroke="rgba(255, 255, 255, 0.25)"
          tick={{ fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          tickFormatter={formatYTick}
          stroke="rgba(255, 255, 255, 0.25)"
          tick={{ fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />

        <Tooltip content={<GrowthTooltip />} />

        <Legend
          iconType="square"
          iconSize={10}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
          formatter={(value: string) => (
            <span className="text-white/60">
              {ORBIT_LABELS[value] ?? value}
            </span>
          )}
        />

        {/* Render stacked areas — order matters: bottom → top */}
        {['heo', 'geo', 'meo', 'leo']
          .filter((orbit) => visibleOrbits.includes(orbit))
          .map((orbit) => (
            <Area
              key={orbit}
              type="monotone"
              dataKey={orbit}
              stackId="orbit"
              stroke={ORBIT_COLORS[orbit]}
              strokeWidth={1.5}
              fillOpacity={1}
              fill={`url(#gradient-${orbit})`}
              name={orbit}
              animationDuration={800}
            />
          ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
