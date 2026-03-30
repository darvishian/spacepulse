/**
 * Satellite Growth Panel — composes the chart, filters, and export button
 * into a grid-aware panel that fills its parent container.
 * Designed to sit inside a react-resizable-panels Panel.
 */

'use client';

import React from 'react';
import { BarChart3, ChevronUp, ChevronDown } from 'lucide-react';
import { SatelliteGrowthChart } from './SatelliteGrowthChart';
import { ChartFilters } from './ChartFilters';
import { ExportButton } from './ExportButton';
import { useSatelliteGrowthData } from './hooks/useChartData';
import { ChartTimeRange, FilterOptions } from './types';

export function SatelliteGrowthPanel(): React.ReactElement {
  const [filtersExpanded, setFiltersExpanded] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState<ChartTimeRange>(ChartTimeRange.ALL_TIME);
  const [filters, setFilters] = React.useState<FilterOptions>({});
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = React.useState(200);

  // Fetch data for export button (same query key → shared cache with chart)
  const { data: chartData } = useSatelliteGrowthData({ timeRange, filters });

  // Dynamically size the chart to fill available space
  React.useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 80) {
          setChartHeight(height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-space-darker/60">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-space-accent/80">
          <BarChart3 className="h-3.5 w-3.5" />
          Satellite Growth
        </span>
        <ExportButton data={chartData} />
      </div>

      {/* Chart area — grows to fill remaining space */}
      <div ref={chartContainerRef} className="min-h-0 flex-1 px-2 py-2">
        <SatelliteGrowthChart
          timeRange={timeRange}
          filters={filters}
          height={chartHeight}
        />
      </div>

      {/* Collapsible filters section */}
      <div className="shrink-0 border-t border-white/5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFiltersExpanded((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFiltersExpanded((prev) => !prev);
            }
          }}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-left transition-colors hover:bg-white/5"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Filters
          </span>
          {filtersExpanded ? (
            <ChevronDown className="h-3 w-3 text-white/30" />
          ) : (
            <ChevronUp className="h-3 w-3 text-white/30" />
          )}
        </div>

        {filtersExpanded && (
          <div className="max-h-60 overflow-y-auto px-4 pb-3">
            <ChartFilters
              timeRange={timeRange}
              filters={filters}
              onTimeRangeChange={setTimeRange}
              onFiltersChange={setFilters}
            />
          </div>
        )}
      </div>
    </div>
  );
}
